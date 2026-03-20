"use client";

import { useRef, useState, useCallback, type RefObject } from "react";
import { destroySegmenter } from "@/features/detection";
import type { BackgroundBlurRenderer } from "../lib/backgroundBlurRenderer";
import { createBlurSession, loadBackgroundImage } from "../lib";
import type { BackgroundMode } from "../model/types";

interface UseSessionBlurParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

interface UseSessionBlurReturn {
  backgroundBlurEnabled: boolean;
  backgroundMode: BackgroundMode;
  blurLoading: boolean;
  setBackgroundMode: (mode: BackgroundMode) => Promise<void>;
  toggleBlur: (enabled: boolean) => void;
  initFromModal: (mode: BackgroundMode) => Promise<void>;
  cleanupBlur: () => void;
}

export function useSessionBlur({
  videoRef,
  canvasRef,
}: UseSessionBlurParams): UseSessionBlurReturn {
  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>({ type: "none" });
  const [blurLoading, setBlurLoading] = useState(false);
  const rendererRef = useRef<BackgroundBlurRenderer | null>(null);

  const cleanupBlur = useCallback(() => {
    rendererRef.current?.destroy();
    rendererRef.current = null;
    destroySegmenter();
    setBackgroundModeState({ type: "none" });
  }, []);

  const setBackgroundMode = useCallback(async (mode: BackgroundMode) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (mode.type === "none") {
      rendererRef.current?.destroy();
      rendererRef.current = null;
      destroySegmenter();
      setBackgroundModeState({ type: "none" });
      return;
    }

    if (!video || !canvas) return;

    setBlurLoading(true);
    try {
      // Reuse existing renderer if already active, otherwise create new
      if (!rendererRef.current) {
        const renderer = await createBlurSession(video, canvas);
        rendererRef.current = renderer;
      }

      if (mode.type === "blur") {
        rendererRef.current.setBackgroundImage(null);
        rendererRef.current.setEnabled(true);
      } else {
        const img = await loadBackgroundImage(mode.src);
        rendererRef.current.setBackgroundImage(img);
        rendererRef.current.setEnabled(true);
      }
      setBackgroundModeState(mode);
    } catch {
      rendererRef.current?.destroy();
      rendererRef.current = null;
      setBackgroundModeState({ type: "none" });
    } finally {
      setBlurLoading(false);
    }
  }, [videoRef, canvasRef]);

  // Backward compat: toggleBlur(true) = blur mode, toggleBlur(false) = none
  const toggleBlur = useCallback((enabled: boolean) => {
    setBackgroundMode(enabled ? { type: "blur" } : { type: "none" });
  }, [setBackgroundMode]);

  // Called from handleGoalStart — segmenter singleton already loaded in modal
  const initFromModal = useCallback(async (mode: BackgroundMode) => {
    if (mode.type === "none") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    try {
      const renderer = await createBlurSession(video, canvas);
      if (mode.type === "image") {
        const img = await loadBackgroundImage(mode.src);
        renderer.setBackgroundImage(img);
      }
      rendererRef.current = renderer;
      setBackgroundModeState(mode);
    } catch {
      destroySegmenter();
      setBackgroundModeState({ type: "none" });
    }
  }, [videoRef, canvasRef]);

  return {
    backgroundBlurEnabled: backgroundMode.type !== "none",
    backgroundMode,
    blurLoading,
    setBackgroundMode,
    toggleBlur,
    initFromModal,
    cleanupBlur,
  };
}
