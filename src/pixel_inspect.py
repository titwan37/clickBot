"""Helper to safely inspect screen pixels around coordinates."""
from typing import Optional, Dict, Any
import pyautogui as pag
from PIL import Image

def get_surrounding_pixels(x: int, y: int, radius: int = 1) -> Dict[str, Any]:
    """
    Safely captures pixels around (x, y) with boundary tolerance.
    Returns center hex, rgb, and neighborhood pixel data.
    """
    try:
        # Grab a small bounding box: (left, top, width, height)
        left = max(0, x - radius)
        top = max(0, y - radius)
        width = (radius * 2) + 1
        height = (radius * 2) + 1

        shot = pag.screenshot(region=(left, top, width, height))
        center_x = min(radius, shot.width - 1)
        center_y = min(radius, shot.height - 1)
        pixel_val = shot.getpixel((center_x, center_y))

        # Handle RGB or RGBA tuples
        r, g, b = pixel_val[:3]
        hex_color = f"#{r:02x}{g:02x}{b:02x}".upper()

        return {
            "center": {"x": x, "y": y},
            "hex": hex_color,
            "rgb": [r, g, b],
            "neighborhood_size": f"{width}x{height}",
        }
    except Exception as e:
        return {
            "center": {"x": x, "y": y},
            "hex": None,
            "rgb": None,
            "error": str(e)
        }
