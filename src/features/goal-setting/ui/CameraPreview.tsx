"use client";

import type { RefObject } from "react";
import type { CameraStatus } from "../config/constants";
import { Select, Button } from "@/shared/ui";
import { BACKGROUND_PRESETS } from "@/features/background-blur";
import type { BackgroundMode } from "@/features/background-blur";

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  blurCanvasRef: RefObject<HTMLCanvasElement | null>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  isStreaming: boolean;
  backgroundMode: BackgroundMode;
  blurLoading: boolean;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onStartCamera: (deviceId?: string) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
}

export function CameraPreview({
  videoRef,
  blurCanvasRef,
  cameraStatus,
  cameraError,
  isStreaming,
  backgroundMode,
  blurLoading,
  devices,
  selectedDeviceId,
  onDeviceSelect,
  onStartCamera,
  onBackgroundModeChange,
}: CameraPreviewProps) {
  const showCanvas = backgroundMode.type !== "none" && isStreaming;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        카메라 미리보기
      </div>

      {/* Video area */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900">
        <video
          ref={videoRef}
          className={`h-full w-full -scale-x-100 object-cover${showCanvas ? " hidden" : ""}`}
          playsInline
          muted
        />
        <canvas
          ref={blurCanvasRef}
          className={`h-full w-full object-cover${showCanvas ? "" : " hidden"}`}
        />
        {showCanvas && blurLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60">
            <svg className="h-6 w-6 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Status overlay when not streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {cameraStatus === "waiting" ? (
              <>
                <svg className="h-8 w-8 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-zinc-400">카메라 연결 중...</p>
              </>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" />
                </svg>
                <p className="text-sm text-red-400">
                  {cameraError ?? "카메라를 사용할 수 없습니다"}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Device selector row */}
      <div className="mt-2 flex items-center gap-2">
        <Select
          value={selectedDeviceId}
          onChange={onDeviceSelect}
          disabled={devices.length === 0}
          className="flex-1"
        >
          {devices.length === 0 ? (
            <option value="">카메라 없음</option>
          ) : (
            devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `카메라 ${d.deviceId.slice(0, 8)}`}
              </option>
            ))
          )}
        </Select>

        {!isStreaming && (
          <Button
            variant="secondary"
            onClick={() => onStartCamera(selectedDeviceId || undefined)}
            disabled={cameraStatus === "waiting"}
            className="flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            카메라 켜기
          </Button>
        )}
      </div>

      {/* Background preset selector */}
      <div className="mt-2 rounded-lg border border-zinc-200 px-3 py-2">
        <p className="text-xs font-medium text-zinc-500 mb-2">배경</p>
        <div className="flex flex-wrap gap-2">
          {BACKGROUND_PRESETS.map((preset) => {
            const isSelected =
              preset.mode.type === backgroundMode.type &&
              (preset.mode.type !== "image" ||
                (backgroundMode.type === "image" && backgroundMode.src === preset.mode.src));
            return (
              <button
                key={preset.id}
                onClick={() => onBackgroundModeChange(preset.mode)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {preset.thumbnail ? (
                  <img
                    src={preset.thumbnail}
                    alt={preset.label}
                    className="h-10 w-14 rounded object-cover"
                  />
                ) : preset.mode.type === "blur" ? (
                  <div className={`flex h-10 w-14 items-center justify-center rounded ${isSelected ? "bg-zinc-700" : "bg-zinc-100"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="12" y1="2" x2="12" y2="5" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="5" y2="12" />
                      <line x1="19" y1="12" x2="22" y2="12" />
                    </svg>
                  </div>
                ) : (
                  <div className={`flex h-10 w-14 items-center justify-center rounded ${isSelected ? "bg-zinc-700" : "bg-zinc-100"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  </div>
                )}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
