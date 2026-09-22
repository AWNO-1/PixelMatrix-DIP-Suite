"""
AI Maestro Studio - Air Concert Violin (الكمان الهوائي)
========================================================
Features:
- Concert violin in mid-air with expressive continuous bowing physics
- Left Hand: Holds fingerboard and stops strings (G3, D4, A4, E5) with natural vibrato
- Right Hand: Draws virtual violin bow across strings
- Bow velocity governs volume dynamics (p, mf, ff)
- 3 Timbres: Solo Violin, String Ensemble, Pizzicato
- Integrated Luxury Team Showcase Modal ([T] or click button)
- Fullscreen toggle via [F], Timbre toggle via [TAB], Quit via [Q] / [ESC]
"""

import os
import sys
import time
import math
import random
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

VIOLIN_STRINGS = [
    {"name": "G String (G3)", "open": 55, "notes": [55, 57, 59, 60, 62], "color": (50, 160, 255)},
    {"name": "D String (D4)", "open": 62, "notes": [62, 64, 65, 67, 69], "color": (0, 230, 120)},
    {"name": "A String (A4)", "open": 69, "notes": [69, 71, 72, 74, 76], "color": (0, 215, 255)},
    {"name": "E String (E5)", "open": 76, "notes": [76, 77, 79, 81, 83], "color": (220, 80, 255)},
]

TIMBRES = [
    ("Solo Violin", 40),
    ("String Ensemble", 48),
    ("Pizzicato Violin", 45),
]


def midi_to_note_name(midi_pitch):
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    octave = (midi_pitch // 12) - 1
    note = notes[midi_pitch % 12]
    return f"{note}{octave}"


class ViolinSynth:
    def __init__(self, sf2_path):
        self.fs = fluidsynth.Synth(gain=0.9)
        self.fs.setting('synth.polyphony', 32)
        self.fs.setting('synth.cpu-cores', 4)

        driver = 'coreaudio' if sys.platform == 'darwin' else 'dsound'
        try:
            self.fs.start(driver=driver)
        except Exception:
            self.fs.start()

        self.sfid = self.fs.sfload(sf2_path)
        self.current_timbre_idx = 0
        self.current_pitch = None
        self.is_bowing = False
        self.current_volume = 0.0

        self.set_timbre(0)
        self.fs.cc(0, 101, 0)
        self.fs.cc(0, 100, 0)
        self.fs.cc(0, 6, 2)

    def set_timbre(self, idx):
        self.current_timbre_idx = idx % len(TIMBRES)
        _, prog = TIMBRES[self.current_timbre_idx]
        self.stop_tone()
        self.fs.program_select(0, self.sfid, 0, prog)

    def next_timbre(self):
        self.set_timbre(self.current_timbre_idx + 1)

    def set_expression(self, volume_factor, vibrato_cents=0.0):
        self.current_volume = max(0.0, min(1.0, volume_factor))
        cc7_val = int(self.current_volume * 127)
        self.fs.cc(0, 7, cc7_val)

        bend_val = int(8192 + (vibrato_cents / 200.0) * 8191)
        bend_val = max(0, min(16383, bend_val))
        self.fs.pitch_bend(0, bend_val)

    def start_or_update_note(self, pitch, velocity=100):
        if self.current_pitch == pitch and self.is_bowing:
            return
        if self.current_pitch is not None and self.current_pitch != pitch:
            self.fs.noteoff(0, self.current_pitch)
        self.current_pitch = pitch
        self.is_bowing = True
        self.fs.noteon(0, pitch, max(30, min(127, int(velocity))))

    def stop_tone(self):
        if self.current_pitch is not None:
            self.fs.noteoff(0, self.current_pitch)
            self.current_pitch = None
        self.is_bowing = False
        self.current_volume = 0.0
        self.fs.cc(0, 7, 0)

    def stop(self):
        self.stop_tone()
        try:
            self.fs.system_reset()
            self.fs.delete()
        except Exception:
            pass


class RosinParticle:
    def __init__(self, x, y, color):
        self.x = float(x)
        self.y = float(y)
        self.color = color
        self.vx = random.uniform(-1.5, 1.5)
        self.vy = random.uniform(-2.5, -0.5)
        self.life = 1.0
        self.decay = random.uniform(0.04, 0.08)

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.life -= self.decay

    def draw(self, canvas):
        if self.life > 0:
            sz = max(1, int(self.life * 3))
            cv2.circle(canvas, (int(self.x), int(self.y)), sz, self.color, -1)


def count_stopping_fingers(hand_landmarks):
    tip_ids = [8, 12, 16, 20]
    pip_ids = [6, 10, 14, 18]
    count = 0
    for tip_id, pip_id in zip(tip_ids, pip_ids):
        tip = hand_landmarks[tip_id]
        pip = hand_landmarks[pip_id]
        if tip.y < pip.y:
            count += 1
    return count


def draw_violin_hud(canvas, synth, active_string_idx, active_pitch,
                    bow_speed, is_bowing, expression_label, anim_tick, team_btn_rect=(0, 0, 0, 0), acc_engine=None):
    h, w = canvas.shape[:2]

    # 1. Top Cinema Ribbon
    draw_glass_panel(canvas, 0, 0, w, 68, (14, 20, 32), 0.90)
    cv2.line(canvas, (0, 68), (w, 68), (0, 215, 255), 2)
    cv2.line(canvas, (0, 71), (w, 71), (255, 240, 0), 1)

    # Title
    cv2.putText(canvas, "AIR CONCERT VIOLIN", (25, 30), cv2.FONT_HERSHEY_DUPLEX, 0.72, (255, 255, 255), 2)
    timbre_name, _ = TIMBRES[synth.current_timbre_idx]
    cv2.putText(canvas, f"Timbre: {timbre_name} ([TAB] to switch) | Expressive Dynamic Bowing", (25, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 215, 255), 1)

    # Team Showcase Button
    canvas = draw_team_button(canvas, team_btn_rect)

    # 2. Left Fingerboard Display
    panel_w = 280
    panel_y1 = 85
    panel_h = 330
    draw_glass_panel(canvas, 20, panel_y1, 20 + panel_w, panel_y1 + panel_h, (14, 20, 34), 0.88)
    cv2.rectangle(canvas, (20, panel_y1), (20 + panel_w, panel_y1 + panel_h), (0, 215, 255), 1)

    cv2.putText(canvas, "FINGERBOARD (LEFT HAND)", (32, panel_y1 + 25), cv2.FONT_HERSHEY_DUPLEX, 0.44, (0, 240, 255), 1)
    cv2.line(canvas, (30, panel_y1 + 34), (20 + panel_w - 20, panel_y1 + 34), (50, 70, 95), 1)

    sy_p = panel_y1 + 52
    for i, s_def in enumerate(VIOLIN_STRINGS):
        is_sel = (i == active_string_idx)
        card_x1 = 28
        card_x2 = 20 + panel_w - 18
        card_y1 = sy_p - 6
        card_y2 = sy_p + 36

        if is_sel:
            draw_glass_panel(canvas, card_x1, card_y1, card_x2, card_y2, (0, 140, 255), 0.35)
            cv2.rectangle(canvas, (card_x1, card_y1), (card_x2, card_y2), (0, 255, 255), 2)
            cv2.rectangle(canvas, (card_x1, card_y1), (card_x1 + 6, card_y2), (255, 255, 255), -1)
            cv2.putText(canvas, "[ON]", (card_x2 - 42, sy_p + 17), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 120), 1)
        else:
            draw_glass_panel(canvas, card_x1, card_y1, card_x2, card_y2, (20, 28, 42), 0.70)
            cv2.rectangle(canvas, (card_x1, card_y1), (card_x2, card_y2), (45, 60, 80), 1)

        cv2.circle(canvas, (card_x1 + 22, sy_p + 15), 5, s_def["color"], -1)
        name_col = (255, 255, 255) if is_sel else (190, 205, 225)
        cv2.putText(canvas, s_def["name"], (card_x1 + 38, sy_p + 17), cv2.FONT_HERSHEY_DUPLEX, 0.46, name_col, 1)
        sy_p += 56

    # Phase 3: Accompaniment HUD & Audio Spectrum Equalizer
    if acc_engine is not None:
        acc_engine.draw_hud_panel(canvas, 20, panel_y1 + panel_h + 10, width=panel_w, height=125)
        acc_engine.visualizer.draw(canvas, w - 280, 78, width=255, height=125, title="16-BAND AUDIO SPECTRUM")

    # 3. Bow Dynamics Meter on Top
    if is_bowing and active_pitch:
        note_name = midi_to_note_name(active_pitch)
        disp_txt = f"{note_name}  [{expression_label}]"
        box_w = 260
        bx1_d = (w - box_w) // 2
        draw_glass_panel(canvas, bx1_d, 10, bx1_d + box_w, 55, (20, 25, 40), 0.90)
        cv2.rectangle(canvas, (bx1_d, 10), (bx1_d + box_w, 55), (0, 215, 255), 2)
        sz = cv2.getTextSize(disp_txt, cv2.FONT_HERSHEY_DUPLEX, 0.72, 2)[0]
        tx = bx1_d + (box_w - sz[0]) // 2
        cv2.putText(canvas, disp_txt, (tx, 38), cv2.FONT_HERSHEY_DUPLEX, 0.72, (0, 240, 255), 2)

    # 4. Bottom Status Bar
    b_name = acc_engine.current_style_info()['name_en'] if acc_engine else 'Beat'
    stat = f"Bowing: {expression_label} | [B] Backing Beat ({b_name}) | [S] Style | [+/-] BPM"
    hints = "[TAB] Timbre | [F] Full | [T] Team | [Q] Quit"
    canvas = draw_bottom_bar(canvas, stat, hints)

    return canvas


def main():
    synth = ViolinSynth(SOUNDFONT_PATH)

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
    window_name = "AI Maestro Studio - Air Concert Violin"
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

    active_string_idx = 2
    left_finger_count = 0
    bow_history = deque(maxlen=6)
    left_hand_history = deque(maxlen=8)
    rosin_particles = []
    anim_tick = 0
    is_fullscreen = False
    acc_engine = AccompanimentEngine(initial_bpm=100)

    with HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            anim_tick += 1
            now = time.time()
            frame = cv2.flip(frame, 1)
            canvas = cv2.resize(frame, (1280, 720))
            h_canv, w_canv = canvas.shape[:2]
            team_btn_rect = (w_canv - 230, 12, w_canv - 25, 52)
            mouse_params['team_btn'] = team_btn_rect

            # String Y positions
            str_y_start = int(h_canv * 0.35)
            str_spacing = int(h_canv * 0.09)
            string_ys = [str_y_start + i * str_spacing for i in range(4)]

            right_bow_pos = None
            bow_speed = 0.0
            is_bowing = False
            expression_label = "Resting"
            vibrato_cents = 0.0

            if not team_modal.is_open:
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
                            cv2.circle(canvas, (cx, cy), 3, (0, 215, 255) if wx > int(w_canv * 0.48) else (0, 230, 90), -1)

                        if wx <= int(w_canv * 0.48):
                            left_finger_count = count_stopping_fingers(hand_lms)
                            left_hand_history.append((wx, wy, now))

                            if len(left_hand_history) >= 4:
                                xs = [p[0] for p in left_hand_history]
                                tremor = max(xs) - min(xs)
                                if 2.0 < tremor < 18.0:
                                    vibrato_cents = 35.0 * math.sin(anim_tick * 0.7)

                        if wx > int(w_canv * 0.48):
                            tip = hand_lms[8]
                            bx = int(tip.x * w_canv)
                            by = int(tip.y * h_canv)
                            right_bow_pos = (bx, by)
                            bow_history.append((bx, by, now))

                            if len(bow_history) >= 2:
                                p_bx, p_by, p_t = bow_history[0]
                                dt = now - p_t
                                if dt > 0.001:
                                    dx = abs(bx - p_bx)
                                    bow_speed = dx / dt

                            dists = [abs(by - sy) for sy in string_ys]
                            min_d = min(dists)
                            if min_d < str_spacing * 1.3:
                                active_string_idx = dists.index(min_d)

                            if bow_speed > 70.0 and min_d < str_spacing * 1.5:
                                is_bowing = True
                                vel_factor = min(1.0, max(0.15, (bow_speed - 70.0) / 450.0))

                                if vel_factor < 0.35:
                                    expression_label = "Pianissimo (p)"
                                elif vel_factor < 0.65:
                                    expression_label = "Mezzo-Forte (mf)"
                                else:
                                    expression_label = "Fortissimo (ff) !"

                                s_def = VIOLIN_STRINGS[active_string_idx]
                                note_idx = min(len(s_def["notes"]) - 1, max(0, left_finger_count))
                                active_pitch = s_def["notes"][note_idx]

                                note_vel = int(50 + vel_factor * 75)
                                synth.start_or_update_note(active_pitch, velocity=note_vel)
                                synth.set_expression(vel_factor, vibrato_cents=vibrato_cents)
                                acc_engine.visualizer.trigger_note(active_pitch, note_vel)

                                for _ in range(2):
                                    rosin_particles.append(RosinParticle(bx, by, s_def["color"]))
                            else:
                                synth.stop_tone()
                else:
                    synth.stop_tone()
            else:
                synth.stop_tone()

            # Draw 4 Violin Strings across screen
            for i, sy in enumerate(string_ys):
                s_def = VIOLIN_STRINGS[i]
                is_sel = (i == active_string_idx)
                col = s_def["color"] if is_sel else (140, 140, 160)
                th = 3 if is_sel and is_bowing else (2 if is_sel else 1)
                if is_sel and is_bowing:
                    vib_offset = int(math.sin(anim_tick * 0.9 + i) * 3)
                    sy += vib_offset
                cv2.line(canvas, (int(w_canv * 0.22), sy), (int(w_canv * 0.85), sy), col, th)

            # Draw Bow
            if right_bow_pos is not None:
                bx, by = right_bow_pos
                bow_len = 340
                bow_p1 = (bx - bow_len // 2, by)
                bow_p2 = (bx + bow_len // 2, by)
                cv2.line(canvas, bow_p1, bow_p2, (60, 90, 180), 6)
                cv2.line(canvas, bow_p1, bow_p2, (240, 240, 255), 2)
                cv2.circle(canvas, (bx, by), 7, (0, 240, 255), -1)

            # Rosin dust
            for rp in list(rosin_particles):
                rp.update()
                rp.draw(canvas)
                if rp.life <= 0:
                    rosin_particles.remove(rp)

            s_def = VIOLIN_STRINGS[active_string_idx]
            active_pitch = s_def["notes"][min(len(s_def["notes"]) - 1, max(0, left_finger_count))]

            canvas = draw_violin_hud(canvas, synth, active_string_idx, active_pitch,
                                     bow_speed, is_bowing, expression_label, anim_tick,
                                     team_btn_rect=team_btn_rect, acc_engine=acc_engine)

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
                synth.next_timbre()
            elif key == ord('1'):
                synth.set_timbre(0)
            elif key == ord('2'):
                synth.set_timbre(1)
            elif key == ord('3'):
                synth.set_timbre(2)

    cap.release()
    cv2.destroyAllWindows()
    acc_engine.stop()
    synth.stop()
    print("Air Violin Studio exited cleanly.")


if __name__ == '__main__':
    main()
