import type { FaceSignals } from "@/entities/face-signal";
import type { StudyMode } from "@/entities/focus-session";

export interface ScoreResult {
  focusScore: number;
  confidence: number;
}

/**
 * Compute a focus score (0-1) from face signals.
 *
 * Work mode weights (sum to 1.0):
 *   - Eye openness (EAR):   0.20
 *   - Gaze direction:       0.20 (multiplier 1.0 — lenient)
 *   - Head pose:            0.45 (primary signal: face toward screen)
 *   - Face presence:        0.15
 *
 * Reading mode weights (sum to 1.0):
 *   - Eye openness (EAR):   0.30
 *   - Gaze direction:       0.15 (looking down is expected)
 *   - Head pose:            0.25
 *   - Face presence:        0.30 (absence is the key indicator)
 *
 * Tuning intent (work mode):
 *   - Looking at screen with natural eye movement → focused
 *   - Head clearly turned away (~50°+) → distracted
 *   - Brief gaze away without head movement → no state change
 */
export function computeFocusScore(signals: FaceSignals, studyMode: StudyMode = "work"): ScoreResult {
  // ── Phone detected → immediate distracted score ──────────
  if (signals.phoneDetected) {
    return { focusScore: 0.35, confidence: signals.faceDetectionConfidence };
  }

  // ── Face presence ────────────────────────────────────────
  if (signals.faceDetectionConfidence < 0.5) {
    return { focusScore: 0, confidence: signals.faceDetectionConfidence };
  }

  // ── Eye openness (EAR) ──────────────────────────────────
  const avgEar = (signals.earLeft + signals.earRight) / 2;
  const eyeOpenScore = clamp((avgEar - 0.1) / 0.2, 0, 1);

  const avgBlink = (signals.eyeBlinkLeft + signals.eyeBlinkRight) / 2;
  const blinkScore = 1 - avgBlink;

  const eyeScore = eyeOpenScore * 0.5 + blinkScore * 0.5;

  // ── Gaze direction ──────────────────────────────────────
  const lookAwayCandidates = [
    (signals.eyeLookOutLeft + signals.eyeLookOutRight) / 2,
    (signals.eyeLookUpLeft + signals.eyeLookUpRight) / 2,
  ];
  if (studyMode !== "reading") {
    lookAwayCandidates.push(
      (signals.eyeLookDownLeft + signals.eyeLookDownRight) / 2,
    );
  }
  const avgLookAway = Math.max(...lookAwayCandidates);
  // multiplier 1.0: gaze blendshapes are noisy — only penalise strong deviations
  const gazeMultiplier = 1.0;
  const gazeScore = 1 - clamp(avgLookAway * gazeMultiplier, 0, 1);

  // ── Head pose ───────────────────────────────────────────
  // work: ~50° yaw / 40° pitch before full penalty — face turned away from screen
  // reading: 80° pitch (looking down is normal), 50° yaw
  const yawDivisor = 50;
  const yawPenalty = clamp(Math.abs(signals.headYaw) / yawDivisor, 0, 1);
  const pitchDivisor = studyMode === "reading" ? 80 : 40;
  const pitchPenalty = clamp(Math.abs(signals.headPitch) / pitchDivisor, 0, 1);
  const headScore = 1 - Math.max(yawPenalty, pitchPenalty);

  // ── Weighted sum ────────────────────────────────────────
  let focusScore: number;
  if (studyMode === "reading") {
    focusScore =
      eyeScore * 0.3 +
      gazeScore * 0.15 +
      headScore * 0.25 +
      signals.faceDetectionConfidence * 0.3;
  } else {
    // head pose is primary: face toward screen = focused
    focusScore =
      eyeScore * 0.2 +
      gazeScore * 0.2 +
      headScore * 0.45 +
      signals.faceDetectionConfidence * 0.15;
  }

  return {
    focusScore: clamp(focusScore, 0, 1),
    confidence: signals.faceDetectionConfidence,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
