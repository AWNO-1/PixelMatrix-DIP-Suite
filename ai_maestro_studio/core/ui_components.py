"""
AI Maestro Studio - Core Glassmorphism UI Components
=======================================================
High-performance HUD rendering with localized ROI blending.
Prevents screen dimming and multiple full-frame copy/blend overhead.
"""

import cv2
import numpy as np

from text_renderer import draw_text_bgr


def draw_glass_panel(canvas, x1, y1, x2, y2, bg_color=(14, 20, 34), alpha=0.88):
    """
    Blends a translucent glass panel strictly within [x1:x2, y1:y2].
    Guarantees zero darkening or degradation outside the bounding box.
    """
    x1, y1 = max(0, int(x1)), max(0, int(y1))
    x2, y2 = min(canvas.shape[1], int(x2)), min(canvas.shape[0], int(y2))
    if x2 <= x1 or y2 <= y1:
        return
    roi = canvas[y1:y2, x1:x2]
    tint = np.full_like(roi, bg_color)
    canvas[y1:y2, x1:x2] = cv2.addWeighted(roi, 1.0 - alpha, tint, alpha, 0)


def draw_team_button(canvas, rect):
    """Renders the executive glowing Team Showcase button [T] &#1578;&#1601&#1575&#1602 &#1579;&#1578;&#1601;."""
    bx1, by1, bx2, by2 = rect
    draw_glass_panel(canvas, bx1, by1, bx2, by2, bg_color=(25, 35, 60), alpha=0.85)
    cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (0, 240, 255), 1)
    cv2.rectangle(canvas, (bx1 - 2, by1 - 2), (bx2 + 2, by2 + 2), (255, 215, 0), 1)
    canvas = draw_text_bgr(canvas, "م؀ريق العمل  [T]  Team",
                           (bx1 + (bx2 - bx1) // 2, by1 + 7),
                           font_size=14, color_bgr=(255, 240, 0), align="center")
    return canvas


def draw_cinema_header(canvas, title_en, subtitle_en, team_btn_rect, accent_color=(0, 215, 255)):
    """Renders the top executive header bar with title, subtitle, and team button."""
    h, w = canvas.shape[:2]
    draw_glass_panel(canvas, 0, 0, w, 68, (14, 20, 32), 0.90)
    cv2.line(canvas, (0, 68), (w, 68), accent_color, 2)
    cv2.line(canvas, (0, 71), (w, 71), (255, 240, 0), 1)

    cv2.putText(canvas, title_en, (28, 30), cv2.FONT_HERSHEY_DUPLEX, 0.72, (255, 255, 255), 2)
    cv2.putText(canvas, subtitle_en, (28, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.44, accent_color, 1)

    canvas = draw_team_button(canvas, team_btn_rect)
    return canvas


def draw_bottom_bar(canvas, left_text, right_text, accent_color=(0, 215, 255)):
    """Renders the sleek bottom status and hotkey bar."""
    h, w = canvas.shape[:2]
    draw_glass_panel(canvas, 0, h - 50, w, h, (14, 20, 32), 0.90)
    cv2.line(canvas, (0, h - 50), (w, h - 50), accent_color, 1)

    cv2.putText(canvas, left_text, (28, h - 18), cv2.FONT_HERSHEY_DUPLEX, 0.52, (255, 255, 255), 1)

    h_sz = cv2.getTextSize(right_text, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)[0]
    cv2.putText(canvas, right_text, (w - h_sz[0] - 25, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (180, 200, 225), 1)
    return canvas
