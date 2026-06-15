"use client"
/**
 * CameraCapture — live camera viewfinder for @mohasinac/feat-media.
 *
 * Photo-capture, video-recording, or both. Camera-flip when multiple inputs detected.
 * Uses `useCamera` from `@mohasinac/react`.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCamera } from "../../../react";
import { Alert, Button, Div, Row, Span, Spinner, Stack } from "../../../ui";
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

  const handleTakePhoto = async () => {
    const blob = await camera.takePhoto();
    if (blob) onCapture(blob, "photo");
  };

  const handleStopRecording = async () => {
    const blob = await camera.stopRecording();
    onCapture(blob, "video");
  };

  const showPhotoButton = mode === "photo" || mode === "both";
  const showVideoButton = mode === "video" || mode === "both";

  return (
    <Div
      className={`relative overflow-hidden bg-black ${className ?? ""}`} rounded="xl"
    >
      <video
        ref={camera.videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video object-cover"
      />

      {isStarting && (
        <Row className="absolute inset-0 bg-black/60" align="center" justify="center">
          <Stack align="center" gap="sm">
            <Spinner />
            <Span size="sm" className="text-white">{t("starting")}</Span>
          </Stack>
        </Row>
      )}

      {camera.error && (
        <Div className="absolute top-2 left-2 right-2">
          <Alert variant="error">{camera.error}</Alert>
        </Div>
      )}

      {!isStarting && !camera.error && camera.isActive && (
        <Row className="absolute bottom-0 left-0 right-0 bg-black/40" align="center" justify="center" gap="3" padding="sm">
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
        </Row>
      )}
    </Div>
  );
}
