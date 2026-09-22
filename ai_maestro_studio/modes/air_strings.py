"""
AI Maestro Studio - Air Oud & Guitar (العود والجيتار الهوائي)
=============================================================
Features:
- Dual Instrument Modes:
    1. 🎸 Air Guitar: Plays C, G, D, Am, Em, F chords with humanized arpeggio strum
    2. 🪕 Air Oud (عود شرقي): Authentic 5-Course Arabic Oud tuning (Kordan, Nawa, Dukah, Ashiran, Yakah)
- Spatial Division: Left hand selects chord/string, Right hand strums in the air!
- Vibrating strings, soundhole glow, and pick motion trail
- Integrated Luxury Team Showcase Modal ([T] or click button)
- Fullscreen toggle via [F], Mode toggle via [TAB], Quit via [Q] / [ESC]
"""

import os
import sys
import time
import math
import threading
from collections import deque
import cv2
import numpy as np
import mediapipe as mp
import fluidsynth

# Path setup
_MODE_DIR = os.path.dirname(os.path.abspath(__file__))
_STUDIO_DIR = os.path.dirname(_MODE_DIR)
CORE_DIR = os.path.join(_STUDIO_DIR, 'core')
MODELS_DIR = os.path.join(_STUDIO_DIR, 'models')
ASSETS_DIR = os.path.join(_STUDIO_DIR, 'assets')
BIN_DIR = os.path.join(_STUDIO_DIR, 'bin')

if CORE_DIR not in sys.path:
    sys.path.insert(0, CORE_DIR)
if _STUDIO_DIR not in sys.path:
    sys.path.insert(0, _STUDIO_DIR)

from team_showcase import TeamShowcaseModal
from text_renderer import draw_text_bgr
from ui_components import draw_glass_panel, draw_team_button, draw_bottom_bar
from accompaniment_engine import AccompanimentEngine

if sys.platform == 'win32':
    for dll_dir in [BIN_DIR, r'C:\tools\fluidsynth\bin', _STUDIO_DIR]:
        if os.path.isdir(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except Exception:
                pass
            if dll_dir not in os.environ.get('PATH', ''):
                os.environ['PATH'] = dll_dir + ';' + os.environ.get('PATH', '')

SOUNDFONT_PATH = os.path.join(ASSETS_DIR, 'orchestra.sf2')
HAND_TASK_PATH = os.path.join(MODELS_DIR, 'hand_landmarker.task')

GUITAR_CHORDS = [
    {"name": "E Minor (Em)", "fingers": 0, "pitches": [40, 47, 52, 55, 59, 64], "color": (0, 165, 255)},
    {"name": "C Major (C)",  "fingers": 1, "pitches": [48, 52, 55, 60, 64],     "color": (0, 230, 90)},
    {"name": "G Major (G)",  "fingers": 2, "pitches": [43, 47, 50, 55, 59, 67], "color": (0, 215, 255)},
    {"name": "D Major (D)",  "fingers": 3, "pitches": [50, 57, 62, 66],         "color": (255, 140, 0)},
    {"name": "A Minor (Am)", "fingers": 4, "pitches": [45, 52, 57, 60, 64],     "color": (255, 100, 255)},
    {"name": "F Major (F)",  "fingers": 5, "pitches": [41, 48, 53, 57, 60, 65], "color": (0, 120, 255)},
]

OUD_STRINGS = [
    {"name": "C4 (Kordan / Do)",    "fingers": 0, "pitches": [60, 72], "color": (0, 215, 255)},
    {"name": "G3 (Nawa / Sol)",    "fingers": 1, "pitches": [55, 67], "color": (0, 230, 90)},
    {"name": "D3 (Dukah / Re)",    "fingers": 2, "pitches": [50, 62], "color": (0, 165, 255)},
    {"name": "A2 (Ashiran / La)",  "fingers": 3, "pitches": [45, 57], "color": (255, 140, 0)},
    {"name": "F2 (Yakah / Fa)",    "fingers": 4, "pitches": [41, 53], "color": (200, 80, 255)},
    {"name": "Taqsim Arpeggio",    "fingers": 5, "pitches": [50, 53, 57, 60, 62], "color": (0, 255, 255)},
]


class StringsSynth:
    def __init__(self, sf2_path):
        self.fs = fluidsynth.Synth(gain=0.8)
        self.fs.setting('synth.polyphony', 128)
        self.fs.setting('synth.cpu-cores', 4)

        driver = 'coreaudio' if sys.platform == 'darwin' else 'dsound'
        try:
            self.fs.start(driver=driver)
        except Exception:
            self.fs.start()

        self.sfid = self.fs.sfload(sf2_path)
        self.mode = "guitar"
        self.fs.program_select(0, self.sfid, 0, 25)
        self.fs.program_select(1, self.sfid, 0, 45)
        self.active = True

    def set_mode(self, mode_name):
        self.mode = mode_name
        self.fs.system_reset()
        if self.mode == "guitar":
            self.fs.program_select(0, self.sfid, 0, 25)
        else:
            self.fs.program_select(1, self.sfid, 0, 45)

    def play_strum(self, pitches, velocity=105, acc_engine=None):
        channel = 0 if self.mode == "guitar" else 1
        for i, pitch in enumerate(pitches):
            delay = i * 0.022
            timer = threading.Timer(delay, self._note_on_decay, args=[channel, pitch, velocity])
            timer.daemon = True
            timer.start()
            if acc_engine is not None:
                acc_engine.visualizer.trigger_note(pitch, velocity)

    def _note_on_decay(self, channel, pitch, vel):
        if not self.active:
            return
        try:
            self.fs.noteon(channel, pitch, vel)
            off_timer = threading.Timer(1.5, self._safe_note_off, args=[channel, pitch])
            off_timer.daemon = True
            off_timer.start()
        except Exception:
            pass

    def _safe_note_off(self, channel, pitch):
        if self.active:
            try:
                self.fs.noteoff(channel, pitch)
            except Exception:
                pass

    def stop(self):
        self.active = False
        try:
            self.fs.system_reset()
            self.fs.delete()
        except Exception:
            pass


def count_raised_fingers(hand_landmarks):
    wrist = hand_landmarks[0]
    tip_ids = [4, 8, 12, 16, 20]
    pip_ids = [3, 6, 10, 14, 18]
    mcp_ids = [2, 5, 9, 13, 17]

    count = 0
    t_tip = hand_landmarks[tip_ids[0]]
    t_pip = hand_landmarks[pip_ids[0]]
    dist_tip = math.hypot(t_tip.x - wrist.x, t_tip.y - wrist.y)
    dist_pip = math.hypot(t_pip.x - wrist.x, t_pip.y - wrist.y)
    if dist_tip > dist_pip * 1.15:
        count += 1

    for i in range(1, 5):
        tip = hand_landmarks[tip_ids[i]]
        pip = hand_landmarks[pip_ids[i]]
        if tip.y < pip.y:
            count += 1

    return count


def draw_strings_hud(canvas, synth, active_item, strum_activity, strum_trail, anim_tick, team_btn_rect=(0, 0, 0, 0), acc_engine=None):
    h, w = canvas.shape[:2]

    # 1. Top Cinema Bar
    draw_glass_panel(canvas, 0, 0, w, 68, (14, 20, 32), 0.90)
    cv2.line(canvas, (0, 68), (w, 68), (0, 215, 255), 2)
    cv2.line(canvas, (0, 71), (w, 71), (255, 240, 0), 1)

    title_en = "AIR GUITAR STUDIO" if synth.mode == "guitar" else "AIR OUD STUDIO (العود العربي)"
    cv2.putText(canvas, title_en, (25, 30), cv2.FONT_HERSHEY_DUPLEX, 0.72, (255, 255, 255), 2)
    mode_hint = "Mode: Steel String Guitar ([TAB] to switch)" if synth.mode == "guitar" else "Mode: Traditional 5-Course Arabic Oud ([TAB] to switch)"
    cv2.putText(canvas, mode_hint, (25, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 215, 255), 1)

    # Team Showcase Button
    canvas = draw_team_button(canvas, team_btn_rect)

    # 2. Left Fretboard Panel (Crystal-clear ROI blending)
    panel_w = 280
    panel_y1 = 85
    panel_h = 390
    draw_glass_panel(canvas, 20, panel_y1, 20 + panel_w, panel_y1 + panel_h, (14, 20, 34), 0.88)
    cv2.rectangle(canvas, (20, panel_y1), (20 + panel_w, panel_y1 + panel_h), (0, 215, 255), 1)

    panel_title = "GUITAR CHORDS (LEFT HAND)" if synth.mode == "guitar" else "OUD COURSES (دوزان العود)"
    cv2.putText(canvas, panel_title, (32, panel_y1 + 25), cv2.FONT_HERSHEY_DUPLEX, 0.44, (0, 240, 255), 1)
    cv2.line(canvas, (30, panel_y1 + 34), (20 + panel_w - 20, panel_y1 + 34), (50, 70, 95), 1)

    items = OUD_STRINGS if synth.mode == "oud" else GUITAR_CHORDS
    iy = panel_y1 + 52
    for item in items:
        is_active = (item["name"] == active_item["name"])
        bg_col = (45, 65, 95) if is_active else (18, 24, 36)
        card_x1 = 28
        card_x2 = 20 + panel_w - 18
        card_y1 = iy - 6
        card_y2 = iy + 36

        if is_active:
            draw_glass_panel(canvas, card_x1, card_y1, card_x2, card_y2, (0, 140, 255), 0.35)
            cv2.rectangle(canvas, (card_x1, card_y1), (card_x2, card_y2), (0, 255, 255), 2)
            cv2.rectangle(canvas, (card_x1, card_y1), (card_x1 + 6, card_y2), (255, 255, 255), -1)
            cv2.putText(canvas, "[ON]", (card_x2 - 42, iy + 17), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 120), 1)
        else:
            draw_glass_panel(canvas, card_x1, card_y1, card_x2, card_y2, (20, 28, 42), 0.70)
            cv2.rectangle(canvas, (card_x1, card_y1), (card_x2, card_y2), (45, 60, 80), 1)

        f_badge = f"{item['fingers']} Finger{'s' if item['fingers']!=1 else ''}"
        cv2.putText(canvas, f_badge, (card_x1 + 18, iy + 17), cv2.FONT_HERSHEY_SIMPLEX, 0.40, item["color"], 1)

        name_col = (255, 255, 255) if is_active else (190, 205, 225)
        cv2.putText(canvas, item["name"], (card_x1 + 105, iy + 17), cv2.FONT_HERSHEY_DUPLEX, 0.45, name_col, 1)
        iy += 56

    # Phase 3: Accompaniment HUD & Audio Spectrum Equalizer
    if acc_engine is not None:
        acc_engine.draw_hud_panel(canvas, 20, panel_y1 + panel_h + 10, width=panel_w, height=125)
        acc_engine.visualizer.draw(canvas, w - 280, 78, width=255, height=125, title="16-BAND AUDIO SPECTRUM")

    # 3. Soundhole & Strings
    strum_x1 = int(w * 0.48)
    strum_x2 = int(w * 0.88)
    strum_y1 = int(h * 0.30)
    strum_y2 = int(h * 0.78)

    sh_cx = (strum_x1 + strum_x2) // 2
    sh_cy = (strum_y1 + strum_y2) // 2
    sh_r = int((strum_y2 - strum_y1) * 0.42)

    draw_glass_panel(canvas, sh_cx - sh_r, sh_cy - sh_r, sh_cx + sh_r, sh_cy + sh_r, (14, 18, 28), 0.82)
    cv2.circle(canvas, (sh_cx, sh_cy), sh_r, (0, 215, 255) if strum_activity > 0 else (65, 80, 110), 2)
    cv2.circle(canvas, (sh_cx, sh_cy), sh_r - 12, (35, 45, 65), 1)

    num_strings = 5 if synth.mode == "oud" else 6
    string_spacing = (strum_y2 - strum_y1) // (num_strings + 1)

    for s_idx in range(num_strings):
        sy = strum_y1 + (s_idx + 1) * string_spacing
        str_col = (210, 220, 240)
        th = 1 if s_idx < 3 else 2
        if strum_activity > 0:
            vib = int(math.sin(anim_tick * 0.8 + s_idx) * 5 * (strum_activity / 10.0))
            sy += vib
            str_col = active_item["color"]
            th += 1
        cv2.line(canvas, (strum_x1, sy), (strum_x2, sy), str_col, th)

    zone_title = "RISHA PLUCK ZONE" if synth.mode == "oud" else "STRUMMING ZONE"
    z_sz = cv2.getTextSize(zone_title, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)[0]
    cv2.putText(canvas, zone_title, (sh_cx - z_sz[0] // 2, strum_y1 - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 215, 255), 1)

    if len(strum_trail) > 2:
        for i in range(1, len(strum_trail)):
            pt1 = strum_trail[i - 1]
            pt2 = strum_trail[i]
            if pt1 is not None and pt2 is not None:
                alpha = i / float(len(strum_trail))
                th = int(1 + alpha * 4)
                col = (0, int(180 * alpha), int(255 * alpha))
                cv2.line(canvas, pt1, pt2, col, th)

    if strum_activity > 0:
        pulse_r = int(sh_r + (12 - strum_activity) * 6)
        cv2.circle(canvas, (sh_cx, sh_cy), pulse_r, active_item["color"], 2)
        hit_text = "STRUM!" if synth.mode == "guitar" else "OUD PLUCK!"
        cv2.putText(canvas, hit_text, (sh_cx - 55, sh_cy + 10), cv2.FONT_HERSHEY_DUPLEX, 0.88, (255, 255, 255), 2)

    # 4. Bottom Strip
    b_name = acc_engine.current_style_info()['name_en'] if acc_engine else 'Beat'
    stat = f"Active: {active_item['name']} | [B] Backing Beat ({b_name}) | [S] Style | [+/-] BPM"
    hints = "[TAB] Mode | [T] Team | [F] Full | [Q] Quit"
    canvas = draw_bottom_bar(canvas, stat, hints)

    return canvas


def main():
    synth = StringsSynth(SOUNDFONT_PATH)

    BaseOptions = mp.tasks.BaseOptions
    HandLandmarker = mp.tasks.vision.HandLandmarker
    HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=HAND_TASK_PATH),
        running_mode=VisionRunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )

    cap = cv2.VideoCapture(0)
    window_name = "AI Maestro Studio - Air Oud & Guitar"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720)

    team_modal = TeamShowcaseModal()

    def mouse_callback(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            if team_modal.is_open:
                team_modal.handle_click(x, y)
            else:
                bx1, by1, bx2, by2 = param['team_btn']
                if bx1 <= x <= bx2 and by1 <= y <= by2:
                    team_modal.show()

    mouse_params = {'team_btn': (1280 - 230, 12, 1280 - 25, 52)}
    cv2.setMouseCallback(window_name, mouse_callback, mouse_params)

    current_chord_idx = 0
    strum_trail = deque(maxlen=16)
    last_r_wrist_y = None
    last_strum_time = 0.0
    strum_activity = 0
    anim_tick = 0
    is_fullscreen = False
    acc_engine = AccompanimentEngine(initial_bpm=100)

    with HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            anim_tick += 1
            frame = cv2.flip(frame, 1)
            canvas = cv2.resize(frame, (1280, 720))
            h_canv, w_canv = canvas.shape[:2]
            team_btn_rect = (w_canv - 230, 12, w_canv - 25, 52)
            mouse_params['team_btn'] = team_btn_rect

            strum_x1 = int(w_canv * 0.48)
            strum_x2 = int(w_canv * 0.88)
            strum_y1 = int(h_canv * 0.30)
            strum_y2 = int(h_canv * 0.78)

            right_hand_in_zone = False

            if not team_modal.is_open:
                # Downscaled frame for 3x faster MediaPipe inference on CPU
                mp_small = cv2.resize(canvas, (640, 360))
                rgb_small = cv2.cvtColor(mp_small, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)
                results = landmarker.detect(mp_img)

                if results.hand_landmarks and results.handedness:
                    for hand_lms, handedness in zip(results.hand_landmarks, results.handedness):
                        wrist = hand_lms[0]
                        wx = int(wrist.x * w_canv)
                        wy = int(wrist.y * h_canv)

                        for lm in hand_lms:
                            cx, cy = int(lm.x * w_canv), int(lm.y * h_canv)
                            cv2.circle(canvas, (cx, cy), 3, (0, 215, 255) if wx >= int(w_canv * 0.45) else (0, 230, 90), -1)

                        if wx < int(w_canv * 0.50):
                            raised = count_raised_fingers(hand_lms)
                            current_chord_idx = min(5, max(0, raised))
                            cv2.putText(canvas, f"Fingers: {raised}", (wx - 25, wy - 15),
                                        cv2.FONT_HERSHEY_DUPLEX, 0.55, (0, 230, 90), 1)

                        if wx >= int(w_canv * 0.45):
                            index_tip = hand_lms[8]
                            rx = int(index_tip.x * w_canv)
                            ry = int(index_tip.y * h_canv)
                            strum_trail.append((rx, ry))

                            if strum_x1 - 30 <= rx <= strum_x2 + 30 and strum_y1 - 20 <= ry <= strum_y2 + 20:
                                right_hand_in_zone = True
                                cv2.circle(canvas, (rx, ry), 10, (0, 215, 255), -1)
                                cv2.circle(canvas, (rx, ry), 16, (0, 165, 255), 2)

                                now = time.time()
                                if last_r_wrist_y is not None:
                                    dy = abs(ry - last_r_wrist_y)
                                    dt = now - last_strum_time
                                    if dy > 24 and dt > 0.28:
                                        items = OUD_STRINGS if synth.mode == "oud" else GUITAR_CHORDS
                                        active_item = items[current_chord_idx % len(items)]
                                        synth.play_strum(active_item["pitches"], velocity=110, acc_engine=acc_engine)
                                        last_strum_time = now
                                        strum_activity = 12

                                last_r_wrist_y = ry
                            else:
                                last_r_wrist_y = None

            if not right_hand_in_zone:
                last_r_wrist_y = None

            if strum_activity > 0:
                strum_activity -= 1

            items = OUD_STRINGS if synth.mode == "oud" else GUITAR_CHORDS
            active_item = items[current_chord_idx % len(items)]

            canvas = draw_strings_hud(canvas, synth, active_item, strum_activity, strum_trail, anim_tick, team_btn_rect=team_btn_rect, acc_engine=acc_engine)

            canvas = team_modal.render(canvas)

            cv2.imshow(window_name, canvas)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                if team_modal.is_open:
                    team_modal.hide()
                else:
                    break
            elif key == ord('t') or key == ord('T'):
                team_modal.toggle()
            elif key == ord('f') or key == ord('F'):
                is_fullscreen = not is_fullscreen
                if is_fullscreen:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                else:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
            elif key in (ord('b'), ord('B')):
                acc_engine.toggle()
            elif key in (ord('s'), ord('S')):
                acc_engine.next_style()
            elif key in (ord('+'), ord('=')):
                acc_engine.change_bpm(5)
            elif key in (ord('-'), ord('_')):
                acc_engine.change_bpm(-5)
            elif key == 9:  # TAB
                new_mode = "oud" if synth.mode == "guitar" else "guitar"
                synth.set_mode(new_mode)
            elif key == ord('1'):
                synth.set_mode("guitar")
            elif key == ord('2'):
                synth.set_mode("oud")
            elif key in [ord('0'), ord('1'), ord('2'), ord('3'), ord('4'), ord('5')]:
                current_chord_idx = int(chr(key))

    cap.release()
    cv2.destroyAllWindows()
    acc_engine.stop()
    synth.stop()
    print("Air Strings Studio exited cleanly.")


if __name__ == '__main__':
    main()
