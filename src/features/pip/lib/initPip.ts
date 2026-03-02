import type { FocusState } from "@/entities/focus-session/model";
import { detectPipStrategy, type PipStrategy } from "@/shared/lib/featureDetect";
import { setupAutoPip } from "./setupAutoPip";
import { createPipCanvasRenderer, type PipCanvasRenderer } from "./pipCanvasRenderer";

export interface PipHandle {
  strategy: PipStrategy;
  setFocusState: (state: FocusState) => void;
  toggle: () => Promise<boolean>;
  cleanup: () => void;
}

/**
 * Initialize PiP with canvas-based overlay.
 * Creates a canvas renderer that composites video + focus state badge,
 * then uses the canvas-backed video as the PiP target.
 */
export function initPip(video: HTMLVideoElement): PipHandle {
  const strategy = detectPipStrategy();
  const renderer = createPipCanvasRenderer(video);

  let autoCleanup: (() => void) | null = null;
  if (strategy === "auto") {
    autoCleanup = setupAutoPip(renderer.pipVideo);
  }

  return {
    strategy,
    setFocusState: (state: FocusState) => renderer.setFocusState(state),
    async toggle(): Promise<boolean> {
      try {
        if (document.pictureInPictureElement === renderer.pipVideo) {
          await document.exitPictureInPicture();
          return false;
        } else {
          await renderer.pipVideo.requestPictureInPicture();
          return true;
        }
      } catch {
        return false;
      }
    },
    cleanup() {
      autoCleanup?.();
      renderer.destroy();
    },
  };
}
