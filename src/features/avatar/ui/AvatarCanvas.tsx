"use client";

import React, { forwardRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { Avatar3DInterpolator } from "../lib/avatar3DInterpolator";
import { RPMScene } from "./RPMScene";
import { AVATAR_CANVAS_DPR } from "../config/constants";

interface Props {
  interpolator: Avatar3DInterpolator;
  className?: string;
}

export const AvatarCanvas = forwardRef<HTMLCanvasElement, Props>(
  ({ interpolator, className }, ref) => {
    return (
      <Canvas
        // R3F Canvas may forward ref to a wrapper div, not the <canvas> element.
        // Use onCreated to set the ref to gl.domElement (the actual HTMLCanvasElement).
        onCreated={({ gl }) => {
          if (typeof ref === "function") ref(gl.domElement);
          else if (ref) (ref as React.MutableRefObject<HTMLCanvasElement>).current = gl.domElement;
        }}
        frameloop="always"
        gl={{ antialias: true, alpha: true, powerPreference: "default", preserveDrawingBuffer: true }}
        dpr={AVATAR_CANVAS_DPR}
        camera={{ fov: 25, position: [0, 0.1, 0.9] }}
        style={{ background: "transparent" }}
        className={className}
      >
        <Suspense fallback={null}>
          <RPMScene interpolator={interpolator} />
        </Suspense>
      </Canvas>
    );
  },
);
AvatarCanvas.displayName = "AvatarCanvas";
