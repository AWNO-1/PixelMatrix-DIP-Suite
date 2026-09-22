"""
AI Maestro Studio - Rhythm Game Challenge
=========================================
Features:
- Falling target orbs corresponding to orchestral gestures
- Full pose & hand sequence recognition via PyTorch BiLSTM
- Live orchestral response (tempo/volume shifts on hits/misses)
- Dynamic score & multiplier HUD
- Integrated Luxury Team Showcase Modal ([T] or click button)
- Clean quit back to studio launcher via [Q] / [ESC]
"""

import os
import sys
import time
import random
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
from text_renderer import draw_text_bgr
from audio_engine import EnhancedOrchestraEngine
from ui_components import draw_glass_panel, draw_team_button

SEQUENCE_LENGTH = 30
CONFIDENCE_THRESHOLD = 0.60
GESTURE_COOLDOWN = 1.0

GESTURE_NAMES = ['left_swipe', 'right_swipe', 'stop', 'thumbs_down', 'thumbs_up']
GESTURE_COLORS = {
    'left_swipe':  (255, 100, 0),
    'right_swipe': (0, 100, 255),
    'stop':        (0, 0, 220),
    'thumbs_down': (0, 200, 200),
    'thumbs_up':   (0, 220, 0),
    'waiting...':  (100, 100, 100),
}
GESTURE_SYMBOLS = {
    'left_swipe':  '<< SWIPE LEFT',
    'right_swipe': 'SWIPE RIGHT >>',
    'stop':        'STOP!',
    'thumbs_down': 'THUMBS DOWN',
    'thumbs_up':   'THUMBS UP',
}

POSE_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (24, 26), (26, 28)
]


class Ball:
    def __init__(self, w, h):
        self.gesture = random.choice(GESTURE_NAMES)
        self.radius = 45
        self.color = GESTURE_COLORS[self.gesture]
        self.alive = True
        self.hit = False
        self.hit_timer = 0
        self.miss = False
        self.miss_timer = 0
        self.h = h
        self.w = w
        self.speed = random.randint(3, 6)
        self.y = 70

        if self.gesture == 'right_swipe':
            self.x = random.randint(w // 2 + 50, w - 80)
        elif self.gesture == 'left_swipe':
            self.x = random.randint(80, w // 2 - 50)
        else:
            self.x = random.randint(80, w - 80)

    def update(self):
        if self.alive and not self.hit:
            self.y += self.speed
            if self.y > self.h - 100:
                self.miss = True
                self.alive = False
                self.miss_timer = 20
        if self.hit_timer > 0:
            self.hit_timer -= 1
        if self.miss_timer > 0:
            self.miss_timer -= 1

    def draw(self, frame):
        if self.alive:
            cv2.circle(frame, (self.x, self.y), self.radius, self.color, -1)
            cv2.circle(frame, (self.x, self.y), self.radius, (255, 255, 255), 2)
            symbol = GESTURE_SYMBOLS[self.gesture]
            font_scale = 0.45
            text_size = cv2.getTextSize(symbol, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)[0]
            tx = self.x - text_size[0] // 2
            ty = self.y + text_size[1] // 2
            cv2.putText(frame, symbol, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 1)

        if self.hit_timer > 0:
            radius = self.radius + (20 - self.hit_timer) * 3
            alpha_val = self.hit_timer / 20.0
            overlay = frame.copy()
            cv2.circle(overlay, (self.x, self.y), radius, self.color, -1)
            cv2.addWeighted(overlay, alpha_val * 0.5, frame, 1 - alpha_val * 0.5, 0, frame)
            cv2.putText(frame, 'PERFECT HIT!', (self.x - 45, self.y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 100), 2)

        if self.miss_timer > 0:
            cv2.putText(frame, 'MISS', (self.x - 25, self.h - 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.95, (0, 0, 255), 2)


def extract_landmarks(frame, pose_landmarker, hand_landmarker):
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)

    pose_result = pose_landmarker.detect(mp_image)
    pose_lms_raw = None
    if pose_result.pose_landmarks:
        pose_lms_raw = pose_result.pose_landmarks[0]
        pose_kp = [[l.x, l.y, l.z, l.visibility] for l in pose_lms_raw]
    else:
        pose_kp = [[0.0] * 4] * 33

    hand_result = hand_landmarker.detect(mp_image)
    left_kp  = [[0.0] * 4] * 21
    right_kp = [[0.0] * 4] * 21
    if hand_result.hand_landmarks:
        for i, handedness in enumerate(hand_result.handedness):
            label = handedness[0].category_name
            kp = [[l.x, l.y, l.z, 1.0] for l in hand_result.hand_landmarks[i]]
            if label == 'Left':
                left_kp = kp
            else:
                right_kp = kp

    combined = np.array(pose_kp + left_kp + right_kp, dtype=np.float32)
    return combined, pose_lms_raw, hand_result


def predict_gesture(model, frame_buffer):
    seq = np.array(frame_buffer, dtype=np.float32)
    seq_flat = seq.reshape(SEQUENCE_LENGTH, -1)
    x = torch.tensor(seq_flat, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)
        conf, pred = probs.max(dim=1)
    return GESTURE_NAMES[pred.item()], conf.item()


def draw_skeleton(frame, pose_landmarks, hand_result, color=(0, 255, 0)):
    h, w = frame.shape[:2]
    if pose_landmarks:
        for a, b in POSE_CONNECTIONS:
            if a < len(pose_landmarks) and b < len(pose_landmarks):
                if pose_landmarks[a].visibility > 0.3 and pose_landmarks[b].visibility > 0.3:
                    ax = int(pose_landmarks[a].x * w)
                    ay = int(pose_landmarks[a].y * h)
                    bx = int(pose_landmarks[b].x * w)
                    by = int(pose_landmarks[b].y * h)
                    cv2.line(frame, (ax, ay), (bx, by), color, 2)
        for lm in pose_landmarks:
            if lm.visibility > 0.3:
                cx = int(lm.x * w)
                cy = int(lm.y * h)
                cv2.circle(frame, (cx, cy), 4, (255, 255, 255), -1)
                cv2.circle(frame, (cx, cy), 4, color, 1)
    if hand_result and hand_result.hand_landmarks:
        for hand_lms in hand_result.hand_landmarks:
            for lm in hand_lms:
                cx = int(lm.x * w)
                cy = int(lm.y * h)
                cv2.circle(frame, (cx, cy), 3, (255, 200, 0), -1)


def main():
    sf_path = os.path.join(ASSETS_DIR, 'orchestra.sf2')
    midi_path = os.path.join(ASSETS_DIR, 'orchestra.mid')
    engine = EnhancedOrchestraEngine(sf_path, midi_path)

    # Model
    model = MultiStreamGestureLSTM(num_classes=5)
    model.load_state_dict(torch.load(os.path.join(MODELS_DIR, 'finetuned_gesture_holistic.pt'), map_location='cpu'))
    model.eval()

    # MediaPipe
    BaseOptions = mp.tasks.BaseOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    pose_options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(MODELS_DIR, 'pose_landmarker.task')),
        running_mode=VisionRunningMode.IMAGE
    )
    hand_options = mp.tasks.vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(MODELS_DIR, 'hand_landmarker.task')),
        running_mode=VisionRunningMode.IMAGE,
        num_hands=2
    )

    cap = cv2.VideoCapture(0)
    window_name = 'AI Maestro Studio - Rhythm Game Challenge'
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

    mouse_params = {'team_btn': (1280 - 240, 14, 1280 - 30, 52)}
    cv2.setMouseCallback(window_name, mouse_callback, mouse_params)

    frame_buffer = deque(maxlen=SEQUENCE_LENGTH)
    current_gesture = "waiting..."
    confidence = 0.0
    frame_count = 0
    last_gesture_time = 0

    balls = []
    score = 0
    misses = 0
    spawn_timer = 0
    SPAWN_INTERVAL = 85

    with mp.tasks.vision.PoseLandmarker.create_from_options(pose_options) as pose_lm, \
         mp.tasks.vision.HandLandmarker.create_from_options(hand_options) as hand_lm:

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)
            frame = cv2.resize(frame, (1280, 720))
            h, w = frame.shape[:2]
            team_btn_rect = (w - 240, 14, w - 30, 52)
            mouse_params['team_btn'] = team_btn_rect

            # Downscale frame for 3x faster MediaPipe processing on CPU
            small_frame = cv2.resize(frame, (640, 360))
            rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            landmarks, pose_lms_raw, hand_result = extract_landmarks(rgb, pose_lm, hand_lm)
            frame_buffer.append(landmarks)

            # Hand Presence Guard: verify hands are actually in frame before running neural inference
            has_hands = bool(hand_result and hand_result.hand_landmarks and len(hand_result.hand_landmarks) > 0)
            if not has_hands and (pose_lms_raw and len(pose_lms_raw) > 16):
                if (pose_lms_raw[16].visibility > 0.35 and pose_lms_raw[16].y < 0.85) or \
                   (pose_lms_raw[15].visibility > 0.35 and pose_lms_raw[15].y < 0.85):
                    has_hands = True

            # Predict gesture only when hands are present
            now = time.time()
            if not team_modal.is_open and has_hands and len(frame_buffer) == SEQUENCE_LENGTH and frame_count % 8 == 0:
                gesture, conf = predict_gesture(model, frame_buffer)
                if conf >= CONFIDENCE_THRESHOLD and (now - last_gesture_time) > GESTURE_COOLDOWN:
                    current_gesture = gesture
                    confidence = conf
                    last_gesture_time = now

                    # Check hit on active balls
                    hit_any = False
                    for ball in balls:
                        if ball.alive and ball.gesture == gesture and ball.y > 100:
                            ball.hit = True
                            ball.alive = False
                            ball.hit_timer = 20
                            score += 100
                            hit_any = True
                            break

                    if hit_any:
                        if gesture == 'right_swipe':
                            engine.increase_tempo(0.15)
                        elif gesture == 'left_swipe':
                            engine.decrease_tempo(0.15)
                        elif gesture == 'thumbs_up':
                            engine.increase_volume(0.15)
                        elif gesture == 'thumbs_down':
                            engine.decrease_volume(0.15)
                        elif gesture == 'stop':
                            engine.silence()

                elif conf < 0.40 and (now - last_gesture_time) > 1.2:
                    current_gesture = "waiting..."
                    confidence = 0.0
            elif not has_hands:
                frame_buffer.clear()
                current_gesture = "no hands"
                confidence = 0.0

            # Spawn and update balls
            if not team_modal.is_open:
                spawn_timer += 1
                if spawn_timer >= SPAWN_INTERVAL:
                    balls.append(Ball(w, h))
                    spawn_timer = 0

                for ball in balls:
                    ball.update()
                    if ball.miss and ball.miss_timer == 19:
                        misses += 1

                balls = [b for b in balls if b.alive or b.hit_timer > 0 or b.miss_timer > 0]

            # Draw HUD
            # Skeleton
            draw_skeleton(frame, pose_lms_raw, hand_result)

            # Target line
            cv2.line(frame, (0, h - 100), (w, h - 100), (50, 50, 200), 2)
            cv2.putText(frame, 'HIT TARGET ZONE', (20, h - 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 255), 1)

            # Draw balls
            for ball in balls:
                ball.draw(frame)

            # Top bar (localized glass panel)
            draw_glass_panel(frame, 0, 0, w, 68, (14, 20, 32), 0.90)
            cv2.line(frame, (0, 68), (w, 68), (0, 215, 255), 2)
            cv2.line(frame, (0, 71), (w, 71), (255, 240, 0), 1)

            cv2.putText(frame, f"SCORE: {score}", (30, 42), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 240, 255), 2)
            cv2.putText(frame, f"MISSES: {misses}", (260, 42), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 80, 255), 2)

            color = GESTURE_COLORS.get(current_gesture, (150, 150, 150))
            lbl = f"DETECTED: {current_gesture.upper()}"
            if confidence > 0:
                lbl += f" ({confidence:.0%})"
            cv2.putText(frame, lbl, (500, 42), cv2.FONT_HERSHEY_DUPLEX, 0.68, color, 2)

            # Team Showcase Button
            frame = draw_team_button(frame, team_btn_rect)

            # Render Team Modal on top if open
            frame = team_modal.render(frame)

            cv2.imshow(window_name, frame)
            frame_count += 1

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                if team_modal.is_open:
                    team_modal.hide()
                else:
                    break
            elif key == ord('t') or key == ord('T'):
                team_modal.toggle()

    cap.release()
    cv2.destroyAllWindows()
    engine.stop()
    print("Rhythm game exited cleanly.")


if __name__ == '__main__':
    main()
