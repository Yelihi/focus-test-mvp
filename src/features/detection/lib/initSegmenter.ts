import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

let instance: ImageSegmenter | null = null;

export async function initSegmenter(): Promise<ImageSegmenter> {
  if (instance) return instance;
  const vision = await FilesetResolver.forVisionTasks("/mediapipe");
  instance = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
  return instance;
}

export function destroySegmenter(): void {
  instance?.close();
  instance = null;
}
