"use client";

import { useCamera } from "../services/useCamera";
import type { CameraStatus } from "../services/useCamera";

interface CameraPreviewProps {
  onVideoReady: (video: HTMLVideoElement) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: CameraStatus) => void;
  showIdleOverlay?: boolean;
  isRecording?: boolean;
  recordingTimeMs?: number;
  faceDetected?: boolean;
}

function formatRecordingTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function CameraPreview({
  onVideoReady,
  onError,
  onStatusChange,
  showIdleOverlay = false,
  isRecording = false,
  recordingTimeMs = 0,
  faceDetected = false,
}: CameraPreviewProps) {
  const { videoRef, devices, selectedDeviceId, status, handleDeviceSelect } =
    useCamera({ onVideoReady, onError, onStatusChange });

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        className="h-full w-full -scale-x-100 object-cover"
        playsInline
        muted
      />

      {/* Camera not streaming overlay */}
      {status !== "streaming" && !showIdleOverlay && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
          {status === "waiting" ? "연결 중..." : status === "disconnected" ? "카메라 연결 끊김" : ""}
        </div>
      )}

      {/* Idle overlay */}
      {showIdleOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <p className="text-sm text-zinc-300">카메라가 비활성화되었습니다</p>
          <p className="text-xs text-zinc-500">시작 버튼을 눌러 집중 모니터링을 시작하세요</p>
        </div>
      )}

      {/* Recording pill */}
      {isRecording && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-white backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono text-xs font-medium">{formatRecordingTime(recordingTimeMs)}</span>
        </div>
      )}

      {/* Face detection badge */}
      {isRecording && (
        <div className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${
          faceDetected
            ? "bg-green-500/20 text-green-300"
            : "bg-red-500/20 text-red-300"
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full ${faceDetected ? "bg-green-400" : "bg-red-400"}`} />
          {faceDetected ? "얼굴 감지됨" : "얼굴 미감지"}
        </div>
      )}

      {/* Device selector - bottom right, only when multiple devices */}
      {devices.length > 1 && (
        <div className="absolute bottom-4 right-4">
          <select
            value={selectedDeviceId}
            onChange={handleDeviceSelect}
            className="rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
