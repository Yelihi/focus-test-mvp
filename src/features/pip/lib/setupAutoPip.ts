/**
 * Automatic PiP for video conferencing.
 *
 * Chrome triggers the `enterpictureinpicture` MediaSession handler automatically
 * on every tab switch when:
 *   1. getUserMedia capture is active (with audio track)
 *   2. setCameraActive(true) + setMicrophoneActive(true)
 *   3. enterpictureinpicture action handler registered
 *   4. togglemicrophone, togglecamera, hangup handlers registered
 *
 * Note: Does NOT work on localhost — requires a real HTTPS origin.
 */
export function setupAutoPip(video: HTMLVideoElement): () => void {
  let isCameraActive = true;
  let isMicrophoneActive = true;

  try {
    navigator.mediaSession.setCameraActive(isCameraActive);
    navigator.mediaSession.setMicrophoneActive(isMicrophoneActive);
  } catch {
    // Not supported
  }

  try {
    navigator.mediaSession.setActionHandler(
      "enterpictureinpicture" as MediaSessionAction,
      async () => {
        try {
          if (document.pictureInPictureElement !== video) {
            await video.requestPictureInPicture();
          }
        } catch {
          // PiP not available in this context
        }
      },
    );
  } catch {
    // Not supported
  }

  try {
    navigator.mediaSession.setActionHandler(
      "togglemicrophone" as MediaSessionAction,
      () => {
        isMicrophoneActive = !isMicrophoneActive;
        navigator.mediaSession.setMicrophoneActive(isMicrophoneActive);
      },
    );
  } catch {
    // Not supported
  }

  try {
    navigator.mediaSession.setActionHandler(
      "togglecamera" as MediaSessionAction,
      () => {
        isCameraActive = !isCameraActive;
        navigator.mediaSession.setCameraActive(isCameraActive);
      },
    );
  } catch {
    // Not supported
  }

  try {
    navigator.mediaSession.setActionHandler(
      "hangup" as MediaSessionAction,
      () => {
        const stream = video.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        video.srcObject = null;
        document.exitPictureInPicture().catch(() => {});
      },
    );
  } catch {
    // Not supported
  }

  return () => {
    const actions = [
      "enterpictureinpicture",
      "togglemicrophone",
      "togglecamera",
      "hangup",
    ] as unknown as MediaSessionAction[];
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // Ignore
      }
    }
    try {
      navigator.mediaSession.setCameraActive(false);
      navigator.mediaSession.setMicrophoneActive(false);
    } catch {
      // Ignore
    }
    if (document.pictureInPictureElement === video) {
      document.exitPictureInPicture().catch(() => {});
    }
  };
}
