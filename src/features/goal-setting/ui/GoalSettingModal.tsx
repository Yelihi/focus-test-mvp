"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { SessionGoal } from "@/entities/focus-session/model";

type CameraStatus = "idle" | "waiting" | "streaming" | "error";

interface GoalSettingModalProps {
  onStart: (goal: SessionGoal, stream: MediaStream) => void;
  onCancel: () => void;
}

export function GoalSettingModal({ onStart, onCancel }: GoalSettingModalProps) {
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [focusPercent, setFocusPercent] = useState(70);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopStream();
      setCameraStatus("waiting");
      setCameraError(null);

      try {
        const videoConstraint: MediaTrackConstraints = {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        };
        if (deviceId) videoConstraint.deviceId = { exact: deviceId };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: true,
        });
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const actualDeviceId = track?.getSettings().deviceId ?? deviceId ?? "";

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setSelectedDeviceId(actualDeviceId);
        setCameraStatus("streaming");
      } catch (err) {
        if (deviceId) {
          return startCamera();
        }
        setCameraStatus("error");
        setCameraError(
          err instanceof Error ? err.message : "카메라에 접근할 수 없습니다",
        );
      } finally {
        await refreshDevices();
      }
    },
    [stopStream, refreshDevices],
  );

  // Auto-start on mount
  useEffect(() => {
    startCamera();

    return () => {
      if (!startingRef.current) {
        stopStream();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeviceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    if (deviceId) startCamera(deviceId);
  };

  const handleSubmit = () => {
    if (cameraStatus !== "streaming" || !streamRef.current) return;
    startingRef.current = true;
    onStart(
      { targetHours: hours, targetMinutes: minutes, targetFocusPercent: focusPercent },
      streamRef.current,
    );
  };

  const handleCancel = () => {
    startingRef.current = false;
    stopStream();
    onCancel();
  };

  const isStreaming = cameraStatus === "streaming";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              집중 모니터링 시작
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              카메라 설정을 확인하고 목표를 설정하세요
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="ml-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Camera preview section */}
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
                className="h-full w-full -scale-x-100 object-cover"
                playsInline
                muted
              />

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
              <select
                value={selectedDeviceId}
                onChange={handleDeviceSelect}
                disabled={devices.length === 0}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 disabled:opacity-50"
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
              </select>

              {/* "카메라 켜기" button — only shown when not streaming */}
              {!isStreaming && (
                <button
                  onClick={() => startCamera(selectedDeviceId || undefined)}
                  disabled={cameraStatus === "waiting"}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  카메라 켜기
                </button>
              )}
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* Goal settings */}
          <div className="space-y-4">
            {/* Target time */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                목표 시간
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(12, Number(e.target.value))))}
                  className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-center text-sm text-zinc-900"
                />
                <span className="text-sm text-zinc-500">시간</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-center text-sm text-zinc-900"
                />
                <span className="text-sm text-zinc-500">분</span>
              </div>
            </div>

            {/* Target focus */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                목표 집중도
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={focusPercent}
                  onChange={(e) => setFocusPercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-center text-sm text-zinc-900"
                />
                <span className="text-sm text-zinc-500">%</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                권장 집중도는 70~85%입니다. 너무 높은 목표는 오히려 역효과가 될 수 있습니다.
              </p>
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isStreaming}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                isStreaming
                  ? "bg-zinc-900 text-white hover:bg-zinc-700"
                  : "cursor-not-allowed bg-zinc-300 text-zinc-500"
              }`}
            >
              {cameraStatus === "waiting" ? "카메라 연결 중..." : "시작하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
