"""
AI Maestro Studio - Air Grand Piano (البيانو الهوائي)
======================================================
Features:
- Multi-hand & 10-finger polyphony (play chords with both hands)
- 2 Full Octaves (14 White Keys + 10 Black Keys: C4 to B5)
- Velocity-sensitive natural key press & release mechanics
- Instant acoustic sound via FluidSynth & General MIDI
- Multiple Instrument presets: Grand Piano, Electric Piano, Harpsichord, Organ, Strings
- Real-time visual key illumination, ripple particles, and chord detection
- Integrated Luxury Team Showcase Modal ([T] or click button)
- Fullscreen toggle via [F], Quit via [Q] / [ESC]
"""

import os
import sys
import time
import math
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

INSTRUMENTS = [
    ("Grand Piano", 0),
    ("Electric Piano", 4),
    ("Harpsichord", 6),
    ("Church Organ", 19),
    ("Pizzicato Strings", 45),
]

WHITE_NOTE_DEFS = [
    ("C4", "Do", 60),
    ("D4", "Re", 62),
    ("E4", "Mi", 64),
    ("F4", "Fa", 65),
    ("G4", "Sol", 67),
    ("A4", "La", 69),
    ("B4", "Si", 71),
    ("C5", "Do", 72),
    ("D5", "Re", 74),
    ("E5", "Mi", 76),
    ("F5", "Fa", 77),
    ("G5", "Sol", 79),
    ("A5", "La", 81),
    ("B5", "Si", 83),
]

BLACK_NOTE_DEFS = [
    ("C#4", 61, 0),
    ("D#4", 63, 1),
    ("F#4", 66, 3),
    ("G#4", 68, 4),
    ("A#4", 70, 5),
    ("C#5", 73, 7),
    ("D#5", 75, 8),
    ("F#5", 78, 10),
    ("G#5", 80, 11),
    ("A#5", 82, 12),
]

FINGERTIP_IDS = [4, 8, 12, 16, 20]


class PianoSynth:
    def __init__(self, soundfont_path):
        self.fs = fluidsynth.Synth(gain=0.7)
        self.fs.setting('synth.polyphony', 128)
        self.fs.setting('synth.cpu-cores', 4)

        driver = 'coreaudio' if sys.platform == 'darwin' else 'dsound'
        try:
            self.fs.start(driver=driver)
        except Exception:
            self.fs.start()

        self.sfid = self.fs.sfload(soundfont_path)
        self.current_inst_idx = 0
        self.set_instrument(0)

    def set_instrument(self, idx):
        self.current_inst_idx = idx % len(INSTRUMENTS)
        _, prog = INSTRUMENTS[self.current_inst_idx]
        self.fs.program_select(0, self.sfid, 0, prog)

    def next_instrument(self):
        self.set_instrument(self.current_inst_idx + 1)

    def note_on(self, pitch, velocity=100):
        self.fs.noteon(0, pitch, velocity)

    def note_off(self, pitch):
        self.fs.noteoff(0, pitch)

    def all_notes_off(self):
        self.fs.system_reset()
        self.set_instrument(self.current_inst_idx)

    def stop(self):
        self.all_notes_off()
        self.fs.delete()


class PianoKeyboard:
    def __init__(self, frame_w, frame_h):
        self.frame_w = frame_w
        self.frame_h = frame_h
        self.white_keys = []
        self.black_keys = []
        self._build_layout()

    def _build_layout(self):
        self.white_keys = []
        self.black_keys = []

        margin_x = 24
        kb_w = self.frame_w - (2 * margin_x)
        num_white = len(WHITE_NOTE_DEFS)
        key_w = kb_w // num_white
        total_kb_w = key_w * num_white
        start_x = (self.frame_w - total_kb_w) // 2

        kb_h = int(self.frame_h * 0.38)
        y1_white = self.frame_h - kb_h - 18
        y2_white = self.frame_h - 18

        for i, (name, solfege, pitch) in enumerate(WHITE_NOTE_DEFS):
            x1 = start_x + (i * key_w)
            x2 = x1 + key_w
            self.white_keys.append({
                'idx': i,
                'name': name,
                'solfege': solfege,
                'pitch': pitch,
                'rect': (x1, y1_white, x2, y2_white),
                'pressed': False,
            })

        black_w = int(key_w * 0.62)
        black_h = int(kb_h * 0.60)
        y1_black = y1_white
        y2_black = y1_white + black_h

        for name, pitch, white_idx in BLACK_NOTE_DEFS:
            boundary_x = start_x + ((white_idx + 1) * key_w)
            bx1 = boundary_x - (black_w // 2)
            bx2 = bx1 + black_w
            self.black_keys.append({
                'name': name,
                'pitch': pitch,
                'rect': (bx1, y1_black, bx2, y2_black),
                'pressed': False,
            })

    def reset_presses(self):
        for k in self.white_keys:
            k['pressed'] = False
        for k in self.black_keys:
            k['pressed'] = False

    def hit_test(self, x, y):
        for k in self.black_keys:
            x1, y1, x2, y2 = k['rect']
            if x1 <= x <= x2 and y1 <= y <= y2:
                return k, 'black'
        for k in self.white_keys:
            x1, y1, x2, y2 = k['rect']
            if x1 <= x <= x2 and y1 <= y <= y2:
                return k, 'white'
        return None, None

    def draw(self, canvas, ripples):
        overlay = canvas.copy()
        for w in self.white_keys:
            x1, y1, x2, y2 = w['rect']
            if w['pressed']:
                cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 230, 0), -1)
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (255, 255, 100), 2)
            else:
                cv2.rectangle(overlay, (x1 + 1, y1), (x2 - 1, y2), (242, 245, 250), -1)
                cv2.rectangle(overlay, (x1 + 1, y2 - 20), (x2 - 1, y2), (210, 215, 225), -1)
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (120, 130, 145), 1)

            cv2.putText(canvas, w['name'], (x1 + (x2 - x1) // 2 - 12, y2 - 26),
                        cv2.FONT_HERSHEY_DUPLEX, 0.44, (20, 25, 35) if not w['pressed'] else (0, 0, 0), 1)
            cv2.putText(canvas, w['solfege'], (x1 + (x2 - x1) // 2 - 10, y2 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (90, 100, 120) if not w['pressed'] else (0, 0, 0), 1)

        cv2.addWeighted(overlay, 0.88, canvas, 0.12, 0, canvas)

        for b in self.black_keys:
            x1, y1, x2, y2 = b['rect']
            if b['pressed']:
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (255, 100, 220), -1)
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (255, 255, 255), 2)
                cv2.putText(canvas, b['name'], (x1 + 3, y2 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (0, 0, 0), 1)
            else:
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (22, 22, 26), -1)
                cv2.rectangle(canvas, (x1, y2 - 10), (x2, y2), (38, 38, 44), -1)
                cv2.rectangle(canvas, (x1, y1), (x2, y2), (10, 10, 15), 1)
                cv2.putText(canvas, b['name'], (x1 + 3, y2 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (160, 160, 175), 1)

        for r in list(ripples):
            cx, cy, radius, max_r, col = r
            alpha = max(0.0, 1.0 - (radius / float(max_r)))
            if alpha > 0.05:
                overlay_rip = canvas.copy()
                cv2.circle(overlay_rip, (cx, cy), int(radius), col, 2)
                cv2.addWeighted(overlay_rip, alpha * 0.7, canvas, 1 - alpha * 0.7, 0, canvas)
                r[2] += 3
            else:
                ripples.remove(r)


def draw_hud(canvas, synth, active_pitches_str, total_notes_played, team_btn_rect=(0, 0, 0, 0), acc_engine=None):
    h, w = canvas.shape[:2]

    # Top Cinema Ribbon
    draw_glass_panel(canvas, 0, 0, w, 68, (18, 12, 8), 0.90)
    cv2.line(canvas, (0, 68), (w, 68), (212, 182, 6), 2)
    cv2.line(canvas, (0, 71), (w, 71), (0, 215, 255), 1)

    cv2.putText(canvas, "AIR PIANO STUDIO", (25, 30), cv2.FONT_HERSHEY_DUPLEX, 0.75, (212, 182, 6), 2)
    inst_name, _ = INSTRUMENTS[synth.current_inst_idx]
    cv2.putText(canvas, f"Instrument: {inst_name} ([1-5] / TAB to change)", (25, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 220, 240), 1)

    if active_pitches_str:
        box_w = 300
        bx1 = (w - box_w) // 2
        draw_glass_panel(canvas, bx1, 10, bx1 + box_w, 55, (28, 20, 14), 0.90)
        cv2.rectangle(canvas, (bx1, 10), (bx1 + box_w, 55), (212, 182, 6), 2)
        text_sz = cv2.getTextSize(active_pitches_str, cv2.FONT_HERSHEY_DUPLEX, 0.65, 2)[0]
        tx = bx1 + (box_w - text_sz[0]) // 2
        cv2.putText(canvas, active_pitches_str, (tx, 38), cv2.FONT_HERSHEY_DUPLEX, 0.65, (238, 211, 34), 2)

    # Team Showcase Button
    canvas = draw_team_button(canvas, team_btn_rect)

    status_r = f"Notes: {total_notes_played}  |  [F] Fullscreen  |  [Q] Quit"
    sz_r = cv2.getTextSize(status_r, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)[0]
    cv2.putText(canvas, status_r, (team_btn_rect[0] - sz_r[0] - 20, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 200, 220), 1)

    # Phase 3: Accompaniment HUD & 16-Band Audio Spectrum Equalizer
    if acc_engine is not None:
        acc_engine.draw_hud_panel(canvas, 24, 78, width=280, height=125)
        acc_engine.visualizer.draw(canvas, w - 290, 78, width=265, height=125, title="16-BAND AUDIO SPECTRUM")

    return canvas


def main():
    synth = PianoSynth(SOUNDFONT_PATH)

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
    window_name = "AI Maestro Studio - Air Grand Piano"
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

    keyboard = None
    finger_states = {}
    ripples = []
    total_notes_played = 0
    is_fullscreen = False
    acc_engine = AccompanimentEngine(initial_bpm=100)

    with HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)
            canvas = cv2.resize(frame, (1280, 720))
            h, w = canvas.shape[:2]
            team_btn_rect = (w - 230, 12, w - 25, 52)
            mouse_params['team_btn'] = team_btn_rect

            if keyboard is None:
                keyboard = PianoKeyboard(w, h)

            keyboard.reset_presses()
            active_pitches_this_frame = set()
            current_frame_fingers = set()

            if not team_modal.is_open:
                mp_small = cv2.resize(canvas, (640, 360))
                rgb_small = cv2.cvtColor(mp_small, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)
                results = landmarker.detect(mp_img)
                now_t = time.time()

                if results.hand_landmarks and results.handedness:
                    for hand_lms, handedness in zip(results.hand_landmarks, results.handedness):
                        hand_label = handedness[0].category_name
                        for tip_id in FINGERTIP_IDS:
                            lm = hand_lms[tip_id]
                            tx = int(lm.x * w)
                            ty = int(lm.y * h)
                            finger_key = (hand_label, tip_id)
                            current_frame_fingers.add(finger_key)

                            state = finger_states.get(finger_key, {'prev_y': ty, 'pressed_pitch': None, 'prev_t': now_t})
                            vy = ty - state['prev_y']
                            state['prev_y'] = ty
                            state['prev_t'] = now_t

                            hit_key, key_type = keyboard.hit_test(tx, ty)

                            if hit_key is not None:
                                pitch = hit_key['pitch']
                                y1_rect = hit_key['rect'][1]

                                if state['pressed_pitch'] is None and (vy >= 1 or ty > y1_rect + 25):
                                    vel = min(125, max(70, int(75 + vy * 5)))
                                    synth.note_on(pitch, vel)
                                    acc_engine.visualizer.trigger_note(pitch, vel)
                                    state['pressed_pitch'] = pitch
                                    total_notes_played += 1
                                    rip_col = (0, 255, 255) if key_type == 'white' else (255, 120, 255)
                                    ripples.append([tx, ty, 6, 45, rip_col])

                                if state['pressed_pitch'] == pitch:
                                    hit_key['pressed'] = True
                                    active_pitches_this_frame.add(hit_key['name'])

                                cv2.circle(canvas, (tx, ty), 9, (0, 255, 255) if key_type == 'white' else (255, 100, 255), -1)
                                cv2.circle(canvas, (tx, ty), 15, (255, 255, 255), 2)
                            else:
                                if state['pressed_pitch'] is not None:
                                    synth.note_off(state['pressed_pitch'])
                                    state['pressed_pitch'] = None

                                cv2.circle(canvas, (tx, ty), 6, (0, 230, 90), -1)
                                cv2.circle(canvas, (tx, ty), 10, (255, 255, 255), 1)

                            finger_states[finger_key] = state

                for f_key in list(finger_states.keys()):
                    if f_key not in current_frame_fingers:
                        if finger_states[f_key]['pressed_pitch'] is not None:
                            synth.note_off(finger_states[f_key]['pressed_pitch'])
                        del finger_states[f_key]

            active_str = " + ".join(sorted(list(active_pitches_this_frame))) if active_pitches_this_frame else ""

            keyboard.draw(canvas, ripples)
            canvas = draw_hud(canvas, synth, active_str, total_notes_played, team_btn_rect=team_btn_rect, acc_engine=acc_engine)

            status_bar_left = f"AIR PIANO | [B] Backing Beat ({acc_engine.current_style_info()['name_en']}) | [S] Style | [+/-] BPM | [1-5] Timbre"
            status_bar_right = "[T] Team | [F] Full | [Q] Quit"
            canvas = draw_bottom_bar(canvas, status_bar_left, status_bar_right)

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
                synth.next_instrument()
            elif key == ord('1'):
                synth.set_instrument(0)
            elif key == ord('2'):
                synth.set_instrument(1)
            elif key == ord('3'):
                synth.set_instrument(2)
            elif key == ord('4'):
                synth.set_instrument(3)
            elif key == ord('5'):
                synth.set_instrument(4)
            elif key == 32:  # Spacebar
                synth.all_notes_off()

    cap.release()
    cv2.destroyAllWindows()
    acc_engine.stop()
    synth.stop()
    print("Air Piano Studio exited cleanly.")


if __name__ == '__main__':
    main()
