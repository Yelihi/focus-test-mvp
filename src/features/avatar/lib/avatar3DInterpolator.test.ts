import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Avatar3DInterpolator } from "./avatar3DInterpolator";

// Row-major identity matrix
const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

const makeCategories = (entries: [string, number][]) =>
  entries.map(([categoryName, score]) => ({
    categoryName,
    score,
    index: 0,
    displayName: "",
  }));

describe("Avatar3DInterpolator", () => {
  let interp: Avatar3DInterpolator;

  beforeEach(() => {
    interp = new Avatar3DInterpolator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not visible before first update", () => {
    expect(interp.isVisible).toBe(false);
  });

  it("snaps euler and blendshapes to target on first update (no lerp)", () => {
    interp.update(IDENTITY, makeCategories([["eyeBlinkLeft", 0.8]]));
    expect(interp.euler.x).toBeCloseTo(0, 5);
    expect(interp.euler.y).toBeCloseTo(0, 5);
    expect(interp.euler.z).toBeCloseTo(0, 5);
    expect(interp.blendshapes.get("eyeBlinkLeft")).toBeCloseTo(0.8, 5);
  });

  it("is visible immediately after update", () => {
    interp.update(IDENTITY, []);
    expect(interp.isVisible).toBe(true);
  });

  it("becomes invisible after VISIBILITY_TIMEOUT_MS", () => {
    interp.update(IDENTITY, []);
    vi.advanceTimersByTime(501);
    expect(interp.isVisible).toBe(false);
  });

  it("tick is no-op before first update", () => {
    interp.tick(1 / 60);
    expect(interp.euler.x).toBe(0);
    expect(interp.euler.y).toBe(0);
    expect(interp.euler.z).toBe(0);
  });

  it("lerps blendshapes toward target on tick", () => {
    interp.update(IDENTITY, makeCategories([["mouthSmileLeft", 0.0]]));
    interp.update(IDENTITY, makeCategories([["mouthSmileLeft", 1.0]]));
    const before = interp.blendshapes.get("mouthSmileLeft") ?? 0;
    interp.tick(1 / 60);
    const after = interp.blendshapes.get("mouthSmileLeft") ?? 0;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(1.0);
  });

  it("converges to target after many ticks", () => {
    interp.update(IDENTITY, makeCategories([["eyeBlinkRight", 0.0]]));
    interp.update(IDENTITY, makeCategories([["eyeBlinkRight", 1.0]]));
    for (let i = 0; i < 20; i++) interp.tick(1 / 60);
    expect(interp.blendshapes.get("eyeBlinkRight")!).toBeGreaterThan(0.99);
  });

  it("stays visible if updated before timeout expires", () => {
    interp.update(IDENTITY, []);
    vi.advanceTimersByTime(300);
    interp.update(IDENTITY, []);
    vi.advanceTimersByTime(300);
    expect(interp.isVisible).toBe(true);
  });
});
