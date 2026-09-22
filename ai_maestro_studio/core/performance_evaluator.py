"""
AI Maestro Studio - Conductor Performance Analytics & Evaluation Engine
=======================================================================
Provides an executive academic performance evaluation system for the Virtual Conductor:
1. Continuous biometric telemetry collection:
   - Tempo Accuracy: proximity of conducted BPM to target score tempo.
   - Beat Consistency: low variance and regular cadence of inter-beat intervals (IBI).
   - Motion Stability: kinematic smoothness of hand arc vectors without erratic jitter.
   - Gesture Recognition Precision: deep learning BiLSTM classification confidence.
2. Overall weighted scoring with academic letter grade (A+, A, B, C).
3. Futuristic glassmorphic Performance Report modal overlay ([E] or track finish).
"""

import math
import time
import cv2
import numpy as np
try:
    from text_renderer import draw_text_bgr, draw_text_batch
except Exception:
    from .text_renderer import draw_text_bgr, draw_text_batch


class ConductorPerformanceTracker:
    def __init__(self):
        self.is_open = False
        self.open_time = 0.0
        self.close_btn_rect = (0, 0, 0, 0)

        # Telemetry histories
        self.tempo_samples = []
        self.beat_intervals = []
        self.wrist_velocities = []
        self.confidences = []
        self.last_beat_time = None

        # Evaluated metrics
        self.tempo_accuracy = 92.0
        self.beat_consistency = 89.0
        self.motion_stability = 94.0
        self.gesture_precision = 91.0
        self.overall_score = 91.5
        self.grade = "A+"
        self.feedback_en = "Outstanding Dynamic Expression & Tempo Control"
        self.feedback_ar = "تحكم ممتاز في الإيقاع وانسجام حركي فائق مع الأوركسترا"

    def record_frame(self, target_bpm, conducted_bpm, wrist_pos, confidence, is_beat=False):
        """Records a single telemetry frame from the conductor loop."""
        now = time.time()

        # 1. Tempo Accuracy
        if conducted_bpm > 0 and target_bpm > 0:
            err = abs(conducted_bpm - target_bpm) / float(target_bpm)
            acc = max(40.0, min(100.0, (1.0 - err) * 100.0))
            self.tempo_samples.append(acc)
            if len(self.tempo_samples) > 200:
                self.tempo_samples.pop(0)

        # 2. Beat Consistency
        if is_beat:
            if self.last_beat_time is not None:
                ibi = now - self.last_beat_time
                if 0.25 <= ibi <= 2.0:
                    self.beat_intervals.append(ibi)
                    if len(self.beat_intervals) > 50:
                        self.beat_intervals.pop(0)
            self.last_beat_time = now

        # 3. Motion Stability
        if wrist_pos is not None:
            self.wrist_velocities.append(wrist_pos)
            if len(self.wrist_velocities) > 60:
                self.wrist_velocities.pop(0)

        # 4. Gesture Confidence
        if confidence > 0.0:
            self.confidences.append(confidence * 100.0)
            if len(self.confidences) > 100:
                self.confidences.pop(0)

    def calculate_report(self):
        """Computes comprehensive score and academic grading."""
        # Tempo Accuracy
        if self.tempo_samples:
            self.tempo_accuracy = float(np.mean(self.tempo_samples))
        else:
            self.tempo_accuracy = 91.0

        # Beat Consistency (Inverse of standard deviation of IBI)
        if len(self.beat_intervals) >= 4:
            std_ibi = float(np.std(self.beat_intervals))
            # Standard deviation < 0.05s is 100%, > 0.35s is 50%
            cons = max(45.0, min(100.0, 100.0 - (std_ibi / 0.35) * 55.0))
            self.beat_consistency = cons
        else:
            self.beat_consistency = 88.0

        # Motion Stability
        if len(self.wrist_velocities) >= 6:
            pts = np.array(self.wrist_velocities)
            diffs = np.linalg.norm(np.diff(pts, axis=0), axis=1)
            diff_std = float(np.std(diffs))
            stab = max(50.0, min(100.0, 100.0 - (diff_std / 25.0) * 45.0))
            self.motion_stability = stab
        else:
            self.motion_stability = 93.0

        # Gesture Precision
        if self.confidences:
            self.gesture_precision = float(np.mean(self.confidences))
        else:
            self.gesture_precision = 90.0

        # Overall Weighted Score
        self.overall_score = (
            self.tempo_accuracy * 0.30 +
            self.beat_consistency * 0.25 +
            self.motion_stability * 0.25 +
            self.gesture_precision * 0.20
        )

        if self.overall_score >= 93.0:
            self.grade = "A+"
            self.feedback_en = "Masterful Conducting — Outstanding Precision & Expression"
            self.feedback_ar = "أداء استثنائي بدرجة مايسترو — دقة متناهية وتعبير أوركسترالي مبهر"
        elif self.overall_score >= 85.0:
            self.grade = "A"
            self.feedback_en = "Excellent Tempo Control & Dynamic Coordination"
            self.feedback_ar = "أداء ممتاز — تحكم عالي في الإيقاع وانسجام حركي متميز"
        elif self.overall_score >= 75.0:
            self.grade = "B"
            self.feedback_en = "Good Performance — Practice Consistent Downbeat Intervals"
            self.feedback_ar = "أداء جيد — يُنصح بالتركيز على انتظام توقيت الضربة الأولى"
        else:
            self.grade = "C"
            self.feedback_en = "Developing Conductor — Stabilize Hand Arc Trajectories"
            self.feedback_ar = "أداء متنامٍ — يُنصح بتثبيت مسار القوس وتقليل الحركات المفاجئة"

    def toggle(self):
        self.is_open = not self.is_open
        if self.is_open:
            self.calculate_report()
            self.open_time = time.time()

    def show(self):
        self.calculate_report()
        self.is_open = True
        self.open_time = time.time()

    def hide(self):
        self.is_open = False

    def handle_click(self, x, y):
        if not self.is_open:
            return False
        bx1, by1, bx2, by2 = self.close_btn_rect
        if bx1 <= x <= bx2 and by1 <= y <= by2:
            self.hide()
            return True
        return True

    def render(self, frame):
        if not self.is_open:
            return frame

        h, w = frame.shape[:2]

        # 1. Dark Glassmorphic Backdrop
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (5, 8, 16), -1)
        cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)

        # 2. Modal Window Dimensions
        mw = min(1080, w - 80)
        mh = min(620, h - 60)
        mx = (w - mw) // 2
        my = (h - mh) // 2

        # Card container with glassmorphic tint
        card_bg = frame.copy()
        cv2.rectangle(card_bg, (mx, my), (mx + mw, my + mh), (12, 18, 30), -1)
        cv2.addWeighted(card_bg, 0.94, frame, 0.06, 0, frame)

        # Outer Neon Border
        cv2.rectangle(frame, (mx, my), (mx + mw, my + mh), (0, 215, 255), 2)
        cv2.rectangle(frame, (mx - 3, my - 3), (mx + mw + 3, my + mh + 3), (255, 240, 0), 1)

        # Corner accents
        c_len = 24
        cv2.line(frame, (mx, my), (mx + c_len, my), (255, 255, 255), 3)
        cv2.line(frame, (mx, my), (mx, my + c_len), (255, 255, 255), 3)
        cv2.line(frame, (mx + mw, my), (mx + mw - c_len, my), (255, 255, 255), 3)
        cv2.line(frame, (mx + mw, my), (mx + mw, my + c_len), (255, 255, 255), 3)
        cv2.line(frame, (mx, my + mh), (mx + c_len, my + mh), (255, 255, 255), 3)
        cv2.line(frame, (mx, my + mh), (mx, my + mh - c_len), (255, 255, 255), 3)
        cv2.line(frame, (mx + mw, my + mh), (mx + mw - c_len, my + mh), (255, 255, 255), 3)
        cv2.line(frame, (mx + mw, my + mh), (mx + mw, my + mh - c_len), (255, 255, 255), 3)

        # Close Button [X]
        close_x = mx + mw - 45
        close_y = my + 15
        self.close_btn_rect = (close_x - 5, close_y - 5, close_x + 35, close_y + 35)
        cv2.rectangle(frame, (close_x - 5, close_y), (close_x + 30, close_y + 30), (30, 35, 60), -1)
        cv2.rectangle(frame, (close_x - 5, close_y), (close_x + 30, close_y + 30), (0, 100, 255), 1)
        cv2.line(frame, (close_x + 2, close_y + 7), (close_x + 23, close_y + 23), (255, 255, 255), 2)
        cv2.line(frame, (close_x + 23, close_y + 7), (close_x + 2, close_y + 23), (255, 255, 255), 2)

        # Header Title
        cv2.putText(frame, "AI MAESTRO -- BIOMETRIC PERFORMANCE EVALUATION",
                    (mx + 40, my + 45), cv2.FONT_HERSHEY_DUPLEX, 0.68, (255, 255, 255), 2)

        text_batch = []
        text_batch.append({
            "text": "تقرير التقييم البيوميتري الذكي لقيادة الأوركسترا",
            "pos": (mx + 40, my + 60),
            "size": 16,
            "color": (0, 215, 255),
            "align": "left",
            "font": "tahoma.ttf"
        })

        # Divider
        cv2.line(frame, (mx + 30, my + 95), (mx + mw - 30, my + 95), (45, 65, 95), 1)

        # Left Column: Big Circular Overall Score
        circle_cx = mx + 160
        circle_cy = my + 250
        circle_r = 95

        cv2.circle(frame, (circle_cx, circle_cy), circle_r, (25, 35, 55), 8, cv2.LINE_AA)
        deg = int((self.overall_score / 100.0) * 360)
        cv2.ellipse(frame, (circle_cx, circle_cy), (circle_r, circle_r), -90, 0, deg, (0, 240, 90), 9, cv2.LINE_AA)

        score_txt = f"{int(self.overall_score)}%"
        cv2.putText(frame, score_txt, (circle_cx - 56, circle_cy + 14),
                    cv2.FONT_HERSHEY_DUPLEX, 1.4, (255, 255, 255), 3)

        cv2.putText(frame, f"GRADE {self.grade}", (circle_cx - 48, circle_cy + 48),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 215, 255), 2)

        text_batch.append({
            "text": "التقييم الإجمالي العام",
            "pos": (circle_cx, circle_cy + 130),
            "size": 14,
            "color": (210, 230, 255),
            "align": "center",
            "font": "tahoma.ttf"
        })

        # Right Column: Detailed Metric Breakdown
        rx1 = mx + 340
        rw = mw - 380

        metrics = [
            ("Tempo Accuracy", "دقة الحفاظ على الإيقاع المستهدف", self.tempo_accuracy, (0, 215, 255)),
            ("Beat Consistency", "انتظام الفترات بين النبضات (IBI)", self.beat_consistency, (0, 240, 90)),
            ("Motion Stability", "انسيابية واستقرار مسار حركة اليد", self.motion_stability, (255, 215, 0)),
            ("Gesture Precision", "دقة واستجابة نموذج الذكاء الاصطناعي", self.gesture_precision, (255, 120, 240))
        ]

        metric_y_start = my + 135
        row_h = 75

        for i, (name_en, name_ar, val, col) in enumerate(metrics):
            y_base = metric_y_start + i * row_h

            cv2.putText(frame, name_en, (rx1, y_base), cv2.FONT_HERSHEY_DUPLEX, 0.52, (255, 255, 255), 1)
            cv2.putText(frame, f"{val:.1f}%", (rx1 + rw - 70, y_base), cv2.FONT_HERSHEY_DUPLEX, 0.60, col, 2)

            text_batch.append({
                "text": name_ar,
                "pos": (rx1 + 220, y_base - 14),
                "size": 13,
                "color": (180, 200, 225),
                "align": "left",
                "font": "tahoma.ttf"
            })

            # Progress Bar Track
            bar_y = y_base + 12
            cv2.rectangle(frame, (rx1, bar_y), (rx1 + rw, bar_y + 12), (25, 35, 55), -1)
            fill_w = int(rw * (max(0.0, min(100.0, val)) / 100.0))
            cv2.rectangle(frame, (rx1, bar_y), (rx1 + fill_w, bar_y + 12), col, -1)
            cv2.rectangle(frame, (rx1, bar_y), (rx1 + rw, bar_y + 12), (50, 70, 95), 1)

        # Bottom Feedback Card inside Modal
        card_fb_y = my + mh - 130
        draw_glass_panel(frame, mx + 30, card_fb_y, mx + mw - 30, my + mh - 25, (16, 24, 40), 0.88)
        cv2.rectangle(frame, (mx + 30, card_fb_y), (mx + mw - 30, my + mh - 25), (0, 215, 255), 1)

        cv2.putText(frame, "PEDAGOGICAL RECOMMENDATION & FEEDBACK:",
                    (mx + 50, card_fb_y + 26), cv2.FONT_HERSHEY_DUPLEX, 0.46, (255, 240, 0), 1)
        cv2.putText(frame, self.feedback_en,
                    (mx + 50, card_fb_y + 52), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)

        text_batch.append({
            "text": "التوجيه البيداغوجي: " + self.feedback_ar,
            "pos": (mx + mw - 60, card_fb_y + 58),
            "size": 14,
            "color": (0, 240, 140),
            "align": "right",
            "font": "tahoma.ttf"
        })

        frame = draw_text_batch(frame, text_batch)
        return frame


def draw_glass_panel(canvas, x1, y1, x2, y2, color_bgr=(15, 22, 35), alpha=0.88):
    h, w = canvas.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return
    roi = canvas[y1:y2, x1:x2]
    bg = np.full_like(roi, color_bgr, dtype=np.uint8)
    canvas[y1:y2, x1:x2] = cv2.addWeighted(bg, alpha, roi, 1.0 - alpha, 0)
