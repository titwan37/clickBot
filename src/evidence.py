"""Evidence recorder: screenshots and session artifacts."""
import time
from pathlib import Path
from datetime import datetime
import pyautogui as pag
from PIL import Image

class EvidenceRecorder:
    def __init__(self, base_dir: str = "evidence"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def capture_screenshot(self, label: str = "shot", region: tuple = None) -> dict:
        """
        Take a screenshot and also generate a small thumbnail.
        Returns a dict with filepath, relative url, thumbnail url, width, height.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
        filename = f"{timestamp}_{label}.png"
        thumb_filename = f"{timestamp}_{label}_thumb.png"
        file_path = self.base_dir / filename
        thumb_path = self.base_dir / thumb_filename

        if region:
            screenshot = pag.screenshot(region=region)
        else:
            screenshot = pag.screenshot()

        screenshot.save(file_path)

        # Generate thumbnail for UI preview
        thumb = screenshot.copy()
        thumb.thumbnail((240, 150))
        thumb.save(thumb_path)

        return {
            "file_path": str(file_path.as_posix()),
            "url": "/" + str(file_path.as_posix()),
            "thumb_url": "/" + str(thumb_path.as_posix()),
            "width": screenshot.width,
            "height": screenshot.height
        }
