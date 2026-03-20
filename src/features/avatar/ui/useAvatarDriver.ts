"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { SessionManager } from "@/features/session";
import { Avatar3DInterpolator } from "../lib/avatar3DInterpolator";

interface Options {
  managerRef: MutableRefObject<SessionManager | null>;
  enabled: boolean;
}

export function useAvatarDriver({ managerRef, enabled }: Options) {
  const interpolatorRef = useRef(new Avatar3DInterpolator());

  useEffect(() => {
    if (!enabled || !managerRef.current) return;

    const cb = (result: FaceLandmarkerResult) => {
      const matrix = result.facialTransformationMatrixes?.[0];
      const blendshapes = result.faceBlendshapes?.[0];
      if (matrix?.data && blendshapes?.categories) {
        interpolatorRef.current.update(matrix.data, blendshapes.categories);
      }
    };

    managerRef.current.setRawResultCallback(cb);
    return () => {
      managerRef.current?.setRawResultCallback(null);
    };
  }, [enabled, managerRef]);

  return { interpolator: interpolatorRef.current };
}
