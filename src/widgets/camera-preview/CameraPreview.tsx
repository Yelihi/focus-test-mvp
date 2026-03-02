"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type CameraStatus = "idle" | "waiting" | "streaming" | "disconnected";

interface CameraPreviewProps {
  onVideoReady: (video: HTMLVideoElement) => void;
  onError: (error: string) => void;
}

export function CameraPreview({ onVideoReady, onError }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [status, setStatus] = useState<CameraStatus>("idle");
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      try {
        stopStream();
        setStatus("waiting");

        const videoConstraint: MediaTrackConstraints = {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        };

        // Only use exact when deviceId is a real non-empty value
        if (deviceId) {
          videoConstraint.deviceId = { exact: deviceId };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: true,
        });
        streamRef.current = stream;

        // Read actual deviceId from the track (most reliable source)
        const track = stream.getVideoTracks()[0];
        const actualDeviceId = track?.getSettings().deviceId ?? deviceId ?? "";

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("streaming");
          setSelectedDeviceId(actualDeviceId);
          onVideoReady(videoRef.current);
        }
      } catch (err) {
        // If exact deviceId failed, retry without it
        if (deviceId) {
          return startCamera();
        }
        setStatus("disconnected");
        const message =
          err instanceof Error ? err.message : "Failed to access camera";
        onError(message);
      } finally {
        // Always refresh device list, even if getUserMedia failed
        await refreshDevices();
      }
    },
    [onVideoReady, onError, stopStream, refreshDevices],
  );

  // Initial mount: get permission + enumerate devices
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Check if we already have permission (devices with labels)
      const existing = await refreshDevices();
      const hasPermission = existing.some((d) => d.label);

      if (cancelled) return;

      if (hasPermission) {
        // Already permitted — show list, auto-start if 1 camera
        if (existing.length === 1) {
          startCamera(existing[0].deviceId);
        }
      } else {
        // No permission yet — start default camera to trigger prompt
        // This also populates the device list via refreshDevices inside startCamera
        await startCamera();
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // devicechange listener
  useEffect(() => {
    const handleDeviceChange = async () => {
      const videoDevices = await refreshDevices();

      // If currently streaming, check if the active device was removed
      if (streamRef.current && selectedDeviceId) {
        const stillExists = videoDevices.some(
          (d) => d.deviceId === selectedDeviceId,
        );
        if (!stillExists) {
          stopStream();
          setStatus("disconnected");

          // Fallback to another camera
          if (videoDevices.length > 0) {
            startCamera(videoDevices[0].deviceId);
          }
        }
      }
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [selectedDeviceId, startCamera, stopStream, refreshDevices]);

  const handleDeviceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    if (deviceId) {
      startCamera(deviceId);
    }
  };

  const activeLabel =
    devices.find((d) => d.deviceId === selectedDeviceId)?.label || "";

  const statusText: Record<CameraStatus, string> = {
    idle: "Select a camera to start",
    waiting: "Connecting...",
    streaming: "",
    disconnected: "Camera disconnected",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative overflow-hidden rounded-xl bg-zinc-900">
        <video
          ref={videoRef}
          className="h-[360px] w-[480px] -scale-x-100 object-cover"
          playsInline
          muted
        />
        {status !== "streaming" && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
            {statusText[status]}
          </div>
        )}
      </div>

      {status === "streaming" && activeLabel && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {activeLabel}
        </p>
      )}

      {devices.length > 0 && (
        <select
          value={selectedDeviceId}
          onChange={handleDeviceSelect}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {!selectedDeviceId && (
            <option value="">-- Select camera --</option>
          )}
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
