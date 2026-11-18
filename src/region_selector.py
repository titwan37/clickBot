"""Region selection utilities: live keystrokes & visual screenshot ROI."""
import time
from typing import Dict, Tuple, Optional
import pyautogui as pag
import pygetwindow as gw
from src.models import Region

class RegionSelector:
    @staticmethod
    def from_hotkeys(
        top_left_key: str = "ctrl+shift+1",
        bottom_right_key: str = "ctrl+shift+2"
    ) -> Region:
        """
        Calibrate region by moving mouse over browser and pressing hotkeys:
        1. Hover Top-Left -> press top_left_key
        2. Hover Bottom-Right -> press bottom_right_key
        """
        import keyboard
        print(f"[RegionSelector] Hover mouse over TOP-LEFT edge and press {top_left_key.upper()}...")
        keyboard.wait(top_left_key)
        p1 = pag.position()
        print(f"[RegionSelector] Top-Left recorded: {p1}")

        time.sleep(0.3)
        print(f"[RegionSelector] Hover mouse over BOTTOM-RIGHT edge and press {bottom_right_key.upper()}...")
        keyboard.wait(bottom_right_key)
        p2 = pag.position()
        print(f"[RegionSelector] Bottom-Right recorded: {p2}")

        left = min(p1.x, p2.x)
        top = min(p1.y, p2.y)
        width = abs(p2.x - p1.x)
        height = abs(p2.y - p1.y)

        return Region(left=left, top=top, width=width, height=height)

    @staticmethod
    def from_screenshot_roi() -> Region:
        """
        Freeze screen via screenshot and let user draw ROI bounding box using OpenCV.
        Press ENTER or SPACE to confirm, C to cancel.
        """
        import cv2
        import numpy as np

        print("[RegionSelector] Capturing screen for visual ROI selection...")
        shot = pag.screenshot()
        img = cv2.cvtColor(np.array(shot), cv2.COLOR_RGB2BGR)

        window_title = "ClickBot: Drag box to select region -> Press ENTER or SPACE to confirm"
        cv2.namedWindow(window_title, cv2.WINDOW_NORMAL)
        cv2.setWindowProperty(window_title, cv2.WND_PROP_TOPMOST, 1)

        roi = cv2.selectROI(window_title, img, showCrosshair=True, fromCenter=False)
        cv2.destroyAllWindows()

        left, top, width, height = roi
        if width <= 0 or height <= 0:
            raise ValueError("Invalid region selected (width or height is 0)")

        return Region(left=int(left), top=int(top), width=int(width), height=int(height))
