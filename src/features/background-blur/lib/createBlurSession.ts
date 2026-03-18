import { initSegmenter } from "@/features/detection";
import { createBackgroundBlurRenderer, type BackgroundBlurRenderer } from "./backgroundBlurRenderer";

/**
 * Common init sequence: load segmenter → create blur renderer.
 * Used by both useBlurPreview (modal) and useSessionBlur (live session).
 */
export async function createBlurSession(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<BackgroundBlurRenderer> {
  const segmenter = await initSegmenter();
  const renderer = createBackgroundBlurRenderer(video, segmenter, canvas);
  renderer.setEnabled(true);
  return renderer;
}
