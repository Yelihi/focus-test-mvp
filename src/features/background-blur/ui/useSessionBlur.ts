"use client";

import { useRef, useState, useCallback, type RefObject } from "react";
import { destroySegmenter } from "@/features/detection";
import type { BackgroundBlurRenderer } from "../lib/backgroundBlurRenderer";
import { createBlurSession } from "../lib/createBlurSession";

interface UseSessionBlurParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

interface UseSessionBlurReturn {
  backgroundBlurEnabled: boolean;
  blurLoading: boolean;
  toggleBlur: (enabled: boolean) => void;
  initBlurFromModal: (enabled: boolean) => Promise<void>;
  cleanupBlur: () => void;
}

export function useSessionBlur({
  videoRef,
  canvasRef,
}: UseSessionBlurParams): UseSessionBlurReturn {
  const [backgroundBlurEnabled, setBackgroundBlurEnabled] = useState(false);
  const [blurLoading, setBlurLoading] = useState(false);
  const rendererRef = useRef<BackgroundBlurRenderer | null>(null);

  const cleanupBlur = useCallback(() => {
    rendererRef.current?.destroy();
    rendererRef.current = null;
    destroySegmenter();
    setBackgroundBlurEnabled(false);
  }, []);

  const toggleBlur = (enabled: boolean) => {
    if (enabled) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      setBlurLoading(true);
      createBlurSession(video, canvas)
        .then((renderer) => {
          rendererRef.current?.destroy();
          rendererRef.current = renderer;
          setBackgroundBlurEnabled(true);
        })
        .catch(() => {
          setBackgroundBlurEnabled(false);
        })
        .finally(() => {
          setBlurLoading(false);
        });
    } else {
      rendererRef.current?.destroy();
      rendererRef.current = null;
      setBackgroundBlurEnabled(false);
    }
  };

  // Called from handleGoalStart — segmenter singleton already loaded in modal
  const initBlurFromModal = useCallback(async (enabled: boolean) => {
    if (!enabled) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    try {
      const renderer = await createBlurSession(video, canvas);
      rendererRef.current = renderer;
      setBackgroundBlurEnabled(true);
    } catch {
      destroySegmenter();
      setBackgroundBlurEnabled(false);
    }
  }, []);

  return {
    backgroundBlurEnabled,
    blurLoading,
    toggleBlur,
    initBlurFromModal,
    cleanupBlur,
  };
}
