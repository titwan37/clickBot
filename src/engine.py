"""Workflow Engine to execute Jobs consisting of sequential Steps with structured tracing."""
import time
import random
import threading
import logging
from typing import Callable, Optional, Dict, Any
from src.models import Job, Step
from src.clicker import ClickEngine
from src.evidence import EvidenceRecorder
from src.window_hook import WindowHook

logger = logging.getLogger("clickbot")

class WorkflowEngine:
    def __init__(self, evidence_dir: str = "evidence/"):
        self.clicker = ClickEngine()
        self.evidence = EvidenceRecorder(evidence_dir)
        self.hooker = WindowHook()
        self.is_running = False
        self._stop_requested = False

    def stop(self):
        """Signal the engine to stop execution."""
        self._stop_requested = True

    def _sleep_interruptible(self, seconds: float) -> bool:
        """Sleep in small 50ms increments so stop requests respond instantly."""
        elapsed = 0.0
        while elapsed < seconds:
            if self._stop_requested:
                return False
            slice_time = min(0.05, seconds - elapsed)
            time.sleep(slice_time)
            elapsed += slice_time
        return not self._stop_requested

    def execute_job(
        self,
        job: Job,
        on_event: Optional[Callable[[str, dict], None]] = None
    ) -> bool:
        """
        Executes a job synchronously or inside a thread.
        Emits step_started, step_success, step_failed, and job completion traces.
        """
        self.is_running = True
        self._stop_requested = False

        def emit(event_type: str, data: dict):
            if on_event:
                on_event(event_type, data)

        emit("job_started", {
            "job_id": job.job_id,
            "name": job.name,
            "total_steps": len(job.steps),
            "iterations": job.iterations
        })

        last_hooked_bounds = None

        try:
            for iteration in range(1, job.iterations + 1):
                if self._stop_requested:
                    emit("job_aborted", {"reason": "User stopped execution", "iteration": iteration})
                    break

                emit("iteration_started", {"iteration": iteration, "total": job.iterations})

                for idx, step in enumerate(job.steps):
                    if self._stop_requested:
                        break

                    step_label = step.label or step.action
                    start_time = time.time()
                    start_time_iso = time.strftime("%H:%M:%S")

                    step_result: Dict[str, Any] = {}
                    step_status = "success"
                    step_error = None

                    try:
                        # 1. Action: Hook Window
                        if step.action == "hook_window":
                            # If step has a pre-configured hook_target, try finding it first
                            win_info = None
                            if step.hook_target and step.hook_target.auto_find_by_title:
                                activated = self.hooker.find_and_activate(step.hook_target)
                                if activated:
                                    win_info = activated
                                    emit("hook_window_found", {"window": activated})

                            # Otherwise perform interactive countdown hook under cursor
                            if not win_info:
                                countdown_val = step.delay_seconds or 5.0
                                emit("hook_countdown_started", {
                                    "countdown_seconds": countdown_val,
                                    "start_time": time.strftime("%H:%M:%S")
                                })
                                
                                win_info = self.hooker.hook_under_cursor(
                                    delay=countdown_val,
                                    stop_check=lambda: self._stop_requested
                                )
                                if self._stop_requested:
                                    break
                                if not win_info:
                                    raise RuntimeError("Window hooking aborted or no active window detected.")

                                emit("hook_countdown_finished", {
                                    "stop_time": time.strftime("%H:%M:%S"),
                                    "hooked_title": win_info["title"],
                                    "browser": win_info.get("browser_type"),
                                    "pid": win_info.get("pid")
                                })
                            if win_info and "bounds" in win_info:
                                last_hooked_bounds = win_info["bounds"]
                            step_result = {"window": win_info}

                        # 2. Action: Wait
                        elif step.action == "wait":
                            wait_start_iso = time.strftime("%Y-%m-%dT%H:%M:%S")
                            wait_time = step.duration or 1.0
                            if step.duration_range and len(step.duration_range) == 2:
                                wait_time = random.uniform(step.duration_range[0], step.duration_range[1])
                            
                            completed = self._sleep_interruptible(wait_time)
                            wait_stop_iso = time.strftime("%Y-%m-%dT%H:%M:%S")
                            if not completed or self._stop_requested:
                                break
                            step_result = {
                                "waited_seconds": round(wait_time, 2),
                                "start_time": wait_start_iso,
                                "stop_time": wait_stop_iso
                            }

                        # 3. Action: Screenshot
                        elif step.action == "screenshot":
                            shot_info = self.evidence.capture_screenshot(label=f"iter{iteration}_{step_label}")
                            step_result = {
                                "file_path": shot_info["file_path"],
                                "url": shot_info["url"],
                                "thumb_url": shot_info["thumb_url"],
                                "dimensions": f"{shot_info['width']}x{shot_info['height']}"
                            }

                        # 4. Action: Mouse Click
                        elif step.action == "mouse_click":
                            if not step.region:
                                raise ValueError(f"Step {step.step_id} missing click region definition.")
                            
                            # If we previously hooked a window, treat step.region as relative to its origin
                            offset = None
                            if last_hooked_bounds:
                                offset = (last_hooked_bounds["left"], last_hooked_bounds["top"])

                            click_data = self.clicker.click_region(
                                region=step.region,
                                window_offset=offset,
                                randomize=step.randomize if step.randomize is not None else True,
                                button=step.button or "left",
                                clicks=step.clicks or 1
                            )
                            step_result = {
                                "clicked_location": {"x": click_data["x"], "y": click_data["y"]},
                                "relative_to_window": {"x": click_data["relative_x"], "y": click_data["relative_y"]},
                                "button": click_data["button"],
                                "clicks": click_data["clicks"],
                                "pixels_around_mouse": click_data["pixels_around_mouse"]
                            }

                    except Exception as err:
                        step_status = "failure"
                        step_error = str(err)
                        logger.error(f"[Step {step.step_id} FAILED] {err}")

                    duration_ms = round((time.time() - start_time) * 1000, 1)
                    stop_time_iso = time.strftime("%H:%M:%S")

                    if step_status == "success":
                        emit("step_success", {
                            "step_id": step.step_id,
                            "label": step_label,
                            "action": step.action,
                            "start_time": start_time_iso,
                            "stop_time": stop_time_iso,
                            "duration_ms": duration_ms,
                            "details": step_result
                        })
                    else:
                        emit("step_failed", {
                            "step_id": step.step_id,
                            "label": step_label,
                            "action": step.action,
                            "start_time": start_time_iso,
                            "stop_time": stop_time_iso,
                            "duration_ms": duration_ms,
                            "error": step_error
                        })
                        # Stop execution on failure
                        emit("job_error", {
                            "job_id": job.job_id,
                            "failed_step_id": step.step_id,
                            "error": step_error
                        })
                        return False

                # Check if aborted inside step loop
                if self._stop_requested:
                    emit("job_aborted", {"reason": "User stopped execution", "iteration": iteration})
                    break

                # Delay between iterations
                if iteration < job.iterations and not self._stop_requested:
                    if not self._sleep_interruptible(job.delay_between_iterations or 1.0):
                        emit("job_aborted", {"reason": "User stopped execution", "iteration": iteration})
                        break

            if not self._stop_requested:
                emit("job_completed", {"job_id": job.job_id, "iterations": job.iterations})
            return not self._stop_requested

        except Exception as e:
            emit("job_error", {"error": str(e)})
            raise e
        finally:
            self.is_running = False
