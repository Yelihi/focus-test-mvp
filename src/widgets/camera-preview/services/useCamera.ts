import { useRef, useState, useCallback, useEffect } from "react";

export type CameraStatus = "idle" | "waiting" | "streaming" | "disconnected";

interface UseCameraOptions {
  onVideoReady: (video: HTMLVideoElement) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: CameraStatus) => void;
}

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  status: CameraStatus;
  handleDeviceSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function useCamera({ onVideoReady, onError, onStatusChange }: UseCameraOptions): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [status, _setStatus] = useState<CameraStatus>("idle");
  const streamRef = useRef<MediaStream | null>(null);

  const setStatus = useCallback((newStatus: CameraStatus) => {
    _setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

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

        if (deviceId) {
          videoConstraint.deviceId = { exact: deviceId };
        }

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
          setStatus("streaming");
          setSelectedDeviceId(actualDeviceId);
          onVideoReady(videoRef.current);
        }
      } catch (err) {
        if (deviceId) {
          return startCamera();
        }
        setStatus("disconnected");
        const message =
          err instanceof Error ? err.message : "Failed to access camera";
        onError(message);
      } finally {
        await refreshDevices();
      }
    },
    [onVideoReady, onError, stopStream, refreshDevices],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const existing = await refreshDevices();
      const hasPermission = existing.some((d) => d.label);

      if (cancelled) return;

      if (hasPermission) {
        if (existing.length === 1) {
          startCamera(existing[0].deviceId);
        }
      } else {
        await startCamera();
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleDeviceChange = async () => {
      const videoDevices = await refreshDevices();

      if (streamRef.current && selectedDeviceId) {
        const stillExists = videoDevices.some(
          (d) => d.deviceId === selectedDeviceId,
        );
        if (!stillExists) {
          stopStream();
          setStatus("disconnected");

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

  return { videoRef, devices, selectedDeviceId, status, handleDeviceSelect };
}
