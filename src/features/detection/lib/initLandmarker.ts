import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let landmarkerInstance: FaceLandmarker | null = null;

export async function initLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;

  const vision = await FilesetResolver.forVisionTasks("/mediapipe");

  landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });

  return landmarkerInstance;
}

export function getLandmarker(): FaceLandmarker | null {
  return landmarkerInstance;
}

export function destroyLandmarker(): void {
  landmarkerInstance?.close();
  landmarkerInstance = null;
}
