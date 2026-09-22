"""
Team Showcase Modal - Luxury Executive Presentation for AI Maestro Studio
Displays high-end glassmorphism overlay showcasing the engineering team and academic supervision.
"""

import cv2
import numpy as np
import time
try:
    from .text_renderer import draw_text_batch
except Exception:
    from text_renderer import draw_text_batch


TEAM_MEMBERS = [
    {
        "name_ar": "أواب النزيلي",
        "name_en": "Awwab Al-Nuzaili",
        "role_ar": "مهندس رؤية حاسوبية ومعالجة صور",
        "role_en": "Lead Architect & Computer Vision",
        "badge": "LEAD ARCHITECT",
        "color": (255, 215, 0),      # Gold BGR
        "glow": (180, 140, 0),
        "desc_ar": "هندسة نماذج الذكاء الاصطناعي وهيكلة الرؤية المتعددة المسارات"
    },
    {
        "name_ar": "محمد العواضي",
        "name_en": "Mohammed Al-Awadhi",
        "role_ar": "مهندس نظم ومعالجة إشارات رقمية",
        "role_en": "Core DSP & Audio Systems Engineer",
        "badge": "CORE DSP",
        "color": (0, 240, 255),      # Electric Cyan BGR
        "glow": (0, 160, 180),
        "desc_ar": "محركات التوليف النغمي الحي، التوليف الإجرائي وتزامن الترددات"
    },
    {
        "name_ar": "مشعل حاجب",
        "name_en": "Mishaal Hajeb",
        "role_ar": "مهندس واجهات تفاعلية وخوارزميات بيومترية",
        "role_en": "HUD & Biometrics Interaction Engineer",
        "badge": "HUD & BIOMETRICS",
        "color": (255, 100, 220),    # Neon Magenta BGR
        "glow": (180, 50, 160),
        "desc_ar": "أنظمة المؤثرات البصرية وتتبع المفاصل البيومترية فائقة السرعة"
    }
]

SUPERVISOR = {
    "title_ar": "إهداء العمل وتوثيقه تحت إشراف الأستاذ القدير:",
    "name_ar": "م. مـــالـــك المصنـــف",
    "name_en": "Eng. Malek A. Almosanif",
    "subtitle_ar": "مشروع استوديو قيادة الأوركسترا والآلات الافتراضية بالذكاء الاصطناعي وتقدير الوضعية",
    "subtitle_en": "AI Maestro & Virtual Orchestra Studio (Pose Estimation & CV)",
    "color": (0, 215, 255) # Gold BGR
}


class TeamShowcaseModal:
    def __init__(self):
        self.is_open = False
        self.open_time = 0.0
        self.close_btn_rect = (0, 0, 0, 0)

    def toggle(self):
        self.is_open = not self.is_open
        if self.is_open:
            self.open_time = time.time()

    def show(self):
        self.is_open = True
        self.open_time = time.time()

    def hide(self):
        self.is_open = False

    def handle_click(self, x, y):
        if not self.is_open:
            return False
        bx1, by1, bx2, by2 = self.close_btn_rect
        # Click close button or click outside modal box closes it
        if bx1 <= x <= bx2 and by1 <= y <= by2:
            self.hide()
            return True
        return True # Handled click

    def render(self, frame):
        if not self.is_open:
            return frame

        h, w = frame.shape[:2]

        # 1. Dark Glassmorphic Backdrop
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (5, 8, 15), -1)
        cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)

        # 2. Main Executive Modal Window Dimensions
        mw = min(1140, w - 60)
        mh = min(640, h - 50)
        mx = (w - mw) // 2
        my = (h - mh) // 2

        # Card container with rounded/beveled appearance
        card_bg = frame.copy()
        cv2.rectangle(card_bg, (mx, my), (mx + mw, my + mh), (12, 18, 28), -1)
        cv2.addWeighted(card_bg, 0.94, frame, 0.06, 0, frame)

        # Outer Neon Glow Border
        cv2.rectangle(frame, (mx, my), (mx + mw, my + mh), (0, 215, 255), 2)
        cv2.rectangle(frame, (mx - 3, my - 3), (mx + mw + 3, my + mh + 3), (255, 240, 0), 1)

        # Tech Corner Accents
        c_len = 28
        # Top-left
        cv2.line(frame, (mx, my), (mx + c_len, my), (255, 255, 255), 3)
        cv2.line(frame, (mx, my), (mx, my + c_len), (255, 255, 255), 3)
        # Top-right
        cv2.line(frame, (mx + mw, my), (mx + mw - c_len, my), (255, 255, 255), 3)
        cv2.line(frame, (mx + mw, my), (mx + mw, my + c_len), (255, 255, 255), 3)
        # Bottom-left
        cv2.line(frame, (mx, my + mh), (mx + c_len, my + mh), (255, 255, 255), 3)
        cv2.line(frame, (mx, my + mh), (mx, my + mh - c_len), (255, 255, 255), 3)
        # Bottom-right
        cv2.line(frame, (mx + mw, my + mh), (mx + mw - c_len, my + mh), (255, 255, 255), 3)
        cv2.line(frame, (mx + mw, my + mh), (mx + mw, my + mh - c_len), (255, 255, 255), 3)

        # Close Button [X] at top-right
        close_x = mx + mw - 45
        close_y = my + 15
        self.close_btn_rect = (close_x - 10, close_y - 5, close_x + 35, close_y + 35)
        cv2.rectangle(frame, (close_x - 5, close_y), (close_x + 30, close_y + 30), (30, 35, 60), -1)
        cv2.rectangle(frame, (close_x - 5, close_y), (close_x + 30, close_y + 30), (0, 100, 255), 1)
        cv2.line(frame, (close_x + 2, close_y + 7), (close_x + 23, close_y + 23), (255, 255, 255), 2)
        cv2.line(frame, (close_x + 23, close_y + 7), (close_x + 2, close_y + 23), (255, 255, 255), 2)

        # Batch Text Collection for High-Res PIL Rendering
        text_batch = []

        # Modal Header
        header_cy = my + 45
        text_batch.append({
            "text": "فريق العمل والتطوير الهندسي",
            "pos": (mx + mw // 2, header_cy - 12),
            "size": 26,
            "color": (255, 255, 255),
            "align": "center",
            "font": "tahoma.ttf"
        })
        text_batch.append({
            "text": "AI MAESTRO STUDIO — CORE ENGINEERING & ARCHITECTURE",
            "pos": (mx + mw // 2, header_cy + 18),
            "size": 13,
            "color": (255, 230, 0),
            "align": "center",
            "font": "segoeui.ttf"
        })

        # Divider line
        cv2.line(frame, (mx + 40, header_cy + 36), (mx + mw - 40, header_cy + 36), (60, 75, 105), 1)

        # 3. Render Team Cards (3 Columns)
        card_w = (mw - 80) // 3
        card_h = 240
        card_top = header_cy + 52

        for i, member in enumerate(TEAM_MEMBERS):
            cx = mx + 30 + i * (card_w + 10)
            cy = card_top

            # Card background
            card_surface = frame.copy()
            cv2.rectangle(card_surface, (cx, cy), (cx + card_w, cy + card_h), (18, 26, 40), -1)
            cv2.addWeighted(card_surface, 0.90, frame, 0.10, 0, frame)

            # Card Border with member's accent color
            cv2.rectangle(frame, (cx, cy), (cx + card_w, cy + card_h), member["color"], 1)

            # Top Accent Badge
            badge_h = 24
            cv2.rectangle(frame, (cx + 1, cy + 1), (cx + card_w - 1, cy + badge_h), member["glow"], -1)

            text_batch.append({
                "text": member["badge"],
                "pos": (cx + card_w // 2, cy + 5),
                "size": 11,
                "color": (255, 255, 255),
                "align": "center",
                "font": "segoeui.ttf"
            })

            # Member Arabic Name
            text_batch.append({
                "text": member["name_ar"],
                "pos": (cx + card_w // 2, cy + 42),
                "size": 22,
                "color": (255, 255, 255),
                "align": "center",
                "font": "tahoma.ttf"
            })

            # Member English Name
            text_batch.append({
                "text": member["name_en"],
                "pos": (cx + card_w // 2, cy + 72),
                "size": 14,
                "color": member["color"],
                "align": "center",
                "font": "segoeui.ttf"
            })

            # Mini divider
            cv2.line(frame, (cx + 25, cy + 96), (cx + card_w - 25, cy + 96), (50, 65, 90), 1)

            # Role Arabic
            text_batch.append({
                "text": member["role_ar"],
                "pos": (cx + card_w // 2, cy + 110),
                "size": 14,
                "color": (230, 240, 255),
                "align": "center",
                "font": "tahoma.ttf"
            })

            # Role English
            text_batch.append({
                "text": member["role_en"],
                "pos": (cx + card_w // 2, cy + 134),
                "size": 11,
                "color": (160, 180, 210),
                "align": "center",
                "font": "segoeui.ttf"
            })

            # Description Arabic
            text_batch.append({
                "text": member["desc_ar"],
                "pos": (cx + card_w // 2, cy + 168),
                "size": 12,
                "color": (190, 210, 230),
                "align": "center",
                "font": "tahoma.ttf"
            })

        # 4. Academic Supervision Luxury Section (Bottom Banner)
        sup_top = card_top + card_h + 16
        sup_h = mh - (sup_top - my) - 45
        cv2.rectangle(frame, (mx + 30, sup_top), (mx + mw - 30, sup_top + sup_h), (22, 30, 48), -1)
        cv2.rectangle(frame, (mx + 30, sup_top), (mx + mw - 30, sup_top + sup_h), (0, 215, 255), 1)

        # Golden Crown / Laurel accent box
        tag_x = mx + 45
        cv2.circle(frame, (tag_x + 15, sup_top + sup_h // 2), 12, (0, 215, 255), -1)
        cv2.circle(frame, (tag_x + 15, sup_top + sup_h // 2), 6, (15, 20, 35), -1)

        text_batch.append({
            "text": SUPERVISOR["title_ar"],
            "pos": (mx + mw // 2, sup_top + 14),
            "size": 14,
            "color": (200, 220, 255),
            "align": "center",
            "font": "tahoma.ttf"
        })

        text_batch.append({
            "text": f"{SUPERVISOR['name_ar']}   |   {SUPERVISOR['name_en']}",
            "pos": (mx + mw // 2, sup_top + 38),
            "size": 22,
            "color": (0, 230, 255), # Gold
            "align": "center",
            "font": "tahoma.ttf"
        })

        text_batch.append({
            "text": f"{SUPERVISOR['subtitle_ar']}  —  {SUPERVISOR['subtitle_en']}",
            "pos": (mx + mw // 2, sup_top + 68),
            "size": 12,
            "color": (170, 195, 225),
            "align": "center",
            "font": "segoeui.ttf"
        })

        # Footer Hint
        text_batch.append({
            "text": "انقر في أي مكان أو اضغط [T] أو [ESC] للعودة إلى المشغل الرئيسي  |  Press [T] or [ESC] to Return",
            "pos": (mx + mw // 2, my + mh - 18),
            "size": 12,
            "color": (120, 150, 180),
            "align": "center",
            "font": "tahoma.ttf"
        })

        # Draw all texts cleanly in single pass
        return draw_text_batch(frame, text_batch)
