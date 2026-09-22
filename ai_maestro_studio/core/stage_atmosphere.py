"""
AI Maestro Studio - Stage Atmosphere and Theatrical VFX Engine (Phase 2)
========================================================================
High-performance visual and audio atmospheric effects:
1. Dynamic Stage Spotlights: Volumetric light cones reacting to conductor hands and volume.
2. Stardust Particle Trails: Golden spark physics trailing the maestro's baton and wrists.
3. Live Conducting BPM and Beat Synchronizer: Real-time stroke frequency and tempo matching.
4. Orchestra Silhouette: Classical musicians swaying rhythmically at the bottom edge.
5. Audience Applause and Bravo System: Procedural sound synthesis and 5-Star evaluation banner.
"""

import time
import math
import random
from collections import deque
import cv2
import numpy as np

try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False


class StardustParticle:
    __slots__ = ('x', 'y', 'vx', 'vy', 'life', 'max_life', 'color', 'size')
    def __init__(self, x, y, vx, vy, life, color, size):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.life = life
        self.max_life = life
        self.color = color
        self.size = size


class StardustParticleSystem:
    """Physics-based sparkling particle trail for conducting batons and hands."""
    def __init__(self, max_particles=150):
        self.particles = []
        self.max_particles = max_particles
        self.palette = [
            (0, 215, 255),   # Radiant Gold (BGR)
            (255, 255, 255), # Pure White
            (255, 220, 0),   # Cyan
            (0, 160, 255),   # Amber
            (255, 120, 220), # Amethyst Spark
        ]

    def emit(self, x, y, count=3, speed_scale=1.0):
        if x is None or y is None:
            return
        for _ in range(count):
            if len(self.particles) >= self.max_particles:
                break
            angle = random.uniform(0, 2 * math.pi)
            speed = random.uniform(1.2, 4.5) * speed_scale
            vx = math.cos(angle) * speed
            vy = math.sin(angle) * speed - random.uniform(0.5, 2.0)
            life = random.randint(14, 28)
            color = random.choice(self.palette)
            size = random.choice([2, 3, 4])
            self.particles.append(StardustParticle(x, y, vx, vy, life, color, size))

    def update(self):
        alive = []
        for p in self.particles:
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.18  # subtle gravity
            p.vx *= 0.94  # air drag
            p.vy *= 0.94
            p.life -= 1
            if p.life > 0:
                alive.append(p)
        self.particles = alive

    def draw(self, canvas):
        for p in self.particles:
            alpha = p.life / float(p.max_life)
            rad = max(1, int(p.size * alpha))
            ix, iy = int(p.x), int(p.y)
            if 0 <= ix < canvas.shape[1] and 0 <= iy < canvas.shape[0]:
                cv2.circle(canvas, (ix, iy), rad, p.color, -1)
                if rad >= 2:
                    cv2.circle(canvas, (ix, iy), rad + 2, (255, 255, 255), 1)


class StageSpotlightRenderer:
    """Dynamic volumetric theatrical spotlights tracking maestro movement."""
    def __init__(self):
        self.enabled = True
        self.color_idx = 0
        self.colors = [
            (0, 190, 255),   # Theatrical Amber Gold
            (255, 210, 0),   # Symphony Cyan
            (220, 100, 240), # Royal Amethyst
            (0, 240, 120),   # Emerald
        ]

    def draw(self, canvas, r_wrist, l_wrist, volume=0.85, anim_tick=0):
        if not self.enabled:
            return

        h, w = canvas.shape[:2]
        vol_factor = max(0.20, min(1.0, volume))
        pulse = math.sin(anim_tick * 0.04) * 0.15 + 0.85
        alpha = 0.10 * vol_factor * pulse

        # Downscaled lighting canvas for ultra-fast rendering (0.2 ms)
        lw, lh = 320, 180
        scale_x = lw / float(w)
        scale_y = lh / float(h)
        light_layer = np.zeros((lh, lw, 3), dtype=np.uint8)

        # Left Spotlight source (top ceiling left)
        src_left = (int(lw * 0.15), 0)
        # Right Spotlight source (top ceiling right)
        src_right = (int(lw * 0.85), 0)

        # Target 1 (right hand or center-right floor)
        if r_wrist:
            tgt1_x = int(r_wrist[0] * scale_x)
            tgt1_y = int(lh * 0.95)
        else:
            tgt1_x = int(lw * 0.60 + math.sin(anim_tick * 0.03) * 35)
            tgt1_y = int(lh * 0.95)

        # Target 2 (left hand or center-left floor)
        if l_wrist:
            tgt2_x = int(l_wrist[0] * scale_x)
            tgt2_y = int(lh * 0.95)
        else:
            tgt2_x = int(lw * 0.40 - math.sin(anim_tick * 0.03) * 35)
            tgt2_y = int(lh * 0.95)

        c1 = self.colors[0]
        c2 = self.colors[1]

        # Draw left cone
        cone_w = 42
        pts_left = np.array([
            src_left,
            (max(0, tgt1_x - cone_w), tgt1_y),
            (min(lw, tgt1_x + cone_w), tgt1_y)
        ], dtype=np.int32)
        cv2.fillPoly(light_layer, [pts_left], c1)

        # Draw right cone
        pts_right = np.array([
            src_right,
            (max(0, tgt2_x - cone_w), tgt2_y),
            (min(lw, tgt2_x + cone_w), tgt2_y)
        ], dtype=np.int32)
        cv2.fillPoly(light_layer, [pts_right], c2)

        # Floor illuminated pools
        cv2.ellipse(light_layer, (tgt1_x, tgt1_y - 6), (cone_w, 12), 0, 0, 360, c1, -1)
        cv2.ellipse(light_layer, (tgt2_x, tgt2_y - 6), (cone_w, 12), 0, 0, 360, c2, -1)

        # Fast upscale and additive blend
        light_full = cv2.resize(light_layer, (w, h), interpolation=cv2.INTER_LINEAR)
        cv2.addWeighted(light_full, alpha, canvas, 1.0, 0, canvas)


class OrchestraSilhouette:
    """Classic orchestra musicians and violin bows swaying gently at the stage bottom."""
    def __init__(self):
        self.enabled = True

    def draw(self, canvas, tempo_scale=1.0, anim_tick=0):
        if not self.enabled:
            return

        h, w = canvas.shape[:2]
        base_y = h - 52
        if base_y <= 120:
            return

        # Slower rhythmic sway matching current tempo
        sway = math.sin(anim_tick * 0.12 * tempo_scale)

        # Draw standing music stands and violinists on the flanks
        col_sil = (10, 14, 22)
        col_rim = (35, 48, 70)

        # Left flank violinists
        left_stands = [
            (int(w * 0.24), base_y - 28, 22, 38),
            (int(w * 0.32), base_y - 32, 24, 42),
            (int(w * 0.40), base_y - 25, 20, 35),
        ]
        # Right flank cellists and woodwinds
        right_stands = [
            (int(w * 0.60), base_y - 25, 20, 35),
            (int(w * 0.68), base_y - 32, 24, 42),
            (int(w * 0.76), base_y - 28, 22, 38),
        ]

        # Draw musicians
        for sx, sy, sw, sh in left_stands:
            cv2.ellipse(canvas, (sx, sy + 15), (sw // 2, sh // 2), 0, 0, 360, col_sil, -1)
            cv2.circle(canvas, (sx, sy - 8), 7, col_sil, -1)
            cv2.circle(canvas, (sx, sy - 8), 7, col_rim, 1)

            # Violin Bow swaying
            bow_x1 = sx - 10
            bow_y1 = sy + 4
            bow_x2 = int(sx + 24 + sway * 12)
            bow_y2 = int(sy - 12 - sway * 6)
            cv2.line(canvas, (bow_x1, bow_y1), (bow_x2, bow_y2), (70, 85, 110), 1)

        for sx, sy, sw, sh in right_stands:
            cv2.ellipse(canvas, (sx, sy + 15), (sw // 2, sh // 2), 0, 0, 360, col_sil, -1)
            cv2.circle(canvas, (sx, sy - 8), 7, col_sil, -1)
            cv2.circle(canvas, (sx, sy - 8), 7, col_rim, 1)

            # Bow swaying in counter rhythm
            bow_x1 = sx + 10
            bow_y1 = sy + 4
            bow_x2 = int(sx - 24 - sway * 12)
            bow_y2 = int(sy - 12 + sway * 6)
            cv2.line(canvas, (bow_x1, bow_y1), (bow_x2, bow_y2), (70, 85, 110), 1)


class ConductingBpmTracker:
    """Measures the physical arm oscillation frequency (BPM) and beat synchronization."""
    def __init__(self):
        self.history = deque(maxlen=90)  # ~3 seconds at 30 fps
        self.last_beat_time = time.time()
        self.beat_intervals = deque(maxlen=6)
        self.current_bpm = 100
        self.beat_match_pct = 95

    def update(self, wrist_pt, orchestra_tempo_scale=1.0):
        now = time.time()
        if wrist_pt is None:
            return self.current_bpm, self.beat_match_pct

        y = wrist_pt[1]
        self.history.append((y, now))

        if len(self.history) >= 6:
            y_curr = self.history[-1][0]
            y_prev = self.history[-3][0]
            y_older = self.history[-6][0]

            dir_now = 1 if (y_curr - y_prev) > 3 else (-1 if (y_curr - y_prev) < -3 else 0)
            dir_was = 1 if (y_prev - y_older) > 3 else (-1 if (y_prev - y_older) < -3 else 0)

            # Turned from moving downwards to moving upwards -> DOWNBEAT ICTUS!
            if dir_was == 1 and dir_now == -1:
                interval = now - self.last_beat_time
                if 0.28 < interval < 1.8:
                    self.beat_intervals.append(interval)
                    self.last_beat_time = now
                    avg_int = sum(self.beat_intervals) / float(len(self.beat_intervals))
                    raw_bpm = int(60.0 / avg_int)
                    self.current_bpm = int(self.current_bpm * 0.7 + raw_bpm * 0.3)

        expected_bpm = int(108 * orchestra_tempo_scale)
        diff = abs(self.current_bpm - expected_bpm)
        self.beat_match_pct = max(40, min(100, int(100 - diff * 0.85)))

        return self.current_bpm, self.beat_match_pct


class BravoSystem:
    """Audience applause audio synthesis and Bravo Performance Recognition modal."""
    def __init__(self):
        self.active_timer = 0
        self.sound = None
        self.grade = "S"
        self.stars = 5
        self.stats = {}
        self._init_audio()

    def _init_audio(self):
        if not PYGAME_AVAILABLE:
            return
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)

            sr = 44100
            dur = 3.5
            total_samples = int(sr * dur)
            t = np.linspace(0, dur, total_samples, endpoint=False)

            # Procedural Crowd Applause Synthesis:
            crowd = np.random.normal(0, 0.22, total_samples)
            envelope = np.clip(t / 0.4, 0, 1) * np.exp(-0.45 * np.maximum(0, t - 1.2))

            num_claps = int(dur * 35)
            clap_track = np.zeros(total_samples)
            for _ in range(num_claps):
                c_idx = random.randint(0, total_samples - 800)
                c_len = random.randint(300, 700)
                clap_shape = np.random.uniform(-0.8, 0.8, c_len) * np.exp(-np.linspace(0, 8, c_len))
                clap_track[c_idx:c_idx + c_len] += clap_shape

            applause = (crowd * 0.55 + clap_track * 0.45) * envelope
            applause = np.clip(applause, -0.95, 0.95)
            applause_16 = np.int16(applause * 32767)
            stereo = np.column_stack([applause_16, applause_16])
            self.sound = pygame.sndarray.make_sound(stereo)
        except Exception as e:
            print(f"Procedural audio init notice: {e}")

    def trigger(self, conducting_bpm=108, beat_match=95, song_title="Symphony No. 5"):
        self.active_timer = 110  # ~3.6 seconds at 30fps
        if beat_match >= 90:
            self.grade = "S (Virtuoso Maestro)"
            self.stars = 5
        elif beat_match >= 80:
            self.grade = "A (Master Conductor)"
            self.stars = 4
        else:
            self.grade = "B (Skilled Conductor)"
            self.stars = 3

        self.stats = {
            'bpm': conducting_bpm,
            'match': beat_match,
            'title': song_title
        }

        if self.sound:
            try:
                self.sound.play()
            except Exception:
                pass

    def draw(self, canvas):
        if self.active_timer <= 0:
            return canvas

        self.active_timer -= 1
        h, w = canvas.shape[:2]

        bw, bh = 540, 165
        bx1 = (w - bw) // 2
        by1 = 95
        bx2 = bx1 + bw
        by2 = by1 + bh

        # Theatrical glass banner with local ROI blending
        roi = canvas[by1:by2, bx1:bx2]
        tint = np.full_like(roi, (12, 16, 28))
        canvas[by1:by2, bx1:bx2] = cv2.addWeighted(roi, 0.12, tint, 0.88, 0)

        # Dual Gold and Cyan Borders
        cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (0, 215, 255), 2)
        cv2.rectangle(canvas, (bx1 - 3, by1 - 3), (bx2 + 3, by2 + 3), (255, 215, 0), 1)

        # Title
        t_str = "BRAVO MAESTRO!"
        sz_t = cv2.getTextSize(t_str, cv2.FONT_HERSHEY_DUPLEX, 0.95, 2)[0]
        cv2.putText(canvas, t_str, (bx1 + (bw - sz_t[0]) // 2, by1 + 38),
                    cv2.FONT_HERSHEY_DUPLEX, 0.95, (0, 240, 255), 2)

        # Stars
        stars_str = "* " * self.stars
        sz_s = cv2.getTextSize(stars_str, cv2.FONT_HERSHEY_DUPLEX, 0.80, 2)[0]
        cv2.putText(canvas, stars_str.strip(), (bx1 + (bw - sz_s[0]) // 2, by1 + 72),
                    cv2.FONT_HERSHEY_DUPLEX, 0.80, (255, 240, 0), 2)

        # Performance Grade
        g_lbl = f"Rank: {self.grade}"
        sz_g = cv2.getTextSize(g_lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.50, 1)[0]
        cv2.putText(canvas, g_lbl, (bx1 + (bw - sz_g[0]) // 2, by1 + 105),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 1)

        # Accuracy and BPM stats
        match_val = self.stats.get('match', 95)
        bpm_val = self.stats.get('bpm', 108)
        stat_lbl = f"Beat Match: {match_val}%  |  Conducting Pace: {bpm_val} BPM"
        sz_st = cv2.getTextSize(stat_lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)[0]
        cv2.putText(canvas, stat_lbl, (bx1 + (bw - sz_st[0]) // 2, by1 + 138),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 220, 120), 1)

        return canvas

