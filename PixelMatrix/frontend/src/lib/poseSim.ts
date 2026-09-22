import * as poseDetection from '@tensorflow-models/pose-detection'

import { normalizePose } from './normPose'
import { bodyKeypoints } from './types'
function distance(
  a: poseDetection.Keypoint,
  b: poseDetection.Keypoint
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function calculateAngle(
  a: poseDetection.Keypoint,
  b: poseDetection.Keypoint,
  c: poseDetection.Keypoint
): number {
  const ab: number = distance(a, b)
  const bc: number = distance(b, c)
  const ac: number = distance(a, c)

  const cosAngle: number =
    (Math.pow(ab, 2) + Math.pow(bc, 2) - Math.pow(ac, 2)) / (2 * ab * bc)

  const angle: number = Math.acos(cosAngle) * (180 / Math.PI)
  return angle
}

function getAngles(
  pose: poseDetection.Pose,
  selectedAngles: string[] = []
): (number | null)[] {
  const foundKeypoints = bodyKeypoints.map((name) =>
    pose.keypoints.find((kp) => kp.name === name)
  )
  const [
    leftShoulder,
    leftElbow,
    leftWrist,
    leftHip,
    leftKnee,
    leftAnkle,
    rightShoulder,
    rightElbow,
    rightWrist,
    rightHip,
    rightKnee,
    rightAnkle,
  ] = foundKeypoints as poseDetection.Keypoint[]

  const angles: (number | null)[] = []
  const calculateAngleWithConfidence = (
    a: poseDetection.Keypoint,
    b: poseDetection.Keypoint,
    c: poseDetection.Keypoint
  ): number | null => {
    if (
      a?.score &&
      b?.score &&
      c?.score &&
      a.score >= 0.3 &&
      b.score >= 0.3 &&
      c.score >= 0.3
    ) {
      return calculateAngle(a, b, c)
    }
    return null
  }

  if (selectedAngles.includes('leftElbowAngle')) {
    angles.push(
      calculateAngleWithConfidence(leftShoulder, leftElbow, leftWrist)
    )
  }

  if (selectedAngles.includes('leftShoulderAngle')) {
    angles.push(calculateAngleWithConfidence(leftElbow, leftShoulder, leftHip))
  }

  if (selectedAngles.includes('leftHipAngle')) {
    angles.push(calculateAngleWithConfidence(leftShoulder, leftHip, leftKnee))
  }

  if (selectedAngles.includes('leftKneeAngle')) {
    angles.push(calculateAngleWithConfidence(leftHip, leftKnee, leftAnkle))
  }

  if (selectedAngles.includes('rightElbowAngle')) {
    angles.push(
      calculateAngleWithConfidence(rightShoulder, rightElbow, rightWrist)
    )
  }

  if (selectedAngles.includes('rightShoulderAngle')) {
    angles.push(
      calculateAngleWithConfidence(rightElbow, rightShoulder, rightHip)
    )
  }

  if (selectedAngles.includes('rightHipAngle')) {
    angles.push(
      calculateAngleWithConfidence(rightShoulder, rightHip, rightKnee)
    )
  }

  if (selectedAngles.includes('rightKneeAngle')) {
    angles.push(calculateAngleWithConfidence(rightHip, rightKnee, rightAnkle))
  }

  return angles
}

export function calculatePoseSimilarity(
  origin: poseDetection.Pose,
  target: poseDetection.Pose,
  selectedAngles: string[] = [],
  normalize: boolean = false
): number {
  if (normalize) {
    origin = normalizePose(origin)
    target = normalizePose(target)
  }
  const originAngles = getAngles(origin, selectedAngles)
  const targetAngles = getAngles(target, selectedAngles)

  // Calculate total angle difference and valid angles
  let totalAngleDiff = 0

  for (let i = 0; i < originAngles.length; i++) {
    const originAngle = originAngles[i]
    const targetAngle = targetAngles[i]
    if (originAngle != null && targetAngle != null) {
      const angleDiff = Math.abs(originAngle - targetAngle)
      totalAngleDiff += angleDiff
    }
  }
  // Calculate average angle difference and convert to similarity score
  const allNull = originAngles.every((angle) => angle === null)
  if (allNull) return 0
  const avgAngleDiff = totalAngleDiff / originAngles.length
  const similarity = Math.max(0, 1 - avgAngleDiff / 180)

  return similarity
}
