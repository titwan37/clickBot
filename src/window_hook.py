"""Window detection, metadata inspection (PID, Browser type, Title), and target hooking."""
import time
import ctypes
from ctypes import wintypes
from datetime import datetime
from typing import Optional, Callable, Dict, Any, List
import pyautogui as pag
import pygetwindow as gw
import psutil

from src.pixel_inspect import get_surrounding_pixels
from src.models import HookTarget

user32 = ctypes.windll.user32

class WindowHook:
    def __init__(self):
        self.target_window = None

    @staticmethod
    def get_window_meta(window) -> Dict[str, Any]:
        """Extract PID, process name, and browser brand from window handle."""
        hwnd = getattr(window, '_hWnd', None)
        pid_val = None
        process_name = None
        browser_type = "Desktop Window"

        if hwnd:
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            pid_val = pid.value
            try:
                p = psutil.Process(pid_val)
                process_name = p.name()
                low = process_name.lower()
                if "chrome" in low:
                    browser_type = "Google Chrome"
                elif "msedge" in low or "edge" in low:
                    browser_type = "Microsoft Edge"
                elif "firefox" in low:
                    browser_type = "Mozilla Firefox"
                elif "brave" in low:
                    browser_type = "Brave Browser"
                elif "opera" in low:
                    browser_type = "Opera"
                elif "vivaldi" in low:
                    browser_type = "Vivaldi"
                else:
                    browser_type = process_name
            except Exception:
                pass

        return {
            "pid": pid_val,
            "process_name": process_name,
            "browser_type": browser_type,
            "hwnd": hwnd
        }

    def hook_under_cursor(
        self,
        delay: float = 5.0,
        stop_check: Optional[Callable[[], bool]] = None
    ) -> Dict[str, Any]:
        """
        Countdown and hook whatever window is currently under the mouse cursor.
        Captures start/stop times, hooked page title, PID, browser type, bounds, and pixels.
        """
        start_time_iso = datetime.now().isoformat()
        elapsed = 0.0
        total_delay = float(delay)

        while elapsed < total_delay:
            if stop_check and stop_check():
                return None
            slice_time = min(0.05, total_delay - elapsed)
            time.sleep(slice_time)
            elapsed += slice_time

        stop_time_iso = datetime.now().isoformat()

        x, y = pag.position()
        windows = gw.getWindowsAt(x, y)
        if not windows:
            active = gw.getActiveWindow()
            if not active:
                raise RuntimeError(f"No window found under cursor at ({x}, {y}) or active.")
            self.target_window = active
        else:
            self.target_window = windows[0]

        meta = self.get_window_meta(self.target_window)
        pixel_info = get_surrounding_pixels(x, y, radius=2)

        return {
            "title": self.target_window.title,
            "browser_type": meta["browser_type"],
            "process_name": meta["process_name"],
            "pid": meta["pid"],
            "hwnd": meta["hwnd"],
            "bounds": {
                "left": self.target_window.left,
                "top": self.target_window.top,
                "width": self.target_window.width,
                "height": self.target_window.height,
            },
            "hooked_mouse_pos": {"x": x, "y": y},
            "pixels_around_mouse": pixel_info,
            "start_time": start_time_iso,
            "stop_time": stop_time_iso,
            "countdown_seconds": round(total_delay, 1)
        }

    def find_and_activate(self, hook_target: HookTarget) -> Optional[Dict[str, Any]]:
        """
        Locates an existing window by PID, window title substring, or browser process,
        activates / brings it to front at execution time.
        """
        matched_window = None

        # 1. Search by PID if present
        if hook_target.pid:
            for w in gw.getAllWindows():
                if not w.title:
                    continue
                meta = self.get_window_meta(w)
                if meta["pid"] == hook_target.pid:
                    matched_window = w
                    break

        # 2. Search by window title substring
        if not matched_window and hook_target.window_title:
            target_str = hook_target.window_title.lower()
            for w in gw.getAllWindows():
                if w.title and target_str in w.title.lower():
                    matched_window = w
                    break

        if matched_window:
            try:
                if matched_window.isMinimized:
                    matched_window.restore()
                matched_window.activate()
                time.sleep(0.3)
            except Exception:
                pass

            meta = self.get_window_meta(matched_window)
            return {
                "title": matched_window.title,
                "browser_type": meta["browser_type"],
                "process_name": meta["process_name"],
                "pid": meta["pid"],
                "bounds": {
                    "left": matched_window.left,
                    "top": matched_window.top,
                    "width": matched_window.width,
                    "height": matched_window.height,
                }
            }
        return None
