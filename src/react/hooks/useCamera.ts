"use client";
import "client-only";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCameraOptions {
  facingMode?: "user" | "environment";
  video?: boolean | MediaTrackConstraints;
  audio?: boolean;
}

export interface UseCameraReturn {
  isSupported: boolean;
  isActive: boolean;
  isCapturing: boolean;
  stream: MediaStream | null;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: (options?: UseCameraOptions) => Promise<void>;
  stopCamera: () => void;
  takePhoto: () => Blob | null;
  startRecording: () => void;
  stopRecording: () => Promise<Blob>;
  switchCamera: () => Promise<void>;
}

/**
 * useCamera
 *
 * Provides access to the device camera via the MediaDevices API.
 * Zero domain imports. Safe to use in any Tier 1 / Tier 2 component.
 *
 * Lifecycle:
 * - Call `startCamera()` to open the stream and wire `videoRef` to a <video> element.
 * - `stopCamera()` releases hardware tracks (turns off the camera indicator light).
 * - `takePhoto()` captures the current frame as image/webp.
 * - `startRecording()` / `stopRecording()` use MediaRecorder (video/webm output).
 * - `useEffect` cleanup calls `stopCamera()` automatically on unmount.
 */
export function useCamera(): UseCameraReturn {
  const isSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentFacingModeRef = useRef<"user" | "environment">("environment");
  const stopRecordingResolveRef = useRef<((blob: Blob) => void) | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsActive(false);
    setIsCapturing(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(
    async (options?: UseCameraOptions) => {
      if (!isSupported) {
        setError("Camera is not supported on this device");
        return;
      }
      setError(null);
      stopCamera();

      const facingMode = options?.facingMode ?? "environment";
      currentFacingModeRef.current = facingMode;

      const videoConstraints: boolean | MediaTrackConstraints =
        options?.video !== undefined ? options.video : { facingMode };

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: options?.audio ?? false,
        });
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow access in your browser settings."
            : "Camera unavailable";
        setError(message);
      }
    },
    [isSupported, stopCamera],
  );

  const takePhoto = useCallback((): Blob | null => {
    const video = videoRef.current;
    if (!video || !isActive) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    let result: Blob | null = null;
    canvas.toBlob(
      (blob) => {
        result = blob;
      },
      "image/webp",
      0.92,
    );
    return result;
  }, [isActive]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || !isActive) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setIsCapturing(false);
      if (stopRecordingResolveRef.current) {
        stopRecordingResolveRef.current(blob);
        stopRecordingResolveRef.current = null;
      }
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsCapturing(true);
  }, [isActive]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      stopRecordingResolveRef.current = resolve;
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      } else {
        resolve(new Blob([], { type: "video/webm" }));
      }
    });
  }, []);

  const switchCamera = useCallback(async () => {
    const next =
      currentFacingModeRef.current === "environment" ? "user" : "environment";
    await startCamera({ facingMode: next });
  }, [startCamera]);

  return {
    isSupported,
    isActive,
    isCapturing,
    stream,
    error,
    videoRef,
    startCamera,
    stopCamera,
    takePhoto,
    startRecording,
    stopRecording,
    switchCamera,
  };
}
