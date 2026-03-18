"use client";

import { useRef, useState } from "react";
import type { SessionGoal } from "@/entities/focus-session/models";
import { useBlurPreview } from "@/features/background-blur";
import { destroySegmenter } from "@/features/detection";
import { Modal, Button } from "@/shared/ui";
import { useCamera } from "./useCamera";
import { CameraPreview } from "./CameraPreview";
import { GoalForm } from "./GoalForm";

interface GoalSettingModalProps {
  onStart: (goal: SessionGoal, stream: MediaStream, backgroundBlur: boolean) => void;
  onCancel: () => void;
}

export function GoalSettingModal({ onStart, onCancel }: GoalSettingModalProps) {
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [focusPercent, setFocusPercent] = useState(70);
  const [dailyGoalText, setDailyGoalText] = useState("");
  const [backgroundBlur, setBackgroundBlur] = useState(false);

  const blurCanvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera();

  const { loading: blurLoading } = useBlurPreview({
    videoRef: camera.videoRef,
    canvasRef: blurCanvasRef,
    enabled: backgroundBlur,
    streaming: camera.isStreaming,
  });

  const handleSubmit = () => {
    if (!camera.isStreaming || !camera.streamRef.current) return;
    camera.startingRef.current = true;
    onStart(
      {
        targetHours: hours,
        targetMinutes: minutes,
        targetFocusPercent: focusPercent,
        dailyGoalText: dailyGoalText.trim() || undefined,
      },
      camera.streamRef.current,
      backgroundBlur,
    );
  };

  const handleCancel = () => {
    camera.startingRef.current = false;
    camera.stopStream();
    destroySegmenter();
    onCancel();
  };

  return (
    <Modal maxWidth="lg" className="overflow-y-auto">
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
        <Button variant="icon" onClick={handleCancel} className="ml-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>

      <div className="px-6 pb-6 space-y-5">
        <CameraPreview
          videoRef={camera.videoRef}
          blurCanvasRef={blurCanvasRef}
          cameraStatus={camera.cameraStatus}
          cameraError={camera.cameraError}
          isStreaming={camera.isStreaming}
          backgroundBlur={backgroundBlur}
          blurLoading={blurLoading}
          devices={camera.devices}
          selectedDeviceId={camera.selectedDeviceId}
          onDeviceSelect={camera.handleDeviceSelect}
          onStartCamera={camera.startCamera}
          onToggleBlur={() => setBackgroundBlur((v) => !v)}
        />

        <hr className="border-zinc-100" />

        <GoalForm
          hours={hours}
          minutes={minutes}
          focusPercent={focusPercent}
          dailyGoalText={dailyGoalText}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
          onFocusPercentChange={setFocusPercent}
          onDailyGoalTextChange={setDailyGoalText}
        />

        <hr className="border-zinc-100" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel} className="px-4 py-2">
            취소
          </Button>
          <button
            onClick={handleSubmit}
            disabled={!camera.isStreaming}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              camera.isStreaming
                ? "bg-zinc-900 text-white hover:bg-zinc-700"
                : "cursor-not-allowed bg-zinc-300 text-zinc-500"
            }`}
          >
            {camera.cameraStatus === "waiting" ? "카메라 연결 중..." : "시작하기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
