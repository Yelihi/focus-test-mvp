import { describe, it, expect } from "vitest";
import {
  createStateMachine,
  classifyScore,
  transition,
  finalize,
} from "./stateMachine";

describe("classifyScore", () => {
  it("classifies >= 0.6 as focused", () => {
    expect(classifyScore(0.6)).toBe("focused");
    expect(classifyScore(0.9)).toBe("focused");
  });

  it("classifies 0.3–0.59 as distracted", () => {
    expect(classifyScore(0.3)).toBe("distracted");
    expect(classifyScore(0.59)).toBe("distracted");
  });

  it("classifies < 0.3 as absent", () => {
    expect(classifyScore(0.29)).toBe("absent");
    expect(classifyScore(0)).toBe("absent");
  });
});

describe("stateMachine transitions", () => {
  const config = {
    focusThreshold: 0.6,
    distractedThreshold: 0.3,
    hysteresisFrames: 3,
  };

  it("starts in focused state", () => {
    const sm = createStateMachine();
    expect(sm.currentState).toBe("focused");
  });

  it("does not change state before hysteresis threshold", () => {
    let sm = createStateMachine();
    // Feed 2 distracted scores (below hysteresis of 3)
    const r1 = transition(sm, 0.4, 100, config);
    const r2 = transition(r1.state, 0.4, 200, config);
    expect(r2.newState).toBe("focused");
    expect(r2.changed).toBe(false);
  });

  it("changes state after hysteresis threshold", () => {
    let sm = createStateMachine();
    let result;
    // Feed 3 distracted scores (meets hysteresis of 3)
    result = transition(sm, 0.4, 100, config);
    result = transition(result.state, 0.4, 200, config);
    result = transition(result.state, 0.4, 300, config);
    expect(result.changed).toBe(true);
    expect(result.newState).toBe("distracted");
  });

  it("resets candidate count when original state score returns", () => {
    let sm = createStateMachine();
    let result;
    result = transition(sm, 0.4, 100, config); // distracted candidate +1
    result = transition(result.state, 0.4, 200, config); // distracted candidate +2
    result = transition(result.state, 0.8, 300, config); // focused → reset
    result = transition(result.state, 0.4, 400, config); // restart distracted +1
    result = transition(result.state, 0.4, 500, config); // +2
    expect(result.changed).toBe(false);
    expect(result.newState).toBe("focused");
  });

  it("finalize closes the last segment", () => {
    let sm = createStateMachine();
    let result = transition(sm, 0.8, 100, config);
    result = transition(result.state, 0.8, 200, config);
    const segments = finalize(result.state, 300);
    expect(segments.length).toBe(1);
    expect(segments[0].state).toBe("focused");
    expect(segments[0].endMs).toBe(300);
  });

  it("creates segments on state transitions", () => {
    let sm = createStateMachine();
    let result;
    // focused frames
    result = transition(sm, 0.8, 100, config);
    result = transition(result.state, 0.8, 200, config);
    // transition to distracted (3 frames for hysteresis)
    result = transition(result.state, 0.4, 300, config);
    result = transition(result.state, 0.4, 400, config);
    result = transition(result.state, 0.4, 500, config);
    expect(result.changed).toBe(true);

    const segments = finalize(result.state, 600);
    expect(segments.length).toBe(2);
    expect(segments[0].state).toBe("focused");
    expect(segments[1].state).toBe("distracted");
  });
});
