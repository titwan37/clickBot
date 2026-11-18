"""Mouse click engine with humanized randomization, relative window offset support, and pixel inspection."""
import time
import random
from typing import Tuple, Optional, Dict, Any
import pyautogui as pag
from src.models import Region
from src.pixel_inspect import get_surrounding_pixels

# Safety settings: moving mouse to any corner of screen aborts PyAutoGUI
pag.FAILSAFE = True

class ClickEngine:
    def __init__(self):
        pass

    def click_region(
        self,
        region: Region,
        window_offset: Optional[Tuple[int, int]] = None,
        randomize: bool = True,
        button: str = "left",
        clicks: int = 1,
    ) -> Dict[str, Any]:
        """
        Click inside a given region with human-like jitter.
        If window_offset=(win_left, win_top) is provided, region coordinates
        are treated as relative to the hooked window.
        """
        offset_x, offset_y = window_offset if window_offset else (0, 0)
        abs_left = region.left + offset_x
        abs_top = region.top + offset_y

        if randomize:
            pad_x = max(1, int(region.width * 0.1))
            pad_y = max(1, int(region.height * 0.1))
            min_x = abs_left + pad_x
            max_x = max(min_x, abs_left + region.width - pad_x)
            min_y = abs_top + pad_y
            max_y = max(min_y, abs_top + region.height - pad_y)

            target_x = random.randint(min_x, max_x)
            target_y = random.randint(min_y, max_y)
        else:
            target_x = abs_left + region.width // 2
            target_y = abs_top + region.height // 2

        # Human-like mouse movement with random duration
        duration = random.uniform(0.15, 0.45)
        pag.moveTo(target_x, target_y, duration=duration, tween=pag.easeOutQuad)

        # Micro hesitation
        time.sleep(random.uniform(0.04, 0.12))

        # Inspect pixels around the target coordinate right before the physical click
        pixel_info = get_surrounding_pixels(target_x, target_y, radius=2)

        # Perform click
        pag.click(x=target_x, y=target_y, button=button, clicks=clicks)

        return {
            "x": target_x,
            "y": target_y,
            "relative_x": target_x - offset_x if window_offset else target_x,
            "relative_y": target_y - offset_y if window_offset else target_y,
            "button": button,
            "clicks": clicks,
            "pixels_around_mouse": pixel_info
        }
