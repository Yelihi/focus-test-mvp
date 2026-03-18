import { ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let detectorInstance: ObjectDetector | null = null;

export async function initObjectDetector(): Promise<ObjectDetector> {
  if (detectorInstance) return detectorInstance;

  const vision = await FilesetResolver.forVisionTasks("/mediapipe");

  detectorInstance = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    maxResults: 3,
    scoreThreshold: 0.5,
    categoryAllowlist: ["cell phone"],
  });

  return detectorInstance;
}

export function destroyObjectDetector(): void {
  detectorInstance?.close();
  detectorInstance = null;
}
