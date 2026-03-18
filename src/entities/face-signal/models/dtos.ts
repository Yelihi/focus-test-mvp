/** Raw signals extracted from MediaPipe face landmarks */
export interface FaceSignals {
  /** Eye aspect ratio (EAR) for blink detection, 0-1 */
  earLeft: number;
  earRight: number;
  /** Blendshape scores from MediaPipe, 0-1 */
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeLookInLeft: number;
  eyeLookInRight: number;
  eyeLookOutLeft: number;
  eyeLookOutRight: number;
  /** Head pose in degrees */
  headYaw: number;
  headPitch: number;
  headRoll: number;
  /** Face detection confidence, 0-1 */
  faceDetectionConfidence: number;
  /** Timestamp in ms */
  timestamp: number;
  /** Phone detected in current or recent frame */
  phoneDetected: boolean;
}
