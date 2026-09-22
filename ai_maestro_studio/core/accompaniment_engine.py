"""
AI Maestro Studio - Accompaniment & Jam Engine (Phase 3)
=========================================================
Dynamic intelligent backing rhythm tracks and 16-band real-time audio spectrum analyzer.

Features:
1. Procedural High-Impact Acoustic & Oriental Drum Synthesis (Zero external asset dependency)
2. Four Curated Musical Styles:
   - 🪕 Maqsum / Baladi (إيقاع مقسوم بلدي شرقي أصيل للعود والآلات الشرقية)
   - 🎸 Acoustic Pop / Rock Groove (إيقاع بوب وروك غربي للبيانو والجيتار)
   - ☕ Lo-Fi Chill Swing (إيقاع لوفي وجاز هادئ للكمان والبيانو)
   - ⏱️ Studio Metronome (بندول إيقاعي كلاسيكي للمعايرة والتدريب)
3. Microsecond-accurate threading clock with dynamic BPM (50 - 180 BPM)
4. Dynamic 16-Band Audio Spectrum Equalizer with peak-hold physics
5. Glassmorphic Jam Control HUD & 4-Beat Step Indicator
"""

import time
import math
import threading
import cv2
import numpy as np

try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False


def _synthesize_percussion_bank():
    """Generates procedural 44.1kHz 16-bit stereo percussion samples in memory."""
    if not PYGAME_AVAILABLE:
        return {}

    if not pygame.mixer.get_init():
        try:
            pygame.mixer.pre_init(frequency=44100, size=-16, channels=2, buffer=512)
            pygame.mixer.init()
        except Exception:
            return {}

    sr = 44100
    sounds = {}

    def to_sound(arr):
        arr_16 = np.int16(np.clip(arr, -1.0, 1.0) * 32767)
        return pygame.sndarray.make_sound(np.column_stack([arr_16, arr_16]))

    # 1. Kick / Dum (Deep punchy low end)
    t = np.linspace(0, 0.35, int(sr * 0.35), endpoint=False)
    freq = 150 * np.exp(-19 * t) + 46
    phase = 2 * np.pi * np.cumsum(freq) / sr
    kick = np.sin(phase) * np.exp(-9.5 * t)
    click = np.random.uniform(-0.25, 0.25, len(t)) * np.exp(-120 * t)
    sounds['kick'] = to_sound(kick + click)

    # 2. Snare / Crack
    t = np.linspace(0, 0.26, int(sr * 0.26), endpoint=False)
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-18 * t)
    noise = np.random.uniform(-0.7, 0.7, len(t)) * np.exp(-13 * t)
    sounds['snare'] = to_sound(body * 0.45 + noise * 0.65)

    # 3. Hi-Hat / Tak (Crisp metallic click)
    t = np.linspace(0, 0.08, int(sr * 0.08), endpoint=False)
    noise = np.random.uniform(-0.85, 0.85, len(t)) * np.exp(-48 * t)
    sounds['hihat'] = to_sound(noise)

    # 4. Open Hi-Hat
    t = np.linspace(0, 0.30, int(sr * 0.30), endpoint=False)
    noise = np.random.uniform(-0.75, 0.75, len(t)) * np.exp(-11 * t)
    sounds['open_hihat'] = to_sound(noise)

    # 5. Arabic Riqq (Jingle tambourine)
    t = np.linspace(0, 0.22, int(sr * 0.22), endpoint=False)
    body = np.sin(2 * np.pi * 330 * t) * np.exp(-22 * t)
    jingle = np.random.uniform(-0.6, 0.6, len(t)) * np.exp(-15 * t)
    sounds['riqq'] = to_sound(body * 0.4 + jingle * 0.6)

    # 6. Arabic Sagat (Brass finger cymbals)
    t = np.linspace(0, 0.18, int(sr * 0.18), endpoint=False)
    ring = (np.sin(2 * np.pi * 2150 * t) + np.sin(2 * np.pi * 3400 * t) * 0.7) * np.exp(-15 * t)
    sounds['sagat'] = to_sound(ring * 0.6)

    # 7. Rimshot (Lo-Fi click)
    t = np.linspace(0, 0.12, int(sr * 0.12), endpoint=False)
    rim = np.sin(2 * np.pi * 480 * t) * np.exp(-28 * t) + np.random.uniform(-0.4, 0.4, len(t)) * np.exp(-35 * t)
    sounds['rim'] = to_sound(rim)

    # 8. Metronome High (Beat 1 accent)
    t = np.linspace(0, 0.08, int(sr * 0.08), endpoint=False)
    click_hi = np.sin(2 * np.pi * 1600 * t) * np.exp(-40 * t)
    sounds['metro_hi'] = to_sound(click_hi)

    # 9. Metronome Low (Beats 2, 3, 4)
    t = np.linspace(0, 0.08, int(sr * 0.08), endpoint=False)
    click_lo = np.sin(2 * np.pi * 900 * t) * np.exp(-40 * t)
    sounds['metro_lo'] = to_sound(click_lo)

    return sounds


STYLES = [
    {
        "id": "maqsum",
        "name_en": "Maqsum Oriental",
        "name_ar": "إيقاع مقسوم بلدي شرقي",
        "steps": 8,
        # Pattern for 8 eighth-notes (Dum - Tak - _ - Tak - Dum - _ - Tak - _)
        "tracks": {
            0: [("kick", 1.0), ("sagat", 0.7)],   # Step 0: Dum + Sagat
            2: [("hihat", 0.9), ("riqq", 0.8)],   # Step 2: Tak
            3: [("sagat", 0.6)],                  # Step 3: Tak accent
            4: [("kick", 0.95)],                  # Step 4: Dum
            6: [("hihat", 0.85), ("riqq", 0.9)],  # Step 6: Tak
        }
    },
    {
        "id": "pop",
        "name_en": "Pop / Rock Groove",
        "name_ar": "إيقاع بوب وروك كلاسيكي",
        "steps": 8,
        "tracks": {
            0: [("kick", 1.0), ("hihat", 0.8)],
            1: [("hihat", 0.7)],
            2: [("snare", 0.95), ("hihat", 0.8)],
            3: [("hihat", 0.7)],
            4: [("kick", 0.9), ("hihat", 0.8)],
            5: [("kick", 0.75), ("hihat", 0.7)],
            6: [("snare", 1.0), ("hihat", 0.8)],
            7: [("open_hihat", 0.75)],
        }
    },
    {
        "id": "lofi",
        "name_en": "Lo-Fi Chill Swing",
        "name_ar": "إيقاع لوفي وجاز هادئ",
        "steps": 8,
        "tracks": {
            0: [("kick", 0.8), ("hihat", 0.6)],
            2: [("rim", 0.85), ("hihat", 0.5)],
            4: [("kick", 0.65), ("hihat", 0.6)],
            5: [("hihat", 0.55)],
            6: [("rim", 0.9), ("hihat", 0.6)],
        }
    },
    {
        "id": "metronome",
        "name_en": "Acoustic Metronome",
        "name_ar": "بندول الإيقاع للمعايرة",
        "steps": 4,
        "tracks": {
            0: [("metro_hi", 1.0)],
            1: [("metro_lo", 0.8)],
            2: [("metro_lo", 0.8)],
            3: [("metro_lo", 0.8)],
        }
    }
]


class AudioSpectrumVisualizer:
    """16-Band Dynamic Audio Spectrum Analyzer with physical peak-hold drops."""
    def __init__(self, num_bands=16):
        self.num_bands = num_bands
        self.levels = np.zeros(num_bands, dtype=np.float32)
        self.peaks = np.zeros(num_bands, dtype=np.float32)
        self.peak_speeds = np.zeros(num_bands, dtype=np.float32)

    def trigger_energy(self, band_range, amount=0.8):
        b_start, b_end = band_range
        b_start = max(0, min(self.num_bands - 1, b_start))
        b_end = max(b_start, min(self.num_bands, b_end))
        for b in range(b_start, b_end):
            self.levels[b] = min(1.0, self.levels[b] + amount)
            if self.levels[b] > self.peaks[b]:
                self.peaks[b] = self.levels[b]
                self.peak_speeds[b] = 0.0

    def trigger_note(self, pitch, velocity=100):
        # Maps MIDI pitch 36-84 to 16 bands
        ratio = max(0.0, min(1.0, (pitch - 36) / (84 - 36)))
        center_band = int(ratio * (self.num_bands - 1))
        amt = (velocity / 127.0) * 0.95
        self.trigger_energy((center_band - 1, center_band + 2), amount=amt)

    def update(self):
        # Physics decay: levels fall rapidly, peaks fall with gravity
        decay_rate = 0.88
        self.levels *= decay_rate
        for i in range(self.num_bands):
            if self.peaks[i] > self.levels[i]:
                self.peak_speeds[i] += 0.005
                self.peaks[i] = max(self.levels[i], self.peaks[i] - self.peak_speeds[i])
            else:
                self.peaks[i] = self.levels[i]
                self.peak_speeds[i] = 0.0

    def draw(self, canvas, x, y, width, height, title="AUDIO SPECTRUM"):
        self.update()
        h_canv, w_canv = canvas.shape[:2]
        if x + width > w_canv or y + height > h_canv:
            return

        # Semi-transparent backing panel
        roi = canvas[y:y + height, x:x + width]
        tint = np.full_like(roi, (12, 18, 30))
        canvas[y:y + height, x:x + width] = cv2.addWeighted(roi, 0.15, tint, 0.85, 0)
        cv2.rectangle(canvas, (x, y), (x + width, y + height), (40, 55, 75), 1)

        # Header
        if title:
            cv2.putText(canvas, title, (x + 12, y + 16), cv2.FONT_HERSHEY_DUPLEX, 0.38, (0, 215, 255), 1)

        plot_y = y + 24
        plot_h = height - 32
        gap = 3
        band_w = max(4, int((width - 24 - (self.num_bands - 1) * gap) / self.num_bands))

        for i in range(self.num_bands):
            bx = x + 12 + i * (band_w + gap)
            bar_val = max(0.04, min(1.0, self.levels[i]))
            bar_px = int(bar_val * plot_h)
            by = plot_y + plot_h - bar_px

            # Color gradient from Cyan (low frequencies) to Emerald (mid) to Gold/Red (highs)
            t = i / float(self.num_bands - 1)
            b_col = int(255 * (1.0 - t))
            g_col = int(160 + 95 * math.sin(t * math.pi))
            r_col = int(255 * t)
            col = (b_col, g_col, r_col)

            # Draw bar
            cv2.rectangle(canvas, (bx, by), (bx + band_w, plot_y + plot_h), col, -1)

            # Peak hold cap
            peak_val = max(0.04, min(1.0, self.peaks[i]))
            peak_y = plot_y + plot_h - int(peak_val * plot_h)
            cv2.line(canvas, (bx, peak_y), (bx + band_w, peak_y), (255, 255, 255), 2)


class AccompanimentEngine:
    """Intelligent Backing Rhythm & Jam Machine."""
    def __init__(self, initial_bpm=100):
        self.bpm = initial_bpm
        self.is_playing = False
        self.style_idx = 0
        self.current_step = 0
        self.current_beat = 1
        self.volume = 0.85

        self.samples = _synthesize_percussion_bank()
        self.visualizer = AudioSpectrumVisualizer(num_bands=16)

        self._lock = threading.Lock()
        self._running = True
        self._thread = threading.Thread(target=self._clock_loop, daemon=True)
        self._thread.start()

    def toggle(self):
        with self._lock:
            self.is_playing = not self.is_playing
            if self.is_playing:
                self.current_step = 0
                self.current_beat = 1
        return self.is_playing

    def next_style(self):
        with self._lock:
            self.style_idx = (self.style_idx + 1) % len(STYLES)
            self.current_step = 0
            self.current_beat = 1
        return STYLES[self.style_idx]

    def set_bpm(self, bpm):
        with self._lock:
            self.bpm = max(50, min(180, bpm))

    def change_bpm(self, delta):
        self.set_bpm(self.bpm + delta)

    def current_style_info(self):
        return STYLES[self.style_idx]

    def _clock_loop(self):
        while self._running:
            if not self.is_playing:
                time.sleep(0.02)
                continue

            style = STYLES[self.style_idx]
            steps = style["steps"]
            # 8 steps in 4/4 time = 2 steps per quarter beat
            step_duration = (60.0 / self.bpm) / (steps / 4.0)

            t0 = time.perf_counter()

            # Trigger sounds on current step
            step_tracks = style["tracks"].get(self.current_step, [])
            for sound_key, gain in step_tracks:
                snd = self.samples.get(sound_key)
                if snd:
                    snd.set_volume(self.volume * gain)
                    snd.play()

                # Trigger spectrum equalizer bands
                if sound_key == 'kick':
                    self.visualizer.trigger_energy((0, 4), amount=0.90)
                elif sound_key in ('snare', 'rim', 'metro_lo'):
                    self.visualizer.trigger_energy((4, 10), amount=0.85)
                elif sound_key in ('hihat', 'open_hihat', 'sagat', 'riqq', 'metro_hi'):
                    self.visualizer.trigger_energy((10, 16), amount=0.80)

            # Advance beat and step
            self.current_beat = (self.current_step // (steps // 4)) + 1
            self.current_step = (self.current_step + 1) % steps

            # Accurate sub-millisecond sleep
            elapsed = time.perf_counter() - t0
            sleep_time = max(0.001, step_duration - elapsed)
            time.sleep(sleep_time)

    def stop(self):
        self._running = False
        self.is_playing = False

    def draw_hud_panel(self, canvas, x, y, width=280, height=130):
        """Renders an elegant glassmorphic control module with 4-beat LED step lights."""
        h_canv, w_canv = canvas.shape[:2]
        if x + width > w_canv or y + height > h_canv:
            return

        # Glass panel ROI
        roi = canvas[y:y + height, x:x + width]
        tint = np.full_like(roi, (14, 20, 34))
        canvas[y:y + height, x:x + width] = cv2.addWeighted(roi, 0.12, tint, 0.88, 0)
        cv2.rectangle(canvas, (x, y), (x + width, y + height), (0, 215, 255), 1)

        # Title & Toggle state
        cv2.putText(canvas, "JAM ACCOMPANIMENT [B]", (x + 14, y + 22), cv2.FONT_HERSHEY_DUPLEX, 0.44, (0, 215, 255), 1)
        status_str = "PLAYING" if self.is_playing else "STANDBY"
        status_col = (0, 240, 90) if self.is_playing else (120, 140, 165)
        cv2.putText(canvas, status_str, (x + width - 85, y + 22), cv2.FONT_HERSHEY_DUPLEX, 0.42, status_col, 1)

        # Style Name
        style = STYLES[self.style_idx]
        style_txt = f"STYLE [S]: {style['name_en']}"
        cv2.putText(canvas, style_txt, (x + 14, y + 50), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1)

        # Tempo & Keys
        bpm_txt = f"TEMPO: {self.bpm} BPM  ([+] / [-])"
        cv2.putText(canvas, bpm_txt, (x + 14, y + 78), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 230, 255), 1)

        # 4-Beat LED Indicators
        cv2.putText(canvas, "BEAT:", (x + 14, y + 108), cv2.FONT_HERSHEY_DUPLEX, 0.40, (180, 200, 220), 1)
        for b in range(1, 5):
            bx = x + 72 + (b - 1) * 44
            by = y + 104
            is_active_beat = self.is_playing and (self.current_beat == b)

            if is_active_beat:
                led_col = (0, 215, 255) if b == 1 else (0, 240, 90)
                cv2.circle(canvas, (bx, by), 8, led_col, -1)
                cv2.circle(canvas, (bx, by), 10, (255, 255, 255), 1)
            else:
                cv2.circle(canvas, (bx, by), 6, (35, 48, 68), -1)
                cv2.circle(canvas, (bx, by), 6, (60, 80, 110), 1)

            cv2.putText(canvas, str(b), (bx - 3, by + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (255, 255, 255), 1)
