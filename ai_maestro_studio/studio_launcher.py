"""
AI Maestro Studio - Master Interactive Graphic Launcher
=========================================================
Unified Luxury Dashboard for Computer Vision, Deep Learning & Virtual Instruments.

Features:
- High-Tech Glassmorphic 1280x720 Graphic Dashboard
- Mouse Hover & Click detection on 6 interactive mode cards
- Keyboard shortcuts [1-6] for instant mode launch
- Dedicated Glowing Neon "👥 فريق العمل [T]" button with the luxury Team Showcase Modal
- Subprocess isolation: returning from any instrument smoothly restores the launcher
"""

import os
import sys
import time
import math
import random
import subprocess
import cv2
import numpy as np

# Path configurations
_HERE = os.path.dirname(os.path.abspath(__file__))
CORE_DIR = os.path.join(_HERE, 'core')
MODES_DIR = os.path.join(_HERE, 'modes')
BIN_DIR = os.path.join(_HERE, 'bin')

if CORE_DIR not in sys.path:
    sys.path.insert(0, CORE_DIR)

MODELS_DIR = os.path.join(_HERE, 'models')
HAND_TASK_PATH = os.path.join(MODELS_DIR, 'hand_landmarker.task')

from team_showcase import TeamShowcaseModal
from text_renderer import draw_text_bgr, draw_text_batch
from stage_atmosphere import StardustParticleSystem
from gesture_navigation import TouchlessGestureNavigator

if sys.platform == 'win32':
    for dll_dir in [BIN_DIR, r'C:\tools\fluidsynth\bin', _HERE]:
        if os.path.isdir(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except Exception:
                pass
            if dll_dir not in os.environ.get('PATH', ''):
                os.environ['PATH'] = dll_dir + ';' + os.environ.get('PATH', '')

MODES = [
    {
        "id": "1",
        "title_en": "Maestro Concert Hall",
        "title_ar": "مسرح قيادة الأوركسترا السينمائي",
        "script": os.path.join(MODES_DIR, "maestro_hall.py"),
        "color": (0, 215, 255),      # Gold BGR
        "glow": (0, 160, 220),
        "desc_en": "Deep Learning BiLSTM Orchestra Conductor (Beethoven, Fairouz, Pirates, Vivaldi)",
        "desc_ar_1": "قيادة الأوركسترا الحرة بالذكاء الاصطناعي",
        "desc_ar_2": "طيف الترددات الصوتي ومسار العصا النيون",
        "icon": "MAESTRO"
    },
    {
        "id": "2",
        "title_en": "Rhythm Game Challenge",
        "title_ar": "تحدي لعبة الإيقاع التفاعلية",
        "script": os.path.join(MODES_DIR, "rhythm_challenge.py"),
        "color": (255, 100, 0),      # Electric Blue BGR
        "glow": (200, 60, 0),
        "desc_en": "Rhythm challenge with falling gesture orbs, live score & dynamic orchestral response",
        "desc_ar_1": "لعبة تفاعلية تعتمد على توقيت الإيماءات",
        "desc_ar_2": "إصابة كرات النوتات وتفاعل أوركسترالي حي",
        "icon": "RHYTHM"
    },
    {
        "id": "3",
        "title_en": "Air Grand Piano",
        "title_ar": "البيانو الهوائي الافتراضي",
        "script": os.path.join(MODES_DIR, "air_piano.py"),
        "color": (0, 240, 255),      # Cyan BGR
        "glow": (0, 180, 200),
        "desc_en": "24 Keys (14 White + 10 Black), 10-Finger Polyphonic, 5 General MIDI Timbres",
        "desc_ar_1": "عزف بوليفوني كامل باليدين و10 أصابع",
        "desc_ar_2": "24 مفتاحاً مع تموجات الماء والنيون",
        "icon": "PIANO"
    },
    {
        "id": "4",
        "title_en": "Air Drums & Percussion",
        "title_ar": "الدرامز والإيقاع الشرقي",
        "script": os.path.join(MODES_DIR, "air_drums.py"),
        "color": (0, 70, 255),       # Orange/Red BGR
        "glow": (0, 40, 200),
        "desc_en": "7 3D Air Drum Pads: Rock Studio Kit + Arabic Darbuka, Riqq & Sagat (PCM + MIDI)",
        "desc_ar_1": "توليف إجرائي عالي القوة بزمن استجابة فوري",
        "desc_ar_2": "درامز روك + إيقاع عربي (دم، تك، صك، رق)",
        "icon": "DRUMS"
    },
    {
        "id": "5",
        "title_en": "Air Oud & Guitar",
        "title_ar": "العود الشرقي والجيتار الهوائي",
        "script": os.path.join(MODES_DIR, "air_strings.py"),
        "color": (0, 230, 90),       # Emerald BGR
        "glow": (0, 170, 60),
        "desc_en": "6 Guitar Chords + Authentic 5-Course Arabic Oud Tuning (Kordan, Nawa, Dukah...)",
        "desc_ar_1": "دوزان عود عربي أصيل و6 كوردات جيتار",
        "desc_ar_2": "تثبيت النغمة باليسرى والعزف بالريشة باليمنى",
        "icon": "STRINGS"
    },
    {
        "id": "6",
        "title_en": "Air Concert Violin",
        "title_ar": "الكمان الكلاسيكي الهوائي",
        "script": os.path.join(MODES_DIR, "air_violin.py"),
        "color": (255, 100, 220),    # Magenta BGR
        "glow": (180, 50, 160),
        "desc_en": "4 Strings (G, D, A, E), Dynamic Bowing Velocity (p to ff), Natural Hand Vibrato",
        "desc_ar_1": "محاكاة فيزيائية حقيقية لحركة القوس",
        "desc_ar_2": "تحكم ديناميكي بقوة الصوت واهتزاز طبيعي",
        "icon": "VIOLIN"
    }
]



class StudioLauncherApp:
    def __init__(self):
        self.w = 1280
        self.h = 720
        self.window_name = "AI Maestro Studio — Master Control Hub"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, self.w, self.h)

        self.team_modal = TeamShowcaseModal()
        self.stardust = StardustParticleSystem(max_particles=70)
        self.hovered_card_idx = None
        self.hovered_team_btn = False
        self.mouse_x = -1
        self.mouse_y = -1
        self.clicked_action = None

        # Touchless Gesture Navigation & Camera
        self.cap = None
        self.show_camera_bg = True
        self.gesture_enabled = True
        self.init_camera()
        self.navigator = TouchlessGestureNavigator(HAND_TASK_PATH, self.w, self.h)

        cv2.setMouseCallback(self.window_name, self.mouse_handler)

    def init_camera(self):
        """Initializes webcam for touchless navigation and background feed."""
        try:
            self.cap = cv2.VideoCapture(0)
            if self.cap is not None and self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
            else:
                self.cap = None
        except Exception as e:
            print(f"[WARN] Launcher camera init error: {e}")
            self.cap = None

    def release_camera(self):
        """Cleanly releases webcam so child instrument subprocesses have exclusive access."""
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def mouse_handler(self, event, x, y, flags, param):
        self.mouse_x = x
        self.mouse_y = y

        if event == cv2.EVENT_MOUSEMOVE and random.random() < 0.30:
            self.stardust.emit(x, y, count=1, speed_scale=0.45)

        if event == cv2.EVENT_LBUTTONDOWN:
            if self.team_modal.is_open:
                self.team_modal.handle_click(x, y)
                return

            # Check if team button clicked
            bx1, by1, bx2, by2 = (self.w - 250, 14, self.w - 30, 52)
            if bx1 <= x <= bx2 and by1 <= y <= by2:
                self.team_modal.show()
                return

            # Check if any card clicked
            card_boxes = self.get_card_boxes()
            for idx, (cx1, cy1, cx2, cy2) in enumerate(card_boxes):
                if cx1 <= x <= cx2 and cy1 <= y <= cy2:
                    self.clicked_action = idx
                    return

    def get_card_boxes(self):
        # 3 columns, 2 rows
        cols = 3
        rows = 2
        card_w = 380
        card_h = 245
        gap_x = 35
        gap_y = 25

        total_grid_w = cols * card_w + (cols - 1) * gap_x
        start_x = (self.w - total_grid_w) // 2
        start_y = 95

        boxes = []
        for r in range(rows):
            for c in range(cols):
                cx1 = start_x + c * (card_w + gap_x)
                cy1 = start_y + r * (card_h + gap_y)
                cx2 = cx1 + card_w
                cy2 = cy1 + card_h
                boxes.append((cx1, cy1, cx2, cy2))
        return boxes

    def run_mode(self, mode_idx):
        if mode_idx < 0 or mode_idx >= len(MODES):
            return
        selected = MODES[mode_idx]
        script_path = selected["script"]
        if not os.path.exists(script_path):
            print(f"[ERROR] Script not found: {script_path}")
            return

        print(f"\n=======================================================")
        print(f"  Launching {selected['title_en']} ({selected['title_ar']})...")
        print(f"=======================================================\n")

        # Crucial for Windows: cleanly release webcam before child launches
        self.release_camera()

        # Temporarily hide launcher window
        cv2.destroyWindow(self.window_name)

        # Run mode process using current python executable
        try:
            subprocess.run([sys.executable, script_path], cwd=_HERE)
        except Exception as e:
            print(f"[ERROR] Subprocess error: {e}")

        # Reopen launcher window smoothly & re-acquire camera
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, self.w, self.h)
        cv2.setMouseCallback(self.window_name, self.mouse_handler)
        self.init_camera()
        self.clicked_action = None

    def draw_dashboard(self, anim_tick):
        # 1. Camera Frame Reading & Gesture Processing
        cam_frame = None
        if self.cap is not None and self.cap.isOpened():
            ret, raw = self.cap.read()
            if ret and raw is not None:
                cam_frame = cv2.flip(raw, 1)
                if self.gesture_enabled:
                    self.navigator.process_camera_frame(cam_frame)

        # 2. Base Canvas Generation
        if self.show_camera_bg and cam_frame is not None:
            resized_cam = cv2.resize(cam_frame, (self.w, self.h))
            dimmed_cam = (resized_cam.astype(np.float32) * 0.22).astype(np.uint8)
            frame = cv2.add(dimmed_cam, np.full_like(dimmed_cam, (8, 12, 18)))
            # Subtle cyber scanlines
            for gy in range(0, self.h, 45):
                cv2.line(frame, (0, gy), (self.w, gy), (14, 22, 34), 1)
        else:
            frame = np.zeros((self.h, self.w, 3), dtype=np.uint8)
            frame[:] = (8, 12, 18)
            # Subtle cyber grid lines
            for gx in range(0, self.w, 40):
                cv2.line(frame, (gx, 0), (gx, self.h), (14, 20, 30), 1)
            for gy in range(0, self.h, 40):
                cv2.line(frame, (0, gy), (self.w, gy), (14, 20, 30), 1)

        # 3. Touchless Action Resolution
        card_boxes = self.get_card_boxes()
        bx1, by1, bx2, by2 = (self.w - 250, 14, self.w - 30, 52)
        team_rect = (bx1, by1, bx2, by2)

        triggered_act, act_type, dwell_progress = (None, None, 0.0)
        if self.gesture_enabled and self.navigator.has_hand:
            triggered_act, act_type, dwell_progress = self.navigator.update_touchless_actions(
                card_boxes, team_rect, self.team_modal.is_open
            )

        if triggered_act is not None:
            if act_type == 'team':
                self.team_modal.toggle()
            elif act_type == 'mode':
                self.clicked_action = triggered_act

        using_gesture = (self.gesture_enabled and self.navigator.has_hand)
        active_x = self.navigator.cursor_x if using_gesture else self.mouse_x
        active_y = self.navigator.cursor_y if using_gesture else self.mouse_y

        # 4. Top Bar Header
        cv2.rectangle(frame, (0, 0), (self.w, 68), (12, 16, 26), -1)
        cv2.line(frame, (0, 68), (self.w, 68), (0, 215, 255), 2)
        cv2.line(frame, (0, 71), (self.w, 71), (255, 240, 0), 1)

        # Top Bar Text
        cv2.putText(frame, "AI MAESTRO STUDIO", (30, 32), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 2)
        cv2.putText(frame, "Next-Gen Touchless Gesture Launcher & Digital Instrument Hub",
                    (30, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 215, 255), 1)

        # High-Tech Status Badges in Header
        # Gesture Navigation Badge
        gx1, gy1, gx2, gy2 = (530, 16, 755, 50)
        if not self.gesture_enabled:
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (18, 22, 30), -1)
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (50, 60, 75), 1)
            cv2.putText(frame, "[G] GESTURE: OFF", (gx1 + 18, gy1 + 22), cv2.FONT_HERSHEY_DUPLEX, 0.42, (120, 135, 150), 1)
        elif self.navigator.has_hand:
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (12, 36, 24), -1)
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (0, 240, 90), 1)
            pulse_r = int(5 + math.sin(anim_tick * 0.3) * 1.5)
            cv2.circle(frame, (gx1 + 18, (gy1 + gy2) // 2), pulse_r, (0, 255, 120), -1)
            cv2.putText(frame, "[G] TOUCHLESS ACTIVE", (gx1 + 32, gy1 + 22), cv2.FONT_HERSHEY_DUPLEX, 0.42, (0, 255, 140), 1)
        else:
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (20, 30, 48), -1)
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (0, 200, 255), 1)
            cv2.putText(frame, "[G] SHOW HAND TO NAV", (gx1 + 14, gy1 + 22), cv2.FONT_HERSHEY_DUPLEX, 0.40, (0, 215, 255), 1)

        # Camera Background Feed Badge
        cx1_b, cy1_b, cx2_b, cy2_b = (768, 16, 940, 50)
        if self.show_camera_bg and cam_frame is not None:
            cv2.rectangle(frame, (cx1_b, cy1_b), (cx2_b, cy2_b), (20, 32, 50), -1)
            cv2.rectangle(frame, (cx1_b, cy1_b), (cx2_b, cy2_b), (255, 215, 0), 1)
            cv2.putText(frame, "[C] CAM BG: ON", (cx1_b + 20, cy1_b + 22), cv2.FONT_HERSHEY_DUPLEX, 0.42, (255, 230, 50), 1)
        else:
            cv2.rectangle(frame, (cx1_b, cy1_b), (cx2_b, cy2_b), (18, 22, 30), -1)
            cv2.rectangle(frame, (cx1_b, cy1_b), (cx2_b, cy2_b), (50, 60, 75), 1)
            cv2.putText(frame, "[C] CAM BG: OFF", (cx1_b + 20, cy1_b + 22), cv2.FONT_HERSHEY_DUPLEX, 0.42, (120, 135, 150), 1)

        # Top Bar Team Button
        is_btn_hovered = (bx1 <= active_x <= bx2 and by1 <= active_y <= by2)
        btn_bg = (40, 55, 90) if is_btn_hovered else (25, 35, 55)
        cv2.rectangle(frame, (bx1, by1), (bx2, by2), btn_bg, -1)
        cv2.rectangle(frame, (bx1, by1), (bx2, by2), (0, 240, 255), 2 if is_btn_hovered else 1)
        cv2.rectangle(frame, (bx1 - 2, by1 - 2), (bx2 + 2, by2 + 2), (255, 215, 0), 1)

        # Gesture dwell progress on team button
        if using_gesture and is_btn_hovered and dwell_progress > 0:
            pw = int((bx2 - bx1) * dwell_progress)
            cv2.rectangle(frame, (bx1, by2 - 4), (bx1 + pw, by2), (0, 240, 90), -1)

        frame = draw_text_bgr(frame, "فريق العمل  [T]  Team", (bx1 + (bx2 - bx1) // 2, by1 + 7),
                              font_size=15, color_bgr=(255, 240, 0), align="center")

        # 5. Draw 6 Mode Cards
        text_batch = []

        for idx, (cx1, cy1, cx2, cy2) in enumerate(card_boxes):
            mode = MODES[idx]
            is_hover = (cx1 <= active_x <= cx2 and cy1 <= active_y <= cy2 and not self.team_modal.is_open)

            # Card Background
            card_bg_col = (20, 28, 42) if is_hover else (14, 19, 30)
            cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), card_bg_col, -1)

            # Card Border
            border_col = mode["color"] if is_hover else (45, 55, 75)
            thick = 2 if is_hover else 1
            cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), border_col, thick)

            # Corner accents
            c_len = 16
            cv2.line(frame, (cx1, cy1), (cx1 + c_len, cy1), mode["color"], 2)
            cv2.line(frame, (cx1, cy1), (cx1, cy1 + c_len), mode["color"], 2)
            cv2.line(frame, (cx2, cy2), (cx2 - c_len, cy2), mode["color"], 2)
            cv2.line(frame, (cx2, cy2), (cx2, cy2 - c_len), mode["color"], 2)

            # Number badge at top-left
            badge_sz = 34
            cv2.rectangle(frame, (cx1, cy1), (cx1 + badge_sz, cy1 + badge_sz), mode["glow"], -1)
            cv2.putText(frame, f"[{mode['id']}]", (cx1 + 5, cy1 + 24), cv2.FONT_HERSHEY_DUPLEX, 0.60, (255, 255, 255), 2)

            # English Title
            cv2.putText(frame, mode["title_en"], (cx1 + 44, cy1 + 25), cv2.FONT_HERSHEY_DUPLEX, 0.58, (255, 255, 255), 1)

            # Arabic Title
            text_batch.append({
                "text": mode["title_ar"],
                "pos": (cx1 + (cx2 - cx1) // 2, cy1 + 44),
                "size": 18,
                "color": mode["color"],
                "align": "center",
                "font": "tahoma.ttf"
            })

            # Divider
            cv2.line(frame, (cx1 + 18, cy1 + 76), (cx2 - 18, cy1 + 76), (40, 50, 70), 1)

            # Arabic Description (Balanced 2 Lines)
            text_batch.append({
                "text": mode["desc_ar_1"],
                "pos": (cx1 + (cx2 - cx1) // 2, cy1 + 86),
                "size": 13,
                "color": (230, 240, 255),
                "align": "center",
                "font": "tahoma.ttf"
            })
            text_batch.append({
                "text": mode["desc_ar_2"],
                "pos": (cx1 + (cx2 - cx1) // 2, cy1 + 108),
                "size": 12,
                "color": (175, 200, 225),
                "align": "center",
                "font": "tahoma.ttf"
            })

            # English Description
            desc_en_lines = [mode["desc_en"][:46], mode["desc_en"][46:]]
            cv2.putText(frame, desc_en_lines[0], (cx1 + 16, cy1 + 150), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (150, 170, 195), 1)
            if desc_en_lines[1]:
                cv2.putText(frame, desc_en_lines[1].strip(), (cx1 + 16, cy1 + 168), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (150, 170, 195), 1)

            # Launch Button Indicator at Bottom of Card
            lbtn_h = 32
            lbtn_y1 = cy2 - lbtn_h - 10
            lbtn_y2 = cy2 - 10
            lbtn_col = mode["color"] if is_hover else (30, 40, 60)
            cv2.rectangle(frame, (cx1 + 18, lbtn_y1), (cx2 - 18, lbtn_y2), lbtn_col, -1 if is_hover else 1)

            is_gesture_target = (using_gesture and is_hover and self.navigator.hovered_card_idx == idx)
            if is_gesture_target and dwell_progress > 0:
                inner_w = (cx2 - 18) - (cx1 + 18)
                fill_w = int(inner_w * dwell_progress)
                cv2.rectangle(frame, (cx1 + 18, lbtn_y1), (cx1 + 18 + fill_w, lbtn_y2), (0, 240, 90), -1)
                launch_txt = f"تثبيت للاختيار... Hold ({int(dwell_progress * 100)}%)"
                txt_color = (10, 20, 10)
            elif is_gesture_target and self.navigator.is_pinching:
                cv2.rectangle(frame, (cx1 + 18, lbtn_y1), (cx2 - 18, lbtn_y2), (0, 255, 140), -1)
                launch_txt = "تشغيل فوري! Pinch Triggered!"
                txt_color = (10, 20, 10)
            else:
                launch_txt = f"تشغيل الآن  (اضغط {mode['id']})  Launch Mode"
                txt_color = (15, 20, 30) if is_hover else (200, 220, 245)

            text_batch.append({
                "text": launch_txt,
                "pos": (cx1 + (cx2 - cx1) // 2, lbtn_y1 + 6),
                "size": 12,
                "color": txt_color,
                "align": "center",
                "font": "tahoma.ttf"
            })

        # 6. Bottom Status & Navigation Bar
        cv2.rectangle(frame, (0, self.h - 52), (self.w, self.h), (12, 16, 26), -1)
        cv2.line(frame, (0, self.h - 52), (self.w, self.h - 52), (45, 55, 75), 1)

        hint_left = "تحكم بدون لمس: ثبّت يدك فوق البطاقة للاختيار أو المس السبابة بالإبهام (Pinch) | انقر بالماوس أو [1-6]"
        text_batch.append({
            "text": hint_left,
            "pos": (30, self.h - 36),
            "size": 13,
            "color": (0, 215, 255),
            "align": "left",
            "font": "tahoma.ttf"
        })

        hint_right = "[C] كاميرا الخلفية  |  [G] الإيماءات  |  [T] فريق العمل  |  [Q] خروج"
        text_batch.append({
            "text": hint_right,
            "pos": (self.w - 30, self.h - 36),
            "size": 13,
            "color": (180, 200, 225),
            "align": "right",
            "font": "tahoma.ttf"
        })

        frame = draw_text_batch(frame, text_batch)

        # 7. Magical Stardust Ambiance
        self.stardust.update()
        self.stardust.draw(frame)

        # 8. Render Team Modal on top if open
        frame = self.team_modal.render(frame)

        # 9. Render Holographic Touchless Cursor (Renders on topmost layer)
        if self.gesture_enabled:
            self.navigator.draw_cursor(frame, anim_tick, self.stardust)

        return frame

    def run(self):
        anim_tick = 0
        while True:
            anim_tick += 1
            frame = self.draw_dashboard(anim_tick)
            cv2.imshow(self.window_name, frame)

            # Check if action was triggered
            if self.clicked_action is not None:
                action = self.clicked_action
                self.clicked_action = None
                self.run_mode(action)
                continue

            key = cv2.waitKey(20) & 0xFF
            if key in [ord('q'), ord('Q'), 27]:
                if self.team_modal.is_open:
                    self.team_modal.hide()
                else:
                    break
            elif key in [ord('t'), ord('T')]:
                self.team_modal.toggle()
            elif key in [ord('c'), ord('C')]:
                self.show_camera_bg = not self.show_camera_bg
            elif key in [ord('g'), ord('G')]:
                self.gesture_enabled = not self.gesture_enabled
                self.navigator.enabled = self.gesture_enabled
            elif key in [ord('1'), ord('2'), ord('3'), ord('4'), ord('5'), ord('6')]:
                if not self.team_modal.is_open:
                    mode_idx = int(chr(key)) - 1
                    self.run_mode(mode_idx)

        self.release_camera()
        self.navigator.close()
        cv2.destroyAllWindows()
        print("\nAI Maestro Studio Master Launcher closed. Goodbye!\n")


def main():
    app = StudioLauncherApp()
    app.run()


if __name__ == '__main__':
    main()
