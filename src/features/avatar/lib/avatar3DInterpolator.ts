import { Euler, Matrix4 } from "three";
import type { Category } from "@mediapipe/tasks-vision";
import {
  BLENDSHAPE_LERP_FACTOR,
  ROTATION_LERP_FACTOR,
  VISIBILITY_TIMEOUT_MS,
} from "../config/constants";

/**
 * Smoothly interpolates 3D head rotation (Euler) and ARKit blendshapes
 * between MediaPipe detection ticks (~10fps) and render frames (~60fps).
 *
 * Single responsibility: interpolation math only. No React, no R3F.
 */
export class Avatar3DInterpolator {
  private readonly _currentEuler = new Euler();
  private readonly _targetEuler = new Euler();
  private readonly _currentBlendshapes = new Map<string, number>();
  private readonly _targetBlendshapes = new Map<string, number>();
  private _lastUpdateMs = -Infinity;
  private _initialized = false;

  get euler(): Euler {
    return this._currentEuler;
  }

  get blendshapes(): ReadonlyMap<string, number> {
    return this._currentBlendshapes;
  }

  get isVisible(): boolean {
    return (
      this._initialized &&
      performance.now() - this._lastUpdateMs < VISIBILITY_TIMEOUT_MS
    );
  }

  /**
   * Called at MediaPipe detection rate (~10fps).
   * matrixData: row-major 4×4 from facialTransformationMatrixes[0].data
   * categories: ARKit blendshape categories from faceBlendshapes[0].categories
   */
  update(matrixData: ArrayLike<number>, categories: Category[]): void {
    // MediaPipe stores matrix row-major; Three.js fromArray reads column-major → transpose
    const m = new Matrix4().fromArray(matrixData).transpose();
    this._targetEuler.setFromRotationMatrix(m, "XYZ");
    this._targetEuler.x = -this._targetEuler.x; // MediaPipe Y-down → Three.js Y-up

    for (const cat of categories) {
      this._targetBlendshapes.set(cat.categoryName, cat.score);
    }

    if (!this._initialized) {
      // Snap on first frame to avoid lerp from identity pose
      this._currentEuler.copy(this._targetEuler);
      for (const [k, v] of this._targetBlendshapes) {
        this._currentBlendshapes.set(k, v);
      }
      this._initialized = true;
    }

    this._lastUpdateMs = performance.now();
  }

  /**
   * Called every render frame (~60fps).
   * LERP current values toward targets.
   */
  tick(_deltaSec: number): void {
    if (!this._initialized) return;

    this._currentEuler.x +=
      (this._targetEuler.x - this._currentEuler.x) * ROTATION_LERP_FACTOR;
    this._currentEuler.y +=
      (this._targetEuler.y - this._currentEuler.y) * ROTATION_LERP_FACTOR;
    this._currentEuler.z +=
      (this._targetEuler.z - this._currentEuler.z) * ROTATION_LERP_FACTOR;

    for (const [k, target] of this._targetBlendshapes) {
      const curr = this._currentBlendshapes.get(k) ?? 0;
      this._currentBlendshapes.set(
        k,
        curr + (target - curr) * BLENDSHAPE_LERP_FACTOR,
      );
    }
  }
}
