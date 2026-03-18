"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { CameraStatus } from "../config/constants";

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  startingRef: React.MutableRefObject<boolean>;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  isStreaming: boolean;
  startCamera: (deviceId?: string) => Promise<void>;
  stopStream: () => void;
  handleDeviceSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function useCamera(): UseCameraReturn {
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

  return {
    videoRef,
    streamRef,
    startingRef,
    devices,
    selectedDeviceId,
    cameraStatus,
    cameraError,
    isStreaming: cameraStatus === "streaming",
    startCamera,
    stopStream,
    handleDeviceSelect,
  };
}
