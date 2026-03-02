/** Check if browser supports Picture-in-Picture */
export function supportsPiP(): boolean {
  return "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
}

/** Check if browser supports Automatic PiP (enterpictureinpicture media session action) */
export function supportsAutoPiP(): boolean {
  return supportsPiP();
}

/** Check if browser supports requestVideoFrameCallback */
export function supportsRvfc(): boolean {
  return typeof HTMLVideoElement !== "undefined" &&
    "requestVideoFrameCallback" in HTMLVideoElement.prototype;
}

/** Check if browser supports MediaPipe WASM */
export function supportsMediaPipe(): boolean {
  return typeof WebAssembly !== "undefined" && typeof WebGL2RenderingContext !== "undefined";
}

/** Detect PiP strategy to use */
export type PipStrategy = "auto" | "manual" | "none";

export function detectPipStrategy(): PipStrategy {
  if (supportsAutoPiP()) return "auto";
  if (supportsPiP()) return "manual";
  return "none";
}
