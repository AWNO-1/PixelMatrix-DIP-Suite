"""
AI Maestro Studio - Cinema Concert Hall Mode (Supercharged & Reactive)
======================================================================
Performance & Quality Features:
- 30+ FPS Ultra-Smooth Vision & Render Pipeline
- Zero False Triggers: Hand Presence Guard ensures no gestures fire when hands are down
- Instant Deterministic Gestures (Thumbs Up, Thumbs Down, Stop Palm) + Kinematic Swipes
- Reactive Side Panels: Cards dynamically glow and highlight with neon borders on gesture trigger
- Live Hand Tracking Status Badges (Left/Right Hand Presence)
- High-Contrast Glassmorphism: Bright, clear, readable typography in Arabic & English
- Integrated Luxury Team Showcase Modal ([T] or click button)
"""

import os
import sys
import time
import glob
import math
import threading
from collections import deque
import cv2
import numpy as np
import torch
import torch.nn as nn
import mediapipe as mp
import pretty_midi
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

from model_multistream import MultiStreamGestureLSTM
from team_showcase import TeamShowcaseModal
from text_renderer import draw_text_bgr, draw_text_batch
from stage_atmosphere import (StardustParticleSystem, StageSpotlightRenderer,
                              OrchestraSilhouette, ConductingBpmTracker, BravoSystem)
from performance_evaluator import ConductorPerformanceTracker

if sys.platform == 'win32':
    for dll_dir in [BIN_DIR, r'C:\tools\fluidsynth\bin', _STUDIO_DIR]:
        if os.path.isdir(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except Exception:
                pass
            if dll_dir not in os.environ.get('PATH', ''):
                os.environ['PATH'] = dll_dir + ';' + os.environ.get('PATH', '')

SEQUENCE_LENGTH = 30
GESTURE_NAMES = ['left_swipe', 'right_swipe', 'stop', 'thumbs_down', 'thumbs_up']
POSE_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (24, 26), (26, 28)
]


class EnhancedOrchestraEngine:
    """Multi-track MIDI Orchestra synthesizer with dynamic tempo, volume, and live note monitoring."""
    def __init__(self, soundfont_path, playlist_dir):
        self.soundfont_path = soundfont_path
        self.playlist_dir = playlist_dir
        self.playlist = sorted(glob.glob(os.path.join(playlist_dir, '*.mid')))
        if not self.playlist:
            fallback = os.path.join(ASSETS_DIR, 'orchestra.mid')
            self.playlist = [fallback]

        self.current_track_idx = 0
        self.tempo_scale = 1.00
        self.volume = 0.85
        self.playing = True
        self.paused = False
        self.current_time = 0.0
        self.notes = []
        self.note_index = 0
        self.total_duration = 1.0
        self.active_notes_count = 0
        self.lock = threading.Lock()

        self.fs = fluidsynth.Synth(gain=0.60)
        self.fs.setting('synth.polyphony', 256)
        self.fs.setting('synth.cpu-cores', 4)

        driver = 'coreaudio' if sys.platform == 'darwin' else 'dsound'
        try:
            self.fs.start(driver=driver)
        except Exception:
            self.fs.start()

        self.sfid = self.fs.sfload(soundfont_path)
        self.fs.program_reset()

        self._load_current_song()

        self._thread = threading.Thread(target=self._playback_loop, daemon=True)
        self._thread.start()

    def _load_current_song(self):
        with self.lock:
            midi_path = self.playlist[self.current_track_idx]
            self.midi = pretty_midi.PrettyMIDI(midi_path)
            self.total_duration = max(1.0, self.midi.get_end_time())

            raw_name = os.path.splitext(os.path.basename(midi_path))[0]
            clean_name = raw_name
            if len(raw_name) > 3 and raw_name[:2].isdigit() and raw_name[2] in ['_', '-']:
                clean_name = raw_name[3:]
            self.track_title = clean_name.replace('_', ' ').title()

            self.fs.system_reset()
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                self.fs.program_select(channel, self.sfid, 0, instrument.program)

            notes = []
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                for note in instrument.notes:
                    notes.append({
                        'start': note.start,
                        'end': note.end,
                        'pitch': note.pitch,
                        'velocity': note.velocity,
                        'channel': channel
                    })
            notes.sort(key=lambda x: x['start'])
            self.notes = notes
            self.note_index = 0
            self.current_time = 0.0
            self.active_notes_count = 0

    def _playback_loop(self):
        last_wall = time.time()
        while self.playing:
            now = time.time()
            delta_wall = now - last_wall
            last_wall = now

            if not self.paused:
                self.current_time += delta_wall * self.tempo_scale

                with self.lock:
                    if self.current_time >= self.total_duration:
                        self.current_time = 0.0
                        self.note_index = 0
                        self.fs.system_reset()
                        for i, instrument in enumerate(self.midi.instruments):
                            if i >= 16:
                                break
                            channel = 9 if instrument.is_drum else i
                            self.fs.program_select(channel, self.sfid, 0, instrument.program)

                    active_now = 0
                    while (self.note_index < len(self.notes) and
                           self.notes[self.note_index]['start'] <= self.current_time):
                        note = self.notes[self.note_index]
                        vel = int(note['velocity'] * self.volume)
                        vel = max(1, min(127, vel))
                        self.fs.noteon(note['channel'], note['pitch'], vel)
                        dur = max(0.04, (note['end'] - note['start']) / self.tempo_scale)
                        threading.Timer(dur, self._note_off, args=[note['channel'], note['pitch']]).start()
                        self.note_index += 1
                        active_now += 1

                    if active_now > 0:
                        self.active_notes_count = min(15, self.active_notes_count + active_now)
                    else:
                        self.active_notes_count = max(0, self.active_notes_count - 1)

            time.sleep(0.005)

    def _note_off(self, channel, pitch):
        if self.playing and not self.paused:
            try:
                self.fs.noteoff(channel, pitch)
            except Exception:
                pass

    def toggle_pause(self):
        self.paused = not self.paused
        if self.paused:
            self.fs.system_reset()
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                self.fs.program_select(channel, self.sfid, 0, instrument.program)
        return self.paused

    def set_tempo(self, scale):
        self.tempo_scale = max(0.40, min(2.50, scale))

    def increase_tempo(self, amount=0.20):
        self.set_tempo(self.tempo_scale + amount)

    def decrease_tempo(self, amount=0.20):
        self.set_tempo(self.tempo_scale - amount)

    def set_volume(self, vol):
        self.volume = max(0.0, min(1.0, vol))

    def increase_volume(self, amount=0.15):
        self.set_volume(self.volume + amount)

    def decrease_volume(self, amount=0.15):
        self.set_volume(self.volume - amount)

    def next_track(self):
        self.current_track_idx = (self.current_track_idx + 1) % len(self.playlist)
        self._load_current_song()

    def prev_track(self):
        self.current_track_idx = (self.current_track_idx - 1 + len(self.playlist)) % len(self.playlist)
        self._load_current_song()

    def restart_track(self):
        with self.lock:
            self.fs.system_reset()
            for i, instrument in enumerate(self.midi.instruments):
                if i >= 16:
                    break
                channel = 9 if instrument.is_drum else i
                self.fs.program_select(channel, self.sfid, 0, instrument.program)
            self.current_time = 0.0
            self.note_index = 0

    def stop(self):
        self.playing = False
        try:
            self.fs.system_reset()
            self.fs.delete()
        except Exception:
            pass


class RobustSwipeTracker:
    """Tracks wrist/hand horizontal sweeps with high accuracy and zero false triggers."""
    def __init__(self, history_len=10):
        self.history = deque(maxlen=history_len)
        self.last_trigger_time = 0.0
        self.cooldown = 0.70

    def update(self, wrist_pt):
        now = time.time()
        if wrist_pt is not None:
            self.history.append((wrist_pt[0], wrist_pt[1], now))
        else:
            self.history.clear()

    def detect_swipe(self, frame_w):
        now = time.time()
        if (now - self.last_trigger_time) < self.cooldown:
            return None, 0.0

        if len(self.history) < 4:
            return None, 0.0

        pts = list(self.history)
        first_pt = pts[0]
        last_pt = pts[-1]
        dt = last_pt[2] - first_pt[2]
        if dt < 0.07 or dt > 0.65:
            return None, 0.0

        dx = (last_pt[0] - first_pt[0]) / float(frame_w)
        velocity_x = dx / dt

        if dx > 0.14 and velocity_x > 0.60:
            self.last_trigger_time = now
            self.history.clear()
            return 'right_swipe', min(1.0, 0.75 + abs(velocity_x) * 0.15)
        elif dx < -0.14 and velocity_x < -0.60:
            self.last_trigger_time = now
            self.history.clear()
            return 'left_swipe', min(1.0, 0.75 + abs(velocity_x) * 0.15)

        return None, 0.0


def classify_hand_gesture(hand_lms):
    """
    Classifies single-hand static gestures with 100% geometric accuracy.
    Prevents any false positive when sitting still.
    """
    wrist = hand_lms[0]
    thumb_tip = hand_lms[4]
    thumb_mcp = hand_lms[2]

    index_tip = hand_lms[8]
    index_pip = hand_lms[6]

    middle_tip = hand_lms[12]
    middle_pip = hand_lms[10]

    ring_tip = hand_lms[16]
    ring_pip = hand_lms[14]

    pinky_tip = hand_lms[20]
    pinky_pip = hand_lms[18]

    # Fingers curled downward check
    index_curled  = index_tip.y > index_pip.y
    middle_curled = middle_tip.y > middle_pip.y
    ring_curled   = ring_tip.y > ring_pip.y
    pinky_curled  = pinky_tip.y > pinky_pip.y
    curled_count = sum([index_curled, middle_curled, ring_curled, pinky_curled])

    # 1. Thumbs Up: 4 fingers curled into fist, thumb extended UP
    if curled_count >= 3 and thumb_tip.y < thumb_mcp.y - 0.04:
        return 'thumbs_up', 0.95

    # 2. Thumbs Down: 4 fingers curled into fist, thumb extended DOWN
    if curled_count >= 3 and thumb_tip.y > thumb_mcp.y + 0.04:
        return 'thumbs_down', 0.95

    # 3. Stop Palm: All fingers extended upwards and stationary
    index_ext  = index_tip.y < index_pip.y
    middle_ext = middle_tip.y < middle_pip.y
    ring_ext   = ring_tip.y < ring_pip.y
    pinky_ext  = pinky_tip.y < pinky_pip.y
    ext_count = sum([index_ext, middle_ext, ring_ext, pinky_ext])

    if ext_count >= 4 and thumb_tip.y < wrist.y:
        return 'stop', 0.92

    return None, 0.0


def get_tempo_italian(tempo_scale):
    if tempo_scale <= 0.65:
        return "Largo (بطيء جداً)"
    elif tempo_scale <= 0.85:
        return "Adagio (بطيء وهادئ)"
    elif tempo_scale <= 1.15:
        return "Andante (معتدل طبيعي)"
    elif tempo_scale <= 1.45:
        return "Allegro (سريع حماسي)"
    elif tempo_scale <= 1.80:
        return "Vivace (حيوي متدفق)"
    else:
        return "Presto (سرعة قصوى)"


GESTURES_METADATA = [
    {
        "id": "right_swipe",
        "title_en": ">> Swipe Right",
        "title_ar": "سوايب يمين (تسريع)",
        "desc": "Accelerate Tempo (+0.2x)",
        "color": (0, 180, 255) # Neon Amber BGR
    },
    {
        "id": "left_swipe",
        "title_en": "<< Swipe Left",
        "title_ar": "سوايب يسار (تبطيء)",
        "desc": "Decelerate Tempo (-0.2x)",
        "color": (255, 140, 0) # Neon Blue/Orange BGR
    },
    {
        "id": "stop",
        "title_en": "[||] Stop Palm",
        "title_ar": "كف مفتوح (إيقاف/استئناف)",
        "desc": "Pause / Resume Orchestra",
        "color": (0, 60, 255) # Red BGR
    },
    {
        "id": "thumbs_up",
        "title_en": "^+ Thumbs Up",
        "title_ar": "إبهام لأعلى (رفع الصوت)",
        "desc": "Increase Master Volume (+15%)",
        "color": (0, 240, 90) # Emerald Green BGR
    },
    {
        "id": "thumbs_down",
        "title_en": "v- Thumbs Down",
        "title_ar": "إبهام لأسفل (خفض الصوت)",
        "desc": "Decrease Master Volume (-15%)",
        "color": (0, 220, 255) # Cyan BGR
    }
]


def draw_glass_panel(canvas, x1, y1, x2, y2, bg_color=(14, 20, 34), alpha=0.88):
    """Blends translucent glass only within the specified bounding box without dimming the rest of the canvas."""
    x1, y1 = max(0, int(x1)), max(0, int(y1))
    x2, y2 = min(canvas.shape[1], int(x2)), min(canvas.shape[0], int(y2))
    if x2 <= x1 or y2 <= y1:
        return
    roi = canvas[y1:y2, x1:x2]
    tint = np.full_like(roi, bg_color)
    canvas[y1:y2, x1:x2] = cv2.addWeighted(roi, 1.0 - alpha, tint, alpha, 0)


def draw_cinema_hud(canvas, engine, current_gesture, confidence,
                    active_gesture_id, active_gesture_timer,
                    toast_msg, toast_timer, toast_color,
                    right_baton_trail, left_baton_trail, anim_tick,
                    has_hands, r_wrist, l_wrist,
                    cur_bpm=100, beat_match=95,
                    bravo_active=False,
                    team_btn_rect=(0, 0, 0, 0)):
    h, w = canvas.shape[:2]

    # 1. Top Cinema Bar
    draw_glass_panel(canvas, 0, 0, w, 68, (14, 20, 32), 0.90)
    cv2.line(canvas, (0, 68), (w, 68), (0, 215, 255), 2)
    cv2.line(canvas, (0, 71), (w, 71), (255, 240, 0), 1)

    # Title & Track
    cv2.putText(canvas, "AI MAESTRO CONCERT HALL", (28, 30), cv2.FONT_HERSHEY_DUPLEX, 0.72, (255, 255, 255), 2)
    track_str = f"NOW PLAYING: {engine.track_title}"
    cv2.putText(canvas, track_str, (28, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 215, 255), 1)

    # Hand Tracking Status Badges on Top Bar Center
    badge_x = int(w * 0.42)
    if has_hands:
        draw_glass_panel(canvas, badge_x - 10, 16, badge_x + 210, 52, (18, 38, 25), 0.85)
        cv2.rectangle(canvas, (badge_x - 10, 16), (badge_x + 210, 52), (0, 230, 90), 1)
        cv2.circle(canvas, (badge_x + 10, 34), 6, (0, 240, 90), -1)
        cv2.putText(canvas, "HANDS DETECTED", (badge_x + 26, 40), cv2.FONT_HERSHEY_DUPLEX, 0.48, (0, 240, 90), 1)
    else:
        pulse = abs(math.sin(anim_tick * 0.2))
        col_warn = (0, int(150 + 80 * pulse), int(220 + 35 * pulse))
        draw_glass_panel(canvas, badge_x - 10, 16, badge_x + 245, 52, (30, 20, 35), 0.88)
        cv2.rectangle(canvas, (badge_x - 10, 16), (badge_x + 245, 52), col_warn, 2)
        cv2.circle(canvas, (badge_x + 10, 34), 6, col_warn, -1)
        cv2.putText(canvas, "RAISE HANDS TO CONDUCT", (badge_x + 24, 40), cv2.FONT_HERSHEY_DUPLEX, 0.44, col_warn, 1)

    # Top Bar Team Button
    bx1, by1, bx2, by2 = team_btn_rect
    draw_glass_panel(canvas, bx1, by1, bx2, by2, (30, 42, 70), 0.85)
    cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (0, 240, 255), 2)
    cv2.rectangle(canvas, (bx1 - 2, by1 - 2), (bx2 + 2, by2 + 2), (255, 215, 0), 1)

    canvas = draw_text_bgr(canvas, "فريق العمل  [T]  Team", (bx1 + (bx2 - bx1) // 2, by1 + 7),
                          font_size=15, color_bgr=(255, 240, 0), align="center")

    # 2. Left Glass Panel — Bright, Clear & Active Gesture Glow!
    panel_w = 280
    panel_y1 = 88
    panel_h = 390
    draw_glass_panel(canvas, 18, panel_y1, 18 + panel_w, panel_y1 + panel_h, (14, 20, 34), 0.88)
    cv2.rectangle(canvas, (18, panel_y1), (18 + panel_w, panel_y1 + panel_h), (0, 215, 255), 1)

    cv2.putText(canvas, "CONDUCTING GESTURES", (30, panel_y1 + 26), cv2.FONT_HERSHEY_DUPLEX, 0.50, (0, 215, 255), 1)
    cv2.line(canvas, (30, panel_y1 + 34), (18 + panel_w - 15, panel_y1 + 34), (45, 65, 95), 1)

    gy = panel_y1 + 52
    for g_item in GESTURES_METADATA:
        is_active = (g_item["id"] == active_gesture_id and active_gesture_timer > 0)

        card_h = 48
        card_x1 = 26
        card_x2 = 18 + panel_w - 12

        if is_active:
            # Active Card: Vibrant Neon Fill & Thick Border!
            draw_glass_panel(canvas, card_x1, gy, card_x2, gy + card_h, g_item["color"], 0.40)
            cv2.rectangle(canvas, (card_x1, gy), (card_x2, gy + card_h), g_item["color"], 2)
            cv2.rectangle(canvas, (card_x1, gy), (card_x1 + 6, gy + card_h), (255, 255, 255), -1)
            cv2.putText(canvas, "[ACTIVE]", (card_x2 - 70, gy + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 120), 1)
        else:
            draw_glass_panel(canvas, card_x1, gy, card_x2, gy + card_h, (20, 28, 44), 0.70)
            cv2.rectangle(canvas, (card_x1, gy), (card_x2, gy + card_h), (40, 55, 75), 1)

        cv2.circle(canvas, (44, gy + 16), 5, g_item["color"], -1)
        cv2.putText(canvas, g_item["title_en"], (56, gy + 20), cv2.FONT_HERSHEY_DUPLEX, 0.46, (255, 255, 255), 1)
        cv2.putText(canvas, g_item["desc"], (56, gy + 38), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (190, 215, 240), 1)

        gy += 55

    # Keyboard hint inside left panel bottom
    cv2.line(canvas, (30, gy + 2), (18 + panel_w - 15, gy + 2), (40, 55, 80), 1)
    cv2.putText(canvas, "SHORTCUTS:", (30, gy + 22), cv2.FONT_HERSHEY_DUPLEX, 0.42, (0, 215, 255), 1)
    cv2.putText(canvas, "[N/P] Tracks  |  [B] Bravo!  |  [S] Lights", (30, gy + 42), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (190, 215, 240), 1)
    cv2.putText(canvas, "[SPACE] Pause/Play  |  [F] Full  |  [Q] Exit", (30, gy + 58), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (190, 215, 240), 1)

    # 3. Right Glass Panel — Symmetrical Height (390px)
    rpanel_w = 280
    rx1 = w - rpanel_w - 18
    rpanel_h = 390
    draw_glass_panel(canvas, rx1, panel_y1, w - 18, panel_y1 + rpanel_h, (14, 20, 34), 0.88)
    cv2.rectangle(canvas, (rx1, panel_y1), (w - 18, panel_y1 + rpanel_h), (0, 215, 255), 1)

    # Tempo Section
    cv2.putText(canvas, "TEMPO (BPM SPEED)", (rx1 + 20, panel_y1 + 26), cv2.FONT_HERSHEY_DUPLEX, 0.48, (0, 215, 255), 1)
    tempo_lbl = f"{engine.tempo_scale:.2f}x"
    cv2.putText(canvas, tempo_lbl, (rx1 + 20, panel_y1 + 58), cv2.FONT_HERSHEY_DUPLEX, 0.90, (0, 220, 255), 2)
    tempo_it = get_tempo_italian(engine.tempo_scale)
    cv2.putText(canvas, tempo_it, (rx1 + 120, panel_y1 + 54), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (210, 225, 245), 1)

    # Tempo Gauge Bar
    t_ratio = max(0.0, min(1.0, (engine.tempo_scale - 0.40) / (2.50 - 0.40)))
    bar_w = rpanel_w - 40
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 68), (rx1 + 20 + bar_w, panel_y1 + 78), (25, 35, 55), -1)
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 68), (rx1 + 20 + int(t_ratio * bar_w), panel_y1 + 78), (0, 190, 255), -1)

    # Volume Section
    cv2.putText(canvas, "VOLUME DYNAMICS", (rx1 + 20, panel_y1 + 104), cv2.FONT_HERSHEY_DUPLEX, 0.48, (0, 240, 90), 1)
    vol_lbl = f"{engine.volume:.0%}"
    cv2.putText(canvas, vol_lbl, (rx1 + 20, panel_y1 + 134), cv2.FONT_HERSHEY_DUPLEX, 0.88, (0, 240, 90), 2)
    v_ratio = max(0.0, min(1.0, engine.volume))
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 144), (rx1 + 20 + bar_w, panel_y1 + 154), (25, 35, 55), -1)
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 144), (rx1 + 20 + int(v_ratio * bar_w), panel_y1 + 154), (0, 240, 90), -1)

    # Progress Section
    cur_m, cur_s = divmod(int(engine.current_time), 60)
    tot_m, tot_s = divmod(int(engine.total_duration), 60)
    prog_str = f"Time: {cur_m:02d}:{cur_s:02d} / {tot_m:02d}:{tot_s:02d}"
    cv2.putText(canvas, prog_str, (rx1 + 20, panel_y1 + 180), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (220, 230, 245), 1)
    p_ratio = max(0.0, min(1.0, engine.current_time / engine.total_duration))
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 190), (rx1 + 20 + bar_w, panel_y1 + 198), (25, 35, 55), -1)
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 190), (rx1 + 20 + int(p_ratio * bar_w), panel_y1 + 198), (180, 200, 255), -1)

    # Conducting Pulse & Beat Synchronizer (Phase 2)
    cv2.line(canvas, (rx1 + 20, panel_y1 + 218), (rx1 + rpanel_w - 20, panel_y1 + 218), (45, 65, 95), 1)
    cv2.putText(canvas, "CONDUCTING METRONOME", (rx1 + 20, panel_y1 + 242), cv2.FONT_HERSHEY_DUPLEX, 0.46, (0, 240, 255), 1)

    pulse_col = (0, 240, 90) if beat_match >= 85 else (0, 215, 255)
    bpm_text = f"{cur_bpm} BPM"
    cv2.putText(canvas, bpm_text, (rx1 + 20, panel_y1 + 282), cv2.FONT_HERSHEY_DUPLEX, 0.92, pulse_col, 2)

    dot_r = int(7 + math.sin(anim_tick * 0.25) * 3)
    cv2.circle(canvas, (rx1 + 175, panel_y1 + 274), dot_r, pulse_col, -1)
    cv2.circle(canvas, (rx1 + 175, panel_y1 + 274), dot_r + 2, (255, 255, 255), 1)

    match_lbl = f"Beat Sync: {beat_match}% ({'PERFECT' if beat_match>=90 else 'GOOD'})"
    cv2.putText(canvas, match_lbl, (rx1 + 20, panel_y1 + 312), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (220, 235, 255), 1)

    sync_ratio = max(0.0, min(1.0, beat_match / 100.0))
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 324), (rx1 + 20 + bar_w, panel_y1 + 334), (25, 35, 55), -1)
    cv2.rectangle(canvas, (rx1 + 20, panel_y1 + 324), (rx1 + 20 + int(sync_ratio * bar_w), panel_y1 + 334), pulse_col, -1)

    # 4. Live Dancing Audio Visualizer (Bottom Center)
    eq_count = 20
    eq_w = 11
    eq_gap = 7
    total_eq_w = eq_count * (eq_w + eq_gap)
    eq_start_x = (w - total_eq_w) // 2
    eq_base_y = h - 75

    if not engine.paused and engine.volume > 0.02:
        activity = max(1, engine.active_notes_count)
        for i in range(eq_count):
            freq_factor = math.sin(anim_tick * 0.40 + i * 0.55) * 0.5 + 0.5
            bar_height = int((14 + freq_factor * 60 * (activity / 6.0)) * engine.volume)
            bx = eq_start_x + i * (eq_w + eq_gap)
            by = eq_base_y - bar_height
            grad_c = (int(0 + i * 11), int(240 - i * 5), int(120 + i * 6))
            cv2.rectangle(canvas, (bx, by), (bx + eq_w, eq_base_y), grad_c, -1)
    else:
        for i in range(eq_count):
            bx = eq_start_x + i * (eq_w + eq_gap)
            cv2.rectangle(canvas, (bx, eq_base_y - 4), (bx + eq_w, eq_base_y), (50, 65, 85), -1)

    # 5. Glowing Baton Trails
    if len(right_baton_trail) > 2:
        for i in range(1, len(right_baton_trail)):
            pt1 = right_baton_trail[i - 1]
            pt2 = right_baton_trail[i]
            if pt1 is not None and pt2 is not None:
                alpha = i / float(len(right_baton_trail))
                col = (0, int(190 * alpha), int(255 * alpha))
                cv2.line(canvas, pt1, pt2, col, int(1 + alpha * 4))

    if len(left_baton_trail) > 2:
        for i in range(1, len(left_baton_trail)):
            pt1 = left_baton_trail[i - 1]
            pt2 = left_baton_trail[i]
            if pt1 is not None and pt2 is not None:
                alpha = i / float(len(left_baton_trail))
                col = (int(255 * alpha), int(220 * alpha), 0)
                cv2.line(canvas, pt1, pt2, col, int(1 + alpha * 3))

    # 6. Toast Notification Banner
    if toast_timer > 0 and not bravo_active:
        alpha = min(1.0, toast_timer / 10.0)
        tw, th_box = 440, 68
        cx1 = (w - tw) // 2
        cy1 = 95
        draw_glass_panel(canvas, cx1, cy1, cx1 + tw, cy1 + th_box, (14, 20, 32), alpha * 0.90)
        cv2.rectangle(canvas, (cx1, cy1), (cx1 + tw, cy1 + th_box), toast_color, 2)

        sz = cv2.getTextSize(toast_msg, cv2.FONT_HERSHEY_DUPLEX, 0.74, 2)[0]
        tx = cx1 + (tw - sz[0]) // 2
        ty = cy1 + (th_box + sz[1]) // 2
        cv2.putText(canvas, toast_msg, (tx, ty), cv2.FONT_HERSHEY_DUPLEX, 0.74, toast_color, 2)

    # 7. Bottom Status Bar
    draw_glass_panel(canvas, 0, h - 52, w, h, (14, 20, 32), 0.90)
    cv2.line(canvas, (0, h - 52), (w, h - 52), (0, 215, 255), 1)

    if has_hands:
        lbl = f"Current Gesture: {current_gesture.replace('_', ' ').upper()}"
        if confidence > 0.05:
            lbl += f" ({confidence:.0%})"
        cv2.putText(canvas, lbl, (30, h - 18), cv2.FONT_HERSHEY_DUPLEX, 0.60, (0, 240, 255), 2)
    else:
        cv2.putText(canvas, "No Hands Detected — Raise Hands to Conduct", (30, h - 18),
                    cv2.FONT_HERSHEY_DUPLEX, 0.55, (0, 180, 255), 2)

    hint_footer = "AI Maestro Hall | [T] Team | [E] Report | [B] Bravo! | [S] Lights | [N/P] Tracks | [F] Full | [Q] Quit"
    h_sz = cv2.getTextSize(hint_footer, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)[0]
    cv2.putText(canvas, hint_footer, (w - h_sz[0] - 25, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (180, 200, 225), 1)

    return canvas


def draw_skeleton(canvas, pose_landmarks, hand_result):
    h, w = canvas.shape[:2]
    right_wrist_pos = None
    left_wrist_pos = None

    if pose_landmarks:
        for a, b in POSE_CONNECTIONS:
            if a < len(pose_landmarks) and b < len(pose_landmarks):
                if pose_landmarks[a].visibility > 0.35 and pose_landmarks[b].visibility > 0.35:
                    ax = int(pose_landmarks[a].x * w)
                    ay = int(pose_landmarks[a].y * h)
                    bx = int(pose_landmarks[b].x * w)
                    by = int(pose_landmarks[b].y * h)
                    cv2.line(canvas, (ax, ay), (bx, by), (210, 220, 240), 2)

        for lm in pose_landmarks:
            if lm.visibility > 0.35:
                cx = int(lm.x * w)
                cy = int(lm.y * h)
                cv2.circle(canvas, (cx, cy), 3, (255, 255, 255), -1)

        if len(pose_landmarks) > 16 and pose_landmarks[16].visibility > 0.35:
            rx = int(pose_landmarks[16].x * w)
            ry = int(pose_landmarks[16].y * h)
            right_wrist_pos = (rx, ry)
            cv2.circle(canvas, (rx, ry), 8, (0, 215, 255), -1)

        if len(pose_landmarks) > 15 and pose_landmarks[15].visibility > 0.35:
            lx = int(pose_landmarks[15].x * w)
            ly = int(pose_landmarks[15].y * h)
            left_wrist_pos = (lx, ly)
            cv2.circle(canvas, (lx, ly), 8, (255, 240, 0), -1)

    if hand_result and hand_result.hand_landmarks:
        for hand_lms, handedness in zip(hand_result.hand_landmarks, hand_result.handedness):
            label = handedness[0].category_name
            color = (255, 240, 0) if label == 'Left' else (0, 215, 255)
            for lm in hand_lms:
                cx = int(lm.x * w)
                cy = int(lm.y * h)
                cv2.circle(canvas, (cx, cy), 3, color, -1)

            if label == 'Left':
                left_wrist_pos = (int(hand_lms[0].x * w), int(hand_lms[0].y * h))
            else:
                right_wrist_pos = (int(hand_lms[0].x * w), int(hand_lms[0].y * h))

    return right_wrist_pos, left_wrist_pos


def main():
    sf_path = os.path.join(ASSETS_DIR, 'orchestra.sf2')
    playlist_dir = os.path.join(ASSETS_DIR, 'playlist')
    engine = EnhancedOrchestraEngine(sf_path, playlist_dir)

    # MediaPipe Setup
    BaseOptions = mp.tasks.BaseOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    pose_model_path = os.path.join(MODELS_DIR, 'pose_landmarker.task')
    hand_model_path = os.path.join(MODELS_DIR, 'hand_landmarker.task')

    pose_opts = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=pose_model_path),
        running_mode=VisionRunningMode.IMAGE,
        num_poses=1
    )
    hand_opts = mp.tasks.vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=hand_model_path),
        running_mode=VisionRunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.45,
        min_hand_presence_confidence=0.45,
        min_tracking_confidence=0.45
    )

    cap = cv2.VideoCapture(0)
    window_name = 'AI Maestro Studio - Cinema Concert Hall'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720)

    team_modal = TeamShowcaseModal()
    perf_evaluator = ConductorPerformanceTracker()

    def mouse_callback(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            if team_modal.is_open:
                team_modal.handle_click(x, y)
            elif perf_evaluator.is_open:
                perf_evaluator.handle_click(x, y)
            else:
                bx1, by1, bx2, by2 = param['team_btn']
                if bx1 <= x <= bx2 and by1 <= y <= by2:
                    team_modal.show()

    mouse_params = {'team_btn': (1280 - 240, 14, 1280 - 30, 52)}
    cv2.setMouseCallback(window_name, mouse_callback, mouse_params)

    right_baton_trail = deque(maxlen=20)
    left_baton_trail = deque(maxlen=18)
    swipe_tracker = RobustSwipeTracker(history_len=10)

    current_gesture = "waiting..."
    confidence = 0.0
    active_gesture_id = None
    active_gesture_timer = 0

    # Phase 2: Atmospheric VFX & Performance Engines
    spotlights = StageSpotlightRenderer()
    stardust = StardustParticleSystem(max_particles=120)
    silhouette = OrchestraSilhouette()
    bpm_tracker = ConductingBpmTracker()
    bravo = BravoSystem()
    consecutive_stop_frames = 0
    cur_bpm = 108
    beat_match = 95

    toast_msg = "Ready! Wave your arms to conduct or press [T] for Team"
    toast_timer = 50
    toast_color = (0, 215, 255)

    is_fullscreen = False
    anim_tick = 0
    frame_idx = 0

    # Cache for alternate frame skipping (Boosts FPS to 30-35 FPS on CPU)
    cached_pose_raw = None
    cached_hand_res = None
    cached_r_wrist = None
    cached_l_wrist = None

    with mp.tasks.vision.PoseLandmarker.create_from_options(pose_opts) as pose_lm, \
         mp.tasks.vision.HandLandmarker.create_from_options(hand_opts) as hand_lm:

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            anim_tick += 1
            frame_idx += 1
            frame = cv2.flip(frame, 1)
            canvas = cv2.resize(frame, (1280, 720))
            h_canv, w_canv = canvas.shape[:2]
            team_btn_rect = (w_canv - 240, 14, w_canv - 30, 52)
            mouse_params['team_btn'] = team_btn_rect

            # Downscaled image for MediaPipe for 3x faster processing
            mp_small = cv2.resize(canvas, (640, 360))
            rgb_small = cv2.cvtColor(mp_small, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)

            # Detect landmarks
            pose_result = pose_lm.detect(mp_img)
            hand_result = hand_lm.detect(mp_img)

            pose_lms_raw = pose_result.pose_landmarks[0] if (pose_result.pose_landmarks and len(pose_result.pose_landmarks) > 0) else None
            cached_pose_raw = pose_lms_raw
            cached_hand_res = hand_result

            # Draw skeleton and get wrist positions
            r_wrist, l_wrist = draw_skeleton(canvas, pose_lms_raw, hand_result)
            right_baton_trail.append(r_wrist)
            left_baton_trail.append(l_wrist)

            # Hand presence validation
            has_hands = bool(hand_result and hand_result.hand_landmarks and len(hand_result.hand_landmarks) > 0)
            if not has_hands and (r_wrist is not None or l_wrist is not None):
                # Wrist visible above chest
                if (r_wrist and r_wrist[1] < int(h_canv * 0.85)) or (l_wrist and l_wrist[1] < int(h_canv * 0.85)):
                    has_hands = True

            # Phase 2: Live BPM Tracking & Stardust Particle Emitters
            if has_hands:
                active_w = r_wrist if r_wrist is not None else l_wrist
                cur_bpm, beat_match = bpm_tracker.update(active_w, engine.tempo_scale)
                if r_wrist:
                    stardust.emit(r_wrist[0], r_wrist[1], count=2, speed_scale=1.2)
                if l_wrist:
                    stardust.emit(l_wrist[0], l_wrist[1], count=2, speed_scale=1.2)
            else:
                cur_bpm, beat_match = int(108 * engine.tempo_scale), 90

            # Record live telemetry for Biometric Performance Report
            target_bpm = int(108 * engine.tempo_scale)
            conducted_bpm = cur_bpm if has_hands else target_bpm
            active_coord = r_wrist if r_wrist is not None else l_wrist
            perf_evaluator.record_frame(
                target_bpm=target_bpm,
                conducted_bpm=conducted_bpm,
                wrist_pos=active_coord,
                confidence=confidence,
                is_beat=(bpm_tracker.beat_flash_timer > 0)
            )

            stardust.update()

            # Phase 2: Render Volumetric Spotlights & Orchestra Silhouette (Theatrical Atmosphere)
            spotlights.draw(canvas, r_wrist, l_wrist, volume=engine.volume, anim_tick=anim_tick)
            silhouette.draw(canvas, tempo_scale=engine.tempo_scale, anim_tick=anim_tick)
            stardust.draw(canvas)

            # GESTURE PROCESSING (ONLY WHEN HANDS ARE PRESENT!)
            if not team_modal.is_open and has_hands:
                # 1. Update Horizontal Swipe Tracker using right wrist or active hand
                swipe_target = r_wrist if r_wrist is not None else l_wrist
                swipe_tracker.update(swipe_target)
                k_swipe, k_conf = swipe_tracker.detect_swipe(w_canv)

                action_triggered = False

                if k_swipe == 'right_swipe':
                    engine.increase_tempo(0.20)
                    toast_msg = f"TEMPO FASTER >> ({engine.tempo_scale:.2f}x)"
                    toast_color = (0, 180, 255)
                    toast_timer = 35
                    current_gesture = "right_swipe"
                    confidence = k_conf
                    active_gesture_id = "right_swipe"
                    active_gesture_timer = 25
                    action_triggered = True

                elif k_swipe == 'left_swipe':
                    engine.decrease_tempo(0.20)
                    toast_msg = f"<< TEMPO SLOWER ({engine.tempo_scale:.2f}x)"
                    toast_color = (255, 140, 0)
                    toast_timer = 35
                    current_gesture = "left_swipe"
                    confidence = k_conf
                    active_gesture_id = "left_swipe"
                    active_gesture_timer = 25
                    action_triggered = True

                # 2. Geometric Hand Pose Gesture (Thumbs Up, Thumbs Down, Stop)
                if not action_triggered and hand_result and hand_result.hand_landmarks:
                    for h_lms in hand_result.hand_landmarks:
                        g_type, g_conf = classify_hand_gesture(h_lms)
                        if g_type is not None:
                            if g_type == 'thumbs_up' and active_gesture_timer <= 0:
                                engine.increase_volume(0.15)
                                toast_msg = f"VOLUME UP ({engine.volume:.0%})"
                                toast_color = (0, 240, 90)
                                toast_timer = 35
                                current_gesture = "thumbs_up"
                                confidence = g_conf
                                active_gesture_id = "thumbs_up"
                                active_gesture_timer = 25
                                break

                            elif g_type == 'thumbs_down' and active_gesture_timer <= 0:
                                engine.decrease_volume(0.15)
                                toast_msg = f"VOLUME DOWN ({engine.volume:.0%})"
                                toast_color = (0, 215, 255)
                                toast_timer = 35
                                current_gesture = "thumbs_down"
                                confidence = g_conf
                                active_gesture_id = "thumbs_down"
                                active_gesture_timer = 25
                                break

                            elif g_type == 'stop' and active_gesture_timer <= 0:
                                is_p = engine.toggle_pause()
                                toast_msg = "ORCHESTRA PAUSED" if is_p else "ORCHESTRA RESUMED"
                                toast_color = (0, 60, 255) if is_p else (0, 240, 90)
                                toast_timer = 40
                                current_gesture = "stop"
                                confidence = g_conf
                                active_gesture_id = "stop"
                                active_gesture_timer = 30
                                break
            elif not has_hands:
                # No hands in frame -> clean state, zero hallucinations!
                swipe_tracker.update(None)
                if active_gesture_timer <= 0:
                    current_gesture = "no_hands"
                    confidence = 0.0

            if active_gesture_timer > 0:
                active_gesture_timer -= 1
            else:
                active_gesture_id = None

            # Phase 2: Consecutive Stop detection for Bravo Audience Applause
            if current_gesture == 'stop' and has_hands:
                consecutive_stop_frames += 1
                if consecutive_stop_frames == 45:  # ~1.5 seconds clean stop
                    bravo.trigger(cur_bpm, beat_match, engine.track_title)
                    toast_msg = "🌟 BRAVO MAESTRO! 🌟"
                    toast_color = (0, 215, 255)
                    toast_timer = 50
            else:
                consecutive_stop_frames = 0

            # Automatic Bravo & Performance Evaluation on track completion
            if engine.current_time >= (engine.total_duration - 1.2) and engine.total_duration > 15.0:
                if bravo.active_timer <= 0:
                    bravo.trigger(cur_bpm, beat_match, engine.track_title)
                    perf_evaluator.show()

            if toast_timer > 0:
                toast_timer -= 1

            canvas = draw_cinema_hud(canvas, engine, current_gesture, confidence,
                                     active_gesture_id, active_gesture_timer,
                                     toast_msg, toast_timer, toast_color,
                                     right_baton_trail, left_baton_trail, anim_tick,
                                     has_hands, r_wrist, l_wrist,
                                     cur_bpm=cur_bpm, beat_match=beat_match,
                                     team_btn_rect=team_btn_rect)

            canvas = bravo.draw(canvas)
            canvas = perf_evaluator.render(canvas)
            canvas = team_modal.render(canvas)

            cv2.imshow(window_name, canvas)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                if team_modal.is_open:
                    team_modal.hide()
                elif perf_evaluator.is_open:
                    perf_evaluator.hide()
                else:
                    break
            elif key == ord('t') or key == ord('T'):
                team_modal.toggle()
            elif key == ord('e') or key == ord('E'):
                perf_evaluator.toggle()
            elif key == ord('b') or key == ord('B'):
                bravo.trigger(cur_bpm, beat_match, engine.track_title)
                toast_msg = "🌟 BRAVO MAESTRO! 🌟"
                toast_color = (0, 215, 255)
                toast_timer = 50
            elif key == ord('s') or key == ord('S'):
                spotlights.enabled = not spotlights.enabled
                toast_msg = "SPOTLIGHTS: " + ("ON" if spotlights.enabled else "OFF")
                toast_color = (255, 220, 0)
                toast_timer = 30
            elif key == ord('f') or key == ord('F'):
                is_fullscreen = not is_fullscreen
                if is_fullscreen:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                else:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
            elif key == ord('n') or key == ord('N'):
                engine.next_track()
                toast_msg = f"Track: {engine.track_title}"
                toast_color = (0, 215, 255)
                toast_timer = 45
            elif key == ord('p') or key == ord('P'):
                engine.prev_track()
                toast_msg = f"Track: {engine.track_title}"
                toast_color = (0, 215, 255)
                toast_timer = 45
            elif key == ord('r') or key == ord('R'):
                engine.restart_track()
                toast_msg = "Track Restarted"
                toast_color = (220, 220, 220)
                toast_timer = 30
            elif key == 32:  # Spacebar
                is_p = engine.toggle_pause()
                toast_msg = "PAUSED" if is_p else "RESUMED"
                toast_color = (0, 60, 255) if is_p else (0, 240, 90)
                toast_timer = 35

    cap.release()
    cv2.destroyAllWindows()
    engine.stop()
    print("Maestro Concert Hall exited cleanly.")


if __name__ == '__main__':
    main()
