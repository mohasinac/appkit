"use client";

/**
 * CameraCapture — live camera viewfinder for @mohasinac/feat-media.
 *
 * Photo-capture, video-recording, or both. Camera-flip when multiple inputs detected.
 * Uses `useCamera` from `@mohasinac/react`.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCamera } from "@mohasinac/react";
import { Alert, Button, Span, Spinner } from "@mohasinac/ui";

export interface CameraCaptureProps {
  mode: "photo" | "video" | "both";
  facingMode?: "user" | "environment";
  onCapture: (blob: Blob, type: "photo" | "video") => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function CameraCapture({
  mode,
  facingMode = "environment",
  onCapture,
  onError,
  className,
}: CameraCaptureProps) {
  const t = useTranslations("camera");
  const camera = useCamera();

  const [isStarting, setIsStarting] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setIsStarting(true);
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices?.enumerateDevices
      ) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setHasMultipleCameras(
            devices.filter((d) => d.kind === "videoinput").length > 1,
          );
        }
      }
      await camera.startCamera({
        facingMode,
        audio: mode === "video" || mode === "both",
      });
      if (!cancelled) setIsStarting(false);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (camera.error && onError) onError(camera.error);
  }, [camera.error, onError]);

  const handleTakePhoto = () => {
    const blob = camera.takePhoto();
    if (blob) onCapture(blob, "photo");
  };

  const handleStopRecording = async () => {
    const blob = await camera.stopRecording();
    onCapture(blob, "video");
  };

  const showPhotoButton = mode === "photo" || mode === "both";
  const showVideoButton = mode === "video" || mode === "both";

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-black ${className ?? ""}`}
    >
      <video
        ref={camera.videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video object-cover"
      />

      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <Span className="text-white text-sm">{t("starting")}</Span>
          </div>
        </div>
      )}

      {camera.error && (
        <div className="absolute top-2 left-2 right-2">
          <Alert variant="error">{camera.error}</Alert>
        </div>
      )}

      {!isStarting && !camera.error && camera.isActive && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 flex items-center justify-center gap-3">
          {showPhotoButton && (
            <Button
              variant="secondary"
              onClick={handleTakePhoto}
              aria-label={t("takePhoto")}
              disabled={camera.isCapturing}
            >
              {t("takePhoto")}
            </Button>
          )}

          {showVideoButton && (
            <Button
              variant={camera.isCapturing ? "danger" : "secondary"}
              onClick={
                camera.isCapturing
                  ? handleStopRecording
                  : () => camera.startRecording()
              }
              aria-label={
                camera.isCapturing ? t("stopRecording") : t("startRecording")
              }
            >
              {camera.isCapturing ? t("stopRecording") : t("startRecording")}
            </Button>
          )}

          {hasMultipleCameras && (
            <Button
              variant="outline"
              onClick={() => void camera.switchCamera()}
              aria-label={t("flipCamera")}
              disabled={camera.isCapturing}
            >
              {t("flipCamera")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
