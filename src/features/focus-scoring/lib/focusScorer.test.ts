import { describe, it, expect } from "vitest";
import { computeFocusScore } from "./focusScorer";
import type { FaceSignals } from "@/entities/focus-session";

function makeSignals(overrides: Partial<FaceSignals> = {}): FaceSignals {
  return {
    earLeft: 0.3,
    earRight: 0.3,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    eyeLookUpLeft: 0,
    eyeLookUpRight: 0,
    eyeLookDownLeft: 0,
    eyeLookDownRight: 0,
    eyeLookInLeft: 0,
    eyeLookInRight: 0,
    eyeLookOutLeft: 0,
    eyeLookOutRight: 0,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    faceDetectionConfidence: 1.0,
    timestamp: 1000,
    ...overrides,
  };
}

describe("computeFocusScore", () => {
  it("returns high score for focused user (eyes open, forward gaze, neutral head)", () => {
    const { focusScore } = computeFocusScore(makeSignals());
    expect(focusScore).toBeGreaterThan(0.7);
  });

  it("returns 0 when face is not detected", () => {
    const { focusScore } = computeFocusScore(
      makeSignals({ faceDetectionConfidence: 0.2 }),
    );
    expect(focusScore).toBe(0);
  });

  it("penalises closed eyes (high blink blendshape)", () => {
    const open = computeFocusScore(makeSignals());
    const closed = computeFocusScore(
      makeSignals({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 }),
    );
    expect(closed.focusScore).toBeLessThan(open.focusScore);
  });

  it("penalises looking away (high lookOut)", () => {
    const forward = computeFocusScore(makeSignals());
    const away = computeFocusScore(
      makeSignals({ eyeLookOutLeft: 0.8, eyeLookOutRight: 0.8 }),
    );
    expect(away.focusScore).toBeLessThan(forward.focusScore);
  });

  it("penalises large head yaw", () => {
    const forward = computeFocusScore(makeSignals());
    const turned = computeFocusScore(makeSignals({ headYaw: 40 }));
    expect(turned.focusScore).toBeLessThan(forward.focusScore);
  });

  it("penalises large head pitch", () => {
    const forward = computeFocusScore(makeSignals());
    const tilted = computeFocusScore(makeSignals({ headPitch: 30 }));
    expect(tilted.focusScore).toBeLessThan(forward.focusScore);
  });

  describe("reading mode", () => {
    it("gives high score with pitch 30° (reading posture)", () => {
      const { focusScore } = computeFocusScore(
        makeSignals({ headPitch: 30 }),
        "reading",
      );
      expect(focusScore).toBeGreaterThan(0.7);
    });

    it("does not penalise lookDown in reading mode", () => {
      const withLookDown = computeFocusScore(
        makeSignals({ eyeLookDownLeft: 0.8, eyeLookDownRight: 0.8 }),
        "reading",
      );
      const neutral = computeFocusScore(makeSignals(), "reading");
      expect(withLookDown.focusScore).toBeCloseTo(neutral.focusScore, 1);
    });

    it("still penalises lookDown in work mode", () => {
      const neutral = computeFocusScore(makeSignals(), "work");
      const withLookDown = computeFocusScore(
        makeSignals({ eyeLookDownLeft: 0.8, eyeLookDownRight: 0.8 }),
        "work",
      );
      expect(withLookDown.focusScore).toBeLessThan(neutral.focusScore);
    });

    it("penalises pitch 30° more in work mode than reading mode", () => {
      const work = computeFocusScore(
        makeSignals({ headPitch: 30 }),
        "work",
      );
      const reading = computeFocusScore(
        makeSignals({ headPitch: 30 }),
        "reading",
      );
      expect(reading.focusScore).toBeGreaterThan(work.focusScore);
    });
  });

  it("mild distraction (lookOut=0.5 + headYaw=15°) drops work score below focusThreshold", () => {
    const { focusScore } = computeFocusScore(
      makeSignals({ eyeLookOutLeft: 0.5, eyeLookOutRight: 0.5, headYaw: 15 }),
      "work",
    );
    expect(focusScore).toBeLessThan(0.6);
  });

  it("returns score clamped between 0 and 1", () => {
    const { focusScore: high } = computeFocusScore(makeSignals());
    expect(high).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);

    const { focusScore: low } = computeFocusScore(
      makeSignals({
        eyeBlinkLeft: 1,
        eyeBlinkRight: 1,
        eyeLookOutLeft: 1,
        eyeLookOutRight: 1,
        headYaw: 90,
        earLeft: 0,
        earRight: 0,
      }),
    );
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThanOrEqual(1);
  });
});
