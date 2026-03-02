/**
 * Manual PiP fallback for browsers that don't support Automatic PiP.
 * Provides a toggle function that the UI can bind to a button.
 * Must be called from a user gesture event handler.
 */
export async function togglePip(video: HTMLVideoElement): Promise<boolean> {
  try {
    if (document.pictureInPictureElement === video) {
      await document.exitPictureInPicture();
      return false;
    } else {
      await video.requestPictureInPicture();
      return true;
    }
  } catch {
    return false;
  }
}
