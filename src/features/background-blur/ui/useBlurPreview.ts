"use client";

import { useRef, useState, useEffect, type RefObject } from "react";
import type { BackgroundBlurRenderer } from "../lib/backgroundBlurRenderer";
import { createBlurSession } from "../lib/createBlurSession";

interface UseBlurPreviewParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  streaming: boolean;
}

interface UseBlurPreviewReturn {
  loading: boolean;
}

export function useBlurPreview({
  videoRef,
  canvasRef,
  enabled,
  streaming,
}: UseBlurPreviewParams): UseBlurPreviewReturn {
  const [loading, setLoading] = useState(false);
  const rendererRef = useRef<BackgroundBlurRenderer | null>(null);

  useEffect(() => {
    if (!enabled || !streaming) {
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
        rendererRef.current = renderer;
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
  }, [enabled, streaming]);

  return { loading };
}
