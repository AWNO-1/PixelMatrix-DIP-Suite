// ESM shim for @mediapipe/pose in Vite
import '../node_modules/@mediapipe/pose/pose.js';

const g = typeof window !== 'undefined' ? window : globalThis;
const Pose = g.Pose;
const POSE_CONNECTIONS = g.POSE_CONNECTIONS;
const POSE_LANDMARKS = g.POSE_LANDMARKS;
const POSE_LANDMARKS_LEFT = g.POSE_LANDMARKS_LEFT;
const POSE_LANDMARKS_RIGHT = g.POSE_LANDMARKS_RIGHT;
const POSE_LANDMARKS_NEUTRAL = g.POSE_LANDMARKS_NEUTRAL;
const VERSION = g.VERSION;

export {
  Pose,
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  POSE_LANDMARKS_NEUTRAL,
  VERSION
};

export default {
  Pose,
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  POSE_LANDMARKS_NEUTRAL,
  VERSION
};
