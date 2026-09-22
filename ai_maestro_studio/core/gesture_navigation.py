"""
AI Maestro Studio - Touchless Gesture Navigation Engine (Phase 4)
==================================================================
Enables full hands-free touchless interaction for the Master Launcher:
1. Real-time high-speed hand tracking & holographic cursor with exponential LERP smoothing.
2. Dual Trigger Mechanisms:
   - Smooth Dwell Ring Countdown (Hold on any card for ~1.0 second).
   - Instant Pinch Trigger (Index + Thumb tap / pinch).
3. Cyber Reticle HUD: Rotating segmented rings, pulsing core, and particle trailing.
4. Touchless Team Showcase Modal activation and dismissal.
"""

import os
import sys
import time
import math
import cv2
import numpy as np
import mediapipe as mp


class TouchlessGestureNavigator:
    def __init__(self, hand_task_path, canvas_w=1280, canvas_h=720):
        self.w = canvas_w
        self.h = canvas_h
        self.enabled = True
        self.camera_feed_visible = True

        # Smoothing and state
        self.cursor_x = canvas_w // 2
        self.cursor_y = canvas_h // 2
        self.target_x = self.cursor_x
        self.target_y = self.cursor_y
        self.smooth_alpha = 0.38

        self.has_hand = False
        self.is_pinching = False
        self.pinch_dist = 999.0
        self.pinch_cooldown = 0

        # Dwell state
        self.hovered_card_idx = None
        self.hovered_team_btn = False
        self.dwell_timer = 0
        self.dwell_target = 30  # ~1.0 second at 30 FPS
        self.last_action_time = 0.0

        # MediaPipe initialization
        self.landmarker = None
        if os.path.exists(hand_task_path):
            try:
                base_opts = mp.tasks.BaseOptions(model_asset_path=hand_task_path)
                opts = mp.tasks.vision.HandLandmarkerOptions(
                    base_options=base_opts,
                    running_mode=mp.tasks.vision.RunningMode.IMAGE,
                    num_hands=1,
                    min_hand_detection_confidence=0.50,
                    min_hand_presence_confidence=0.50,
                    min_tracking_confidence=0.50
                )
                self.landmarker = mp.tasks.vision.HandLandmarker.create_from_options(opts)
            except Exception as e:
                print(f"[WARN] Gesture landmarker init error: {e}")
                self.landmarker = None

    def process_camera_frame(self, frame_bgr):
        """Processes camera frame and tracks hand coordinates."""
        if not self.enabled or self.landmarker is None:
            self.has_hand = False
            return

        h_f, w_f = frame_bgr.shape[:2]
        # Downscale for CPU inference (<18ms)
        small = cv2.resize(frame_bgr, (640, 360))
        rgb_small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)

        try:
            results = self.landmarker.detect(mp_img)
        except Exception:
            self.has_hand = False
            return

        if results.hand_landmarks and len(results.hand_landmarks) > 0:
            self.has_hand = True
            lms = results.hand_landmarks[0]

            # Index fingertip (landmark 8) and Thumb tip (landmark 4)
            idx_x = int(lms[8].x * self.w)
            idx_y = int(lms[8].y * self.h)

            th_x = int(lms[4].x * self.w)
            th_y = int(lms[4].y * self.h)

            # Midpoint or Index tip
            self.target_x = idx_x
            self.target_y = idx_y

            # Pinch distance
            self.pinch_dist = math.hypot(th_x - idx_x, th_y - idx_y)
            was_pinching = self.is_pinching
            self.is_pinching = (self.pinch_dist < 45.0)

            # Exponential smoothing
            self.cursor_x = int(self.cursor_x * (1.0 - self.smooth_alpha) + self.target_x * self.smooth_alpha)
            self.cursor_y = int(self.cursor_y * (1.0 - self.smooth_alpha) + self.target_y * self.smooth_alpha)
        else:
            self.has_hand = False
            self.is_pinching = False
            self.dwell_timer = 0
            self.hovered_card_idx = None
            self.hovered_team_btn = False

        if self.pinch_cooldown > 0:
            self.pinch_cooldown -= 1

    def update_touchless_actions(self, card_boxes, team_btn_rect, is_team_modal_open):
        """
        Calculates hover and triggers actions via Dwell or Pinch.
        Returns: (triggered_action, action_type, dwell_progress_ratio)
        action_type can be: 'mode', 'team', None
        """
        if not self.has_hand or not self.enabled:
            self.dwell_timer = 0
            self.hovered_card_idx = None
            self.hovered_team_btn = False
            return None, None, 0.0

        now = time.time()
        if now - self.last_action_time < 1.2:
            return None, None, 0.0

        cx, cy = self.cursor_x, self.cursor_y

        # 1. Team button check
        bx1, by1, bx2, by2 = team_btn_rect
        if bx1 <= cx <= bx2 and by1 <= cy <= by2:
            self.hovered_team_btn = True
            self.hovered_card_idx = None
            self.dwell_timer += 1
            ratio = min(1.0, self.dwell_timer / float(self.dwell_target))

            if self.is_pinching and self.pinch_cooldown <= 0:
                self.pinch_cooldown = 25
                self.last_action_time = now
                self.dwell_timer = 0
                return True, 'team', 1.0

            if self.dwell_timer >= self.dwell_target:
                self.dwell_timer = 0
                self.last_action_time = now
                return True, 'team', 1.0

            return None, 'team', ratio

        self.hovered_team_btn = False

        # If team modal is open, clicking anywhere or pinch closes it
        if is_team_modal_open:
            if self.is_pinching and self.pinch_cooldown <= 0:
                self.pinch_cooldown = 25
                self.last_action_time = now
                return True, 'team', 1.0
            return None, None, 0.0

        # 2. Check 6 mode cards
        hovered_idx = None
        for idx, (x1, y1, x2, y2) in enumerate(card_boxes):
            if x1 <= cx <= x2 and y1 <= cy <= y2:
                hovered_idx = idx
                break

        if hovered_idx is not None:
            if hovered_idx == self.hovered_card_idx:
                self.dwell_timer += 1
            else:
                self.hovered_card_idx = hovered_idx
                self.dwell_timer = 1

            ratio = min(1.0, self.dwell_timer / float(self.dwell_target))

            # Instant pinch trigger
            if self.is_pinching and self.pinch_cooldown <= 0:
                self.pinch_cooldown = 25
                self.last_action_time = now
                self.dwell_timer = 0
                return hovered_idx, 'mode', 1.0

            # Dwell trigger
            if self.dwell_timer >= self.dwell_target:
                self.dwell_timer = 0
                self.last_action_time = now
                return hovered_idx, 'mode', 1.0

            return None, 'mode', ratio
        else:
            self.hovered_card_idx = None
            self.dwell_timer = 0
            return None, None, 0.0

    def draw_cursor(self, canvas, anim_tick, stardust=None):
        """Draws the futuristic cyberpunk holographic cursor with dynamic reticle."""
        if not self.has_hand or not self.enabled:
            return

        cx, cy = self.cursor_x, self.cursor_y

        if stardust:
            stardust.emit(cx, cy, count=1, speed_scale=0.5)

        # Reticle colors
        if self.is_pinching:
            ring_col = (0, 255, 120)     # Neon Green on pinch
            core_col = (0, 255, 255)
        elif self.dwell_timer > 0:
            ring_col = (0, 215, 255)     # Gold on dwell
            core_col = (0, 240, 255)
        else:
            ring_col = (255, 215, 0)     # Cyan normal
            core_col = (255, 255, 255)

        # Rotating outer segmented ring
        base_r = 22
        pulse = math.sin(anim_tick * 0.25) * 2
        r = int(base_r + pulse)
        rot_angle = (anim_tick * 4) % 360

        # Draw 3 circular arc segments
        for seg in range(3):
            start_a = rot_angle + seg * 120
            end_a = start_a + 80
            cv2.ellipse(canvas, (cx, cy), (r, r), 0, start_a, end_a, ring_col, 2, cv2.LINE_AA)

        # Crosshairs
        c_len = 8
        cv2.line(canvas, (cx - r - c_len, cy), (cx - r + 2, cy), ring_col, 1)
        cv2.line(canvas, (cx + r - 2, cy), (cx + r + c_len, cy), ring_col, 1)
        cv2.line(canvas, (cx, cy - r - c_len), (cx, cy - r + 2), ring_col, 1)
        cv2.line(canvas, (cx, cy + r - 2), (cx, cy + r + c_len), ring_col, 1)

        # Inner pulsing core
        core_r = 4 if not self.is_pinching else 6
        cv2.circle(canvas, (cx, cy), core_r, core_col, -1, cv2.LINE_AA)
        cv2.circle(canvas, (cx, cy), core_r + 2, (255, 255, 255), 1, cv2.LINE_AA)

        # Dwell progress circular bar
        if self.dwell_timer > 0:
            ratio = min(1.0, self.dwell_timer / float(self.dwell_target))
            deg = int(ratio * 360)
            cv2.ellipse(canvas, (cx, cy), (r + 7, r + 7), -90, 0, deg, (0, 240, 90), 3, cv2.LINE_AA)
            cv2.circle(canvas, (cx, cy), r + 7, (45, 60, 80), 1, cv2.LINE_AA)

        # Subtle floating HUD badge
        lbl = "PINCH / HOLD" if self.dwell_timer > 0 else "GESTURE CURSOR"
        cv2.putText(canvas, lbl, (cx + r + 12, cy + 4), cv2.FONT_HERSHEY_DUPLEX, 0.38, ring_col, 1, cv2.LINE_AA)

    def close(self):
        if self.landmarker:
            try:
                self.landmarker.close()
            except Exception:
                pass
