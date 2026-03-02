import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { FaceSignals } from "@/entities/focus-session";

/** Extract a named blendshape score from MediaPipe results */
function getBlendshape(
  result: FaceLandmarkerResult,
  name: string,
): number {
  const shapes = result.faceBlendshapes?.[0]?.categories;
  if (!shapes) return 0;
  const found = shapes.find((c) => c.categoryName === name);
  return found?.score ?? 0;
}

/** Extract head pose (yaw, pitch, roll) from facial transformation matrix */
function extractHeadPose(result: FaceLandmarkerResult): {
  yaw: number;
  pitch: number;
  roll: number;
} {
  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  if (!matrix || matrix.length < 12) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  // Rotation matrix elements (column-major 4x4)
  const r00 = matrix[0], r01 = matrix[1], r02 = matrix[2];
  const r10 = matrix[4], r11 = matrix[5], r12 = matrix[6];
  const r20 = matrix[8], r21 = matrix[9], r22 = matrix[10];

  const toDeg = 180 / Math.PI;

  // Extract Euler angles from rotation matrix
  const pitch = Math.asin(-r20) * toDeg;
  const yaw = Math.atan2(r10, r00) * toDeg;
  const roll = Math.atan2(r21, r22) * toDeg;

  return { yaw, pitch, roll };
}

/** Compute Eye Aspect Ratio from landmarks */
function computeEAR(
  result: FaceLandmarkerResult,
  side: "left" | "right",
): number {
  const landmarks = result.faceLandmarks?.[0];
  if (!landmarks) return 0;

  // MediaPipe Face Mesh eye landmark indices
  const leftEyeIndices = {
    p1: 33, p2: 160, p3: 158, p4: 133, p5: 153, p6: 144,
  };
  const rightEyeIndices = {
    p1: 362, p2: 385, p3: 387, p4: 263, p5: 373, p6: 380,
  };

  const idx = side === "left" ? leftEyeIndices : rightEyeIndices;

  const p1 = landmarks[idx.p1];
  const p2 = landmarks[idx.p2];
  const p3 = landmarks[idx.p3];
  const p4 = landmarks[idx.p4];
  const p5 = landmarks[idx.p5];
  const p6 = landmarks[idx.p6];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);

  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

/** Convert MediaPipe result to FaceSignals */
export function extractSignals(
  result: FaceLandmarkerResult,
  timestamp: number,
): FaceSignals | null {
  if (!result.faceLandmarks?.length) return null;

  const { yaw, pitch, roll } = extractHeadPose(result);

  return {
    earLeft: computeEAR(result, "left"),
    earRight: computeEAR(result, "right"),
    eyeBlinkLeft: getBlendshape(result, "eyeBlinkLeft"),
    eyeBlinkRight: getBlendshape(result, "eyeBlinkRight"),
    eyeLookUpLeft: getBlendshape(result, "eyeLookUpLeft"),
    eyeLookUpRight: getBlendshape(result, "eyeLookUpRight"),
    eyeLookDownLeft: getBlendshape(result, "eyeLookDownLeft"),
    eyeLookDownRight: getBlendshape(result, "eyeLookDownRight"),
    eyeLookInLeft: getBlendshape(result, "eyeLookInLeft"),
    eyeLookInRight: getBlendshape(result, "eyeLookInRight"),
    eyeLookOutLeft: getBlendshape(result, "eyeLookOutLeft"),
    eyeLookOutRight: getBlendshape(result, "eyeLookOutRight"),
    headYaw: yaw,
    headPitch: pitch,
    headRoll: roll,
    faceDetectionConfidence:
      result.faceBlendshapes?.[0]?.categories?.[0]
        ? 1.0
        : 0,
    timestamp,
  };
}
