import type { FaceSignals, StudyMode } from "@/entities/focus-session";

export interface ScoreResult {
  focusScore: number;
  confidence: number;
}

/**
 * Compute a focus score (0–1) from face signals.
 *
 * Heuristic breakdown (weights sum to 1.0):
 *   - Eye openness (EAR):   0.30  — closed eyes → low score
 *   - Gaze direction:       0.35  — looking away → low score
 *   - Head pose:            0.25  — turned / tilted head → low score
 *   - Face presence:        0.10  — no face detected → 0
 */
export function computeFocusScore(signals: FaceSignals, studyMode: StudyMode = "desktop"): ScoreResult {
  // ── Face presence ────────────────────────────────────────
  if (signals.faceDetectionConfidence < 0.5) {
    return { focusScore: 0, confidence: signals.faceDetectionConfidence };
  }

  // ── Eye openness (EAR) ──────────────────────────────────
  const avgEar = (signals.earLeft + signals.earRight) / 2;
  // Typical open EAR ≈ 0.25–0.35, closed ≈ < 0.15
  const eyeOpenScore = clamp((avgEar - 0.1) / 0.2, 0, 1);

  // Also use blendshape blink — higher blink score = eyes closing
  const avgBlink = (signals.eyeBlinkLeft + signals.eyeBlinkRight) / 2;
  const blinkScore = 1 - avgBlink; // invert: no blink = 1

  const eyeScore = eyeOpenScore * 0.5 + blinkScore * 0.5;

  // ── Gaze direction ──────────────────────────────────────
  // High "lookIn" on both sides = looking at screen (convergent gaze)
  // High "lookOut", "lookUp", "lookDown" = looking away
  // Multiplier 1.2: small gaze shifts (keyboard, notes) stay focused,
  // only large deviations (looking completely away) cause penalty
  const lookAwayCandidates = [
    (signals.eyeLookOutLeft + signals.eyeLookOutRight) / 2,
    (signals.eyeLookUpLeft + signals.eyeLookUpRight) / 2,
  ];
  // In desktop mode, looking down is a distraction; in book mode it's expected
  if (studyMode !== "book") {
    lookAwayCandidates.push(
      (signals.eyeLookDownLeft + signals.eyeLookDownRight) / 2,
    );
  }
  const avgLookAway = Math.max(...lookAwayCandidates);
  const gazeScore = 1 - clamp(avgLookAway * 1.2, 0, 1);

  // ── Head pose ───────────────────────────────────────────
  // Penalise large yaw (looking left/right) and pitch (up/down)
  // Tolerant thresholds: ~30° yaw or ~25° pitch before significant penalty
  // (allows looking at keyboard, notes, second monitor)
  const yawPenalty = clamp(Math.abs(signals.headYaw) / 45, 0, 1);
  const pitchDivisor = studyMode === "book" ? 80 : 40;
  const pitchPenalty = clamp(Math.abs(signals.headPitch) / pitchDivisor, 0, 1);
  const headScore = 1 - Math.max(yawPenalty, pitchPenalty);

  // ── Weighted sum ────────────────────────────────────────
  const focusScore =
    eyeScore * 0.3 +
    gazeScore * 0.35 +
    headScore * 0.25 +
    signals.faceDetectionConfidence * 0.1;

  return {
    focusScore: clamp(focusScore, 0, 1),
    confidence: signals.faceDetectionConfidence,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
