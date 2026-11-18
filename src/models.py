"""Core data models for ClickBot workflows and actions."""
from typing import List, Optional, Tuple, Literal
from pydantic import BaseModel, Field

class Region(BaseModel):
    left: int
    top: int
    width: int
    height: int

class HookTarget(BaseModel):
    window_title: Optional[str] = None
    browser_type: Optional[str] = None  # e.g. "Google Chrome", "Microsoft Edge"
    process_name: Optional[str] = None  # e.g. "chrome.exe"
    pid: Optional[int] = None
    auto_find_by_title: bool = True     # Find & activate this window at runtime

class Step(BaseModel):
    step_id: str
    action: Literal["mouse_click", "wait", "screenshot", "hook_window"]
    # For mouse_click
    region: Optional[Region] = None
    randomize: Optional[bool] = True
    button: Optional[Literal["left", "right", "middle"]] = "left"
    clicks: Optional[int] = 1
    # For wait
    duration: Optional[float] = 1.0
    duration_range: Optional[Tuple[float, float]] = None
    # For screenshot / identifiers
    label: Optional[str] = "evidence"
    # For hook_window / countdowns
    delay_seconds: Optional[float] = 5.0
    hook_target: Optional[HookTarget] = None

class Job(BaseModel):
    job_id: str
    name: str
    iterations: int = Field(default=1, ge=1)
    delay_between_iterations: Optional[float] = 1.0
    steps: List[Step] = []
