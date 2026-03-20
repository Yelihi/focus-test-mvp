import type { FocusState } from "@/entities/focus-session/models";

export interface PipCanvasRenderer {
  readonly pipVideo: HTMLVideoElement;
  setFocusState(state: FocusState): void;
  destroy(): void;
}

const WIDTH = 480;
const HEIGHT = 360;

const STATE_CONFIG: Record<FocusState, { color: string; label: string }> = {
  focused: { color: "#22c55e", label: "Focused" },
  distracted: { color: "#eab308", label: "Distracted" },
  absent: { color: "#ef4444", label: "Absent" },
};

export function createPipCanvasRenderer(
  getSource: () => HTMLVideoElement | HTMLCanvasElement,
): PipCanvasRenderer {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  let currentState: FocusState = "focused";

  function render() {
    const source = getSource();
    if (source instanceof HTMLCanvasElement) {
      // Flush WebGL GPU pipeline so preserveDrawingBuffer content is readable
      const webgl =
        (source.getContext("webgl2") as WebGL2RenderingContext | null) ??
        (source.getContext("webgl") as WebGLRenderingContext | null);
      webgl?.finish();
      ctx.drawImage(source, 0, 0, WIDTH, HEIGHT);
    } else {
      // Raw video — apply mirror
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(source, -WIDTH, 0, WIDTH, HEIGHT);
      ctx.restore();
    }

    // Draw badge (not mirrored)
    const { color, label } = STATE_CONFIG[currentState];
    const badgeW = 140;
    const badgeH = 32;
    const badgeX = (WIDTH - badgeW) / 2;
    const badgeY = 12;
    const radius = 12;

    // Rounded rect background
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();

    // Status dot
    const dotR = 6;
    const dotX = badgeX + 18;
    const dotY = badgeY + badgeH / 2;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Label text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(label, dotX + dotR + 8, dotY);
  }

  // Use setInterval instead of rAF — rAF is throttled in background tabs
  const intervalId = setInterval(render, 33);

  // Create canvas stream → hidden video for PiP
  const stream = canvas.captureStream(30);
  const pipVideo = document.createElement("video");
  pipVideo.srcObject = stream;
  pipVideo.muted = true;
  pipVideo.playsInline = true;
  pipVideo.autoplay = true;
  pipVideo.play().catch(() => {});

  return {
    pipVideo,
    setFocusState(state: FocusState) {
      currentState = state;
    },
    destroy() {
      clearInterval(intervalId);
      stream.getTracks().forEach((track) => track.stop());
      pipVideo.srcObject = null;
    },
  };
}
