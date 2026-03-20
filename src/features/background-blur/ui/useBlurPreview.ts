"use client";

import { useRef, useState, useEffect, type RefObject } from "react";
import type { BackgroundBlurRenderer } from "../lib/backgroundBlurRenderer";
import { createBlurSession, loadBackgroundImage } from "../lib";
import type { BackgroundMode } from "../model/types";

interface UseBlurPreviewParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundMode: BackgroundMode;
  streaming: boolean;
}

interface UseBlurPreviewReturn {
  loading: boolean;
}

export function useBlurPreview({
  videoRef,
  canvasRef,
  backgroundMode,
  streaming,
}: UseBlurPreviewParams): UseBlurPreviewReturn {
  const [loading, setLoading] = useState(false);
  const rendererRef = useRef<BackgroundBlurRenderer | null>(null);

  useEffect(() => {
    if (backgroundMode.type === "none" || !streaming) {
      rendererRef.current?.destroy();
      rendererRef.current = null;
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const renderer = await createBlurSession(video, canvas);
        if (cancelled) {
          renderer.destroy();
          return;
        }

        if (backgroundMode.type === "image") {
          try {
            const img = await loadBackgroundImage(backgroundMode.src);
            if (!cancelled) renderer.setBackgroundImage(img);
          } catch {
            // Image load failed — fall back to blur
          }
        }

        if (!cancelled) rendererRef.current = renderer;
      } catch {
        // Blur init failed — silently ignore, video stays visible
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundMode.type, (backgroundMode as { src?: string }).src, streaming]);

  return { loading };
}
