"""
AI Maestro Studio - Air Drums & Percussion (الدرامز والإيقاع الشرقي)
=====================================================================
Features:
- Dual Audio Engine: High-Impact Pygame Acoustic Percussion + FluidSynth MIDI Bank 128
- Strike Detection: Entry Boundary Hit + Downward Velocity Trigger
- Dual Kits:
    [1] Rock & Studio Drum Kit (Crash, Hi-Hat, Snare, Kick, Toms, Ride)
    [2] Arabic Percussion Kit (Darbuka Dum, Tak, Sak, Riqq, Sagat, Daholla)
- Radial Shockwave Ripples, Metallic Pad Glow, and Live Combo Meter
- Integrated Luxury Team Showcase Modal ([T] or click button)
- Fullscreen toggle via [F], Quit via [Q] / [ESC]
"""

import os
import sys
import time
import math
import random
from collections import deque
import cv2
import numpy as np
import pygame
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
from accompaniment_engine import AudioSpectrumVisualizer

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

pygame.mixer.pre_init(frequency=44100, size=-16, channels=2, buffer=512)
pygame.mixer.init()


def generate_drum_samples():
    sr = 44100
    sounds = {}

    # 1. Kick / Dum
    t = np.linspace(0, 0.35, int(sr * 0.35), endpoint=False)
    freq = 160 * np.exp(-18 * t) + 48
    phase = 2 * np.pi * np.cumsum(freq) / sr
    kick = np.sin(phase) * np.exp(-9 * t)
    click = np.random.uniform(-0.3, 0.3, len(t)) * np.exp(-120 * t)
    kick = np.clip(kick + click, -1.0, 1.0)
    kick_16 = np.int16(kick * 32767)
    sounds['kick'] = pygame.sndarray.make_sound(np.column_stack([kick_16, kick_16]))

    # 2. Snare
    t = np.linspace(0, 0.28, int(sr * 0.28), endpoint=False)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-18 * t)
    noise = np.random.uniform(-0.8, 0.8, len(t)) * np.exp(-12 * t)
    snare = np.clip((body * 0.5) + (noise * 0.7), -1.0, 1.0)
    snare_16 = np.int16(snare * 32767)
    sounds['snare'] = pygame.sndarray.make_sound(np.column_stack([snare_16, snare_16]))

    # 3. Hi-Hat / Tak
    t = np.linspace(0, 0.08, int(sr * 0.08), endpoint=False)
    noise = np.random.uniform(-0.9, 0.9, len(t)) * np.exp(-50 * t)
    hihat_16 = np.int16(noise * 32767)
    sounds['hihat'] = pygame.sndarray.make_sound(np.column_stack([hihat_16, hihat_16]))

    # 4. Crash Cymbal
    t = np.linspace(0, 0.9, int(sr * 0.9), endpoint=False)
    noise = np.random.uniform(-0.8, 0.8, len(t))
    decay = np.exp(-4.5 * t)
    ring = np.sin(2 * np.pi * 540 * t) * 0.2 + np.sin(2 * np.pi * 820 * t) * 0.2
    crash = np.clip((noise * 0.7 + ring) * decay, -1.0, 1.0)
    crash_16 = np.int16(crash * 32767)
    sounds['crash'] = pygame.sndarray.make_sound(np.column_stack([crash_16, crash_16]))

    # 5. Tom
    t = np.linspace(0, 0.32, int(sr * 0.32), endpoint=False)
    freq = 130 * np.exp(-10 * t) + 85
    phase = 2 * np.pi * np.cumsum(freq) / sr
    tom = np.sin(phase) * np.exp(-7 * t)
    tom_16 = np.int16(tom * 32767)
    sounds['tom'] = pygame.sndarray.make_sound(np.column_stack([tom_16, tom_16]))

    # 6. Arabic Daholla
    t = np.linspace(0, 0.45, int(sr * 0.45), endpoint=False)
    freq = 110 * np.exp(-12 * t) + 42
    phase = 2 * np.pi * np.cumsum(freq) / sr
    daholla = np.sin(phase) * np.exp(-6.5 * t)
    daholla_16 = np.int16(daholla * 32767)
    sounds['daholla'] = pygame.sndarray.make_sound(np.column_stack([daholla_16, daholla_16]))

    # 7. Arabic Riqq
    t = np.linspace(0, 0.22, int(sr * 0.22), endpoint=False)
    body = np.sin(2 * np.pi * 320 * t) * np.exp(-22 * t)
    jingle = np.random.uniform(-0.6, 0.6, len(t)) * np.exp(-14 * t)
    riqq = np.clip(body * 0.4 + jingle * 0.6, -1.0, 1.0)
    riqq_16 = np.int16(riqq * 32767)
    sounds['riqq'] = pygame.sndarray.make_sound(np.column_stack([riqq_16, riqq_16]))

    # 8. Arabic Sagat
    t = np.linspace(0, 0.16, int(sr * 0.16), endpoint=False)
    ring = (np.sin(2 * np.pi * 2100 * t) + np.sin(2 * np.pi * 3350 * t) * 0.7) * np.exp(-16 * t)
    sagat_16 = np.int16(ring * 32767)
    sounds['sagat'] = pygame.sndarray.make_sound(np.column_stack([sagat_16, sagat_16]))

    return sounds


class DrumMidiSynth:
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
        self.fs.program_select(9, self.sfid, 128, 0)

    def trigger_midi(self, pitch, vel=110):
        try:
            self.fs.noteon(9, pitch, min(127, max(1, vel)))
        except Exception:
            pass

    def stop(self):
        try:
            self.fs.system_reset()
            self.fs.delete()
        except Exception:
            pass


DRUM_KITS = [
    {
        "name": "Rock Studio Drums",
        "pads": [
            {"id": "crash",  "name": "CRASH",  "rel_x": 0.16, "rel_y": 0.32, "r": 62, "pitch": 49, "sound_key": "crash",  "color": (255, 220, 0)},
            {"id": "hihat",  "name": "HI-HAT", "rel_x": 0.28, "rel_y": 0.58, "r": 54, "pitch": 42, "sound_key": "hihat",  "color": (0, 240, 255)},
            {"id": "snare",  "name": "SNARE",  "rel_x": 0.40, "rel_y": 0.72, "r": 58, "pitch": 38, "sound_key": "snare",  "color": (0, 165, 255)},
            {"id": "kick",   "name": "KICK",   "rel_x": 0.50, "rel_y": 0.84, "r": 68, "pitch": 36, "sound_key": "kick",   "color": (0, 50, 255)},
            {"id": "hitom",  "name": "HI-TOM", "rel_x": 0.60, "rel_y": 0.44, "r": 52, "pitch": 50, "sound_key": "tom",    "color": (255, 120, 0)},
            {"id": "lotom",  "name": "LO-TOM", "rel_x": 0.74, "rel_y": 0.62, "r": 56, "pitch": 45, "sound_key": "tom",    "color": (255, 60, 160)},
            {"id": "ride",   "name": "RIDE",   "rel_x": 0.84, "rel_y": 0.34, "r": 60, "pitch": 51, "sound_key": "crash",  "color": (0, 255, 150)},
        ]
    },
    {
        "name": "Arabic Percussion (إيقاع شرقي)",
        "pads": [
            {"id": "sagat",   "name": "SAGAT",   "rel_x": 0.18, "rel_y": 0.34, "r": 52, "pitch": 54, "sound_key": "sagat",   "color": (255, 235, 60)},
            {"id": "tak",     "name": "TAK (تك)", "rel_x": 0.30, "rel_y": 0.58, "r": 55, "pitch": 63, "sound_key": "hihat",   "color": (0, 240, 255)},
            {"id": "sak",     "name": "SAK (صك)", "rel_x": 0.42, "rel_y": 0.72, "r": 56, "pitch": 39, "sound_key": "snare",   "color": (0, 180, 255)},
            {"id": "dum",     "name": "DUM (دم)", "rel_x": 0.50, "rel_y": 0.84, "r": 68, "pitch": 36, "sound_key": "kick",    "color": (0, 70, 255)},
            {"id": "katem",   "name": "KATEM",   "rel_x": 0.60, "rel_y": 0.44, "r": 54, "pitch": 62, "sound_key": "tom",     "color": (255, 140, 30)},
            {"id": "daholla", "name": "DAHOLLA", "rel_x": 0.72, "rel_y": 0.62, "r": 60, "pitch": 35, "sound_key": "daholla", "color": (255, 60, 200)},
            {"id": "riqq",    "name": "RIQQ (رق)","rel_x": 0.82, "rel_y": 0.36, "r": 58, "pitch": 58, "sound_key": "riqq",    "color": (40, 255, 180)},
        ]
    }
]


class HitRipple:
    def __init__(self, x, y, color, max_r=90):
        self.x = x
        self.y = y
        self.color = color
        self.radius = 12
        self.max_r = max_r
        self.alive = True

    def update(self):
        self.radius += 5.5
        if self.radius >= self.max_r:
            self.alive = False

    def draw(self, canvas):
        if not self.alive:
            return
        alpha = max(0.0, 1.0 - (self.radius / float(self.max_r)))
        overlay = canvas.copy()
        cv2.circle(overlay, (self.x, self.y), int(self.radius), self.color, 3)
        cv2.addWeighted(overlay, alpha * 0.8, canvas, 1 - alpha * 0.8, 0, canvas)


class SparkParticle:
    def __init__(self, x, y, color):
        self.x = float(x)
        self.y = float(y)
        self.color = color
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(3.0, 9.0)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed - 1.5
        self.life = 1.0
        self.decay = random.uniform(0.05, 0.09)

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.35
        self.life -= self.decay

    def draw(self, canvas):
        if self.life > 0:
            sz = max(1, int(self.life * 4))
            col = tuple(int(c * self.life) for c in self.color)
            cv2.circle(canvas, (int(self.x), int(self.y)), sz, col, -1)


def main():
    pcm_sounds = generate_drum_samples()
    synth = DrumMidiSynth(SOUNDFONT_PATH)

    BaseOptions = mp.tasks.BaseOptions
    HandLandmarker = mp.tasks.vision.HandLandmarker
    HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=HAND_TASK_PATH),
        running_mode=VisionRunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.45,
        min_hand_presence_confidence=0.45,
        min_tracking_confidence=0.45
    )

    cap = cv2.VideoCapture(0)
    window_name = "AI Maestro Studio - Air Drums & Percussion"
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

    current_kit_idx = 0
    ripples = []
    sparks = []
    hand_histories = {}
    pad_last_hit = {}
    combo_count = 0
    last_hit_time = 0.0
    last_hit_name = ""
    total_hits = 0
    is_fullscreen = False
    visualizer = AudioSpectrumVisualizer(num_bands=16)

    with HandLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            now = time.time()
            frame = cv2.flip(frame, 1)
            canvas = cv2.resize(frame, (1280, 720))
            h, w = canvas.shape[:2]
            team_btn_rect = (w - 230, 12, w - 25, 52)
            mouse_params['team_btn'] = team_btn_rect

            kit = DRUM_KITS[current_kit_idx]

            strike_points = []

            if not team_modal.is_open:
                mp_small = cv2.resize(canvas, (640, 360))
                rgb_small = cv2.cvtColor(mp_small, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)
                results = landmarker.detect(mp_img)

                if results.hand_landmarks and results.handedness:
                    for idx, (hand_lms, handedness) in enumerate(zip(results.hand_landmarks, results.handedness)):
                        h_label = handedness[0].category_name
                        tip8 = hand_lms[8]
                        sx8 = int(tip8.x * w)
                        sy8 = int(tip8.y * h)
                        strike_points.append(((h_label, 8), sx8, sy8))

                        tip12 = hand_lms[12]
                        sx12 = int(tip12.x * w)
                        sy12 = int(tip12.y * h)
                        strike_points.append(((h_label, 12), sx12, sy12))

                        for lm in hand_lms:
                            cx, cy = int(lm.x * w), int(lm.y * h)
                            cv2.circle(canvas, (cx, cy), 3, (0, 240, 255), -1)

                for sp_id, sx, sy in strike_points:
                    if sp_id not in hand_histories:
                        hand_histories[sp_id] = deque(maxlen=5)
                    hist = hand_histories[sp_id]
                    hist.append((sx, sy, now))

                    vy = 0.0
                    prev_sx, prev_sy = sx, sy
                    if len(hist) >= 2:
                        p_sx, p_sy, p_t = hist[-2]
                        dt = now - p_t
                        if dt > 0.001:
                            vy = (sy - p_sy) / dt
                        prev_sx, prev_sy = p_sx, p_sy

                    for pad in kit["pads"]:
                        pcx = int(pad["rel_x"] * w)
                        pcy = int(pad["rel_y"] * h)
                        r = pad["r"]

                        dist_curr = math.hypot(sx - pcx, sy - pcy)
                        dist_prev = math.hypot(prev_sx - pcx, prev_sy - pcy)
                        last_hit = pad_last_hit.get(pad["id"], 0.0)

                        hit_triggered = False
                        if dist_curr <= r and dist_prev > r and (now - last_hit > 0.10):
                            hit_triggered = True
                        elif dist_curr <= r and vy > 35.0 and (now - last_hit > 0.12):
                            hit_triggered = True

                        if hit_triggered:
                            pad_last_hit[pad["id"]] = now
                            total_hits += 1

                            if now - last_hit_time < 0.85:
                                combo_count += 1
                            else:
                                combo_count = 1
                            last_hit_time = now
                            last_hit_name = pad["name"]

                            skey = pad["sound_key"]
                            if skey in pcm_sounds:
                                pcm_sounds[skey].play()
                            synth.trigger_midi(pad["pitch"], vel=int(min(127, 85 + vy / 6.0)))

                            if skey in ('kick', 'daholla'):
                                visualizer.trigger_energy((0, 5), amount=0.95)
                            elif skey in ('snare', 'tom'):
                                visualizer.trigger_energy((4, 10), amount=0.90)
                            else:
                                visualizer.trigger_energy((10, 16), amount=0.88)

                            ripples.append(HitRipple(pcx, pcy, pad["color"], max_r=int(r * 1.8)))
                            for _ in range(14):
                                sparks.append(SparkParticle(pcx, pcy, pad["color"]))

                    cv2.circle(canvas, (sx, sy), 8, (255, 255, 255), -1)
                    cv2.circle(canvas, (sx, sy), 13, (0, 240, 255), 2)

            # Update & Draw VFX
            for rip in list(ripples):
                rip.update()
                rip.draw(canvas)
                if not rip.alive:
                    ripples.remove(rip)

            for sp in list(sparks):
                sp.update()
                sp.draw(canvas)
                if sp.life <= 0:
                    sparks.remove(sp)

            # Draw Pads
            for pad in kit["pads"]:
                pcx = int(pad["rel_x"] * w)
                pcy = int(pad["rel_y"] * h)
                r = pad["r"]
                color = pad["color"]

                since_hit = now - pad_last_hit.get(pad["id"], 0.0)
                scale = 1.0
                if since_hit < 0.15:
                    scale = 1.0 + (0.15 - since_hit) * 1.2
                    r = int(r * scale)

                px1, py1 = max(0, pcx - r), max(0, pcy - r)
                px2, py2 = min(w, pcx + r), min(h, pcy + r)
                draw_glass_panel(canvas, px1, py1, px2, py2, bg_color=(28, 18, 14), alpha=0.75)

                rim_thick = 4 if scale > 1.05 else 2
                cv2.circle(canvas, (pcx, pcy), r, color, rim_thick, cv2.LINE_AA)
                cv2.circle(canvas, (pcx, pcy), max(1, r - 7), (60, 45, 30), 1, cv2.LINE_AA)
                cv2.drawMarker(canvas, (pcx, pcy), color, cv2.MARKER_CROSS, 16, 1, cv2.LINE_AA)

                font = cv2.FONT_HERSHEY_DUPLEX
                font_scale = 0.52 if w >= 1280 else 0.42
                text_sz = cv2.getTextSize(pad["name"], font, font_scale, 1)[0]
                tx = pcx - text_sz[0] // 2
                ty = pcy + text_sz[1] // 2 + 18
                cv2.putText(canvas, pad["name"], (tx, ty), font, font_scale, (255, 255, 255), 1, cv2.LINE_AA)

            # Top Header HUD
            draw_glass_panel(canvas, 0, 0, w, 68, (18, 12, 8), 0.90)
            cv2.line(canvas, (0, 68), (w, 68), (212, 182, 6), 2)
            cv2.line(canvas, (0, 71), (w, 71), (0, 215, 255), 1)

            cv2.putText(canvas, "AIR DRUMS & PERCUSSION", (25, 30), cv2.FONT_HERSHEY_DUPLEX, 0.75, (212, 182, 6), 2)
            cv2.putText(canvas, f"Kit: {kit['name']} ([1-2] to switch)", (25, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 220, 240), 1)

            if combo_count > 1 and (now - last_hit_time < 1.0):
                combo_str = f"COMBO x{combo_count} !  [{last_hit_name}]"
                csz = cv2.getTextSize(combo_str, cv2.FONT_HERSHEY_DUPLEX, 0.7, 2)[0]
                cx = (w - csz[0]) // 2
                draw_glass_panel(canvas, cx - 15, 10, cx + csz[0] + 15, 55, (28, 20, 14), 0.90)
                cv2.rectangle(canvas, (cx - 15, 10), (cx + csz[0] + 15, 55), (212, 182, 6), 2)
                cv2.putText(canvas, combo_str, (cx, 38), cv2.FONT_HERSHEY_DUPLEX, 0.7, (238, 211, 34), 2)
            elif last_hit_name and (now - last_hit_time < 0.6):
                hit_str = f"HIT: {last_hit_name}"
                csz = cv2.getTextSize(hit_str, cv2.FONT_HERSHEY_DUPLEX, 0.65, 2)[0]
                cx = (w - csz[0]) // 2
                cv2.putText(canvas, hit_str, (cx, 40), cv2.FONT_HERSHEY_DUPLEX, 0.65, (212, 182, 6), 2)

            canvas = draw_team_button(canvas, team_btn_rect)

            # Phase 3: Percussion Spectrum Equalizer
            visualizer.draw(canvas, w - 280, 78, width=255, height=115, title="16-BAND AUDIO SPECTRUM")

            # Bottom Status Bar
            stat = f"Hits: {total_hits} | Combo: x{combo_count} | Kit: {kit['name']}"
            hints = "[1-2] Kit | [C] Reset Combo | [F] Full | [T] Team | [Q] Quit"
            canvas = draw_bottom_bar(canvas, stat, hints)

            canvas = team_modal.render(canvas)

            cv2.imshow(window_name, canvas)
            key = cv2.waitKey(1) & 0xFF

            if key in [ord('q'), ord('Q'), 27]:
                if team_modal.is_open:
                    team_modal.hide()
                else:
                    break
            elif key in [ord('t'), ord('T')]:
                team_modal.toggle()
            elif key in [ord('f'), ord('F')]:
                is_fullscreen = not is_fullscreen
                if is_fullscreen:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
                else:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_NORMAL)
            elif key == ord('1'):
                current_kit_idx = 0
            elif key == ord('2'):
                current_kit_idx = 1
            elif key in [ord('c'), ord('C')]:
                combo_count = 0
                total_hits = 0

    cap.release()
    cv2.destroyAllWindows()
    synth.stop()
    print("Air Drums closed cleanly.")


if __name__ == "__main__":
    main()
