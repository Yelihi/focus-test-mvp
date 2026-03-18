import type { ImageSegmenter } from "@mediapipe/tasks-vision";

export interface BackgroundBlurRenderer {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

export function createBackgroundBlurRenderer(
  video: HTMLVideoElement,
  segmenter: ImageSegmenter,
  canvas: HTMLCanvasElement,
): BackgroundBlurRenderer {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Offscreen canvas for the person layer (will have background cut out)
  const personCanvas = new OffscreenCanvas(w, h);
  const personCtx = personCanvas.getContext("2d")!;

  // Offscreen canvas to hold the mask ImageData for GPU-friendly drawImage
  const maskCanvas = new OffscreenCanvas(w, h);
  const maskCtx = maskCanvas.getContext("2d")!;

  let cachedMask: Float32Array | null = null;
  const maskImageData = new ImageData(w, h);
  let enabled = false;
  let lastSegmentTs = -1;

  // Segmentation loop at ~15 fps
  const SEGMENT_INTERVAL = Math.round(1000 / 15);
  const segmentIntervalId = setInterval(() => {
    if (video.readyState < 2) return;
    const now = performance.now();
    if (now <= lastSegmentTs) return;
    lastSegmentTs = now;

    try {
      const result = segmenter.segmentForVideo(video, now);
      if (result.confidenceMasks && result.confidenceMasks.length > 0) {
        cachedMask = result.confidenceMasks[0].getAsFloat32Array();
      }
      result.close();
    } catch {
      // skip frame on error (e.g. during stream switch)
    }
  }, SEGMENT_INTERVAL);

  // Render one frame to the output canvas
  function renderFrame() {
    if (video.readyState < 2) return;

    if (!enabled) {
      // Mirror-copy the raw video frame
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
      return;
    }

    if (!cachedMask) {
      // Mask not yet available — show full blur as fallback (no raw video flash)
      ctx.save();
      ctx.filter = "blur(12px)";
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
      ctx.filter = "none";
      return;
    }

    // --- Blurred background (mirrored) ---
    ctx.save();
    ctx.filter = "blur(12px)";
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
    ctx.filter = "none";

    // --- Person layer: draw mirrored video then mask out background ---
    personCtx.globalCompositeOperation = "source-over";
    personCtx.save();
    personCtx.translate(w, 0);
    personCtx.scale(-1, 1);
    personCtx.drawImage(video, 0, 0, w, h);
    personCtx.restore();

    // Build mask ImageData (white image with confidence as alpha)
    const data = maskImageData.data;
    const mask = cachedMask;
    for (let i = 0; i < mask.length; i++) {
      const base = i * 4;
      data[base] = 255;
      data[base + 1] = 255;
      data[base + 2] = 255;
      data[base + 3] = mask[i] * 255;
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    // destination-in: keep only pixels where mask is opaque (person region)
    // Mirror the mask to match the mirrored video on personCanvas
    personCtx.save();
    personCtx.globalCompositeOperation = "destination-in";
    personCtx.translate(w, 0);
    personCtx.scale(-1, 1);
    personCtx.drawImage(maskCanvas, 0, 0);
    personCtx.restore();

    // Composite person (transparent background) over blurred background
    ctx.drawImage(personCanvas, 0, 0);
  }

  // Display loop via requestAnimationFrame
  let rafId: number | null = null;
  function loop() {
    renderFrame();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  return {
    setEnabled(val: boolean) {
      enabled = val;
      if (!val) cachedMask = null;
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearInterval(segmentIntervalId);
      cachedMask = null;
    },
  };
}
