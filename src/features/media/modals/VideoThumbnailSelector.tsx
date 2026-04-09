"use client";

/**
 * VideoThumbnailSelector — frame-capture thumbnail picker for @mohasinac/feat-media.
 *
 * User scrubs to desired frame, clicks "Use This Frame". That frame is drawn to
 * a hidden canvas, converted to JPEG, and uploaded via onUpload.
 */

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Modal, Spinner, Text } from "@mohasinac/ui";

export interface VideoThumbnailSelectorProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void;
  /** Called with the uploaded thumbnail URL after capture succeeds. */
  onSelect: (thumbnailUrl: string) => void;
  /** Upload callback — receive File, return uploaded URL. Pass useMediaUpload().upload. */
  onUpload: (file: File) => Promise<string>;
}

export function VideoThumbnailSelector({
  isOpen,
  videoUrl,
  onClose,
  onSelect,
  onUpload,
}: VideoThumbnailSelectorProps) {
  const t = useTranslations("mediaEditor");
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setError(null);
    setIsCapturing(true);

    try {
      video.pause();

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error(t("thumbnailError"));

      const file = new File([blob], `thumbnail-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await onUpload(file);
      onSelect(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("thumbnailError"));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("thumbnailTitle")} size="lg">
      <div className="space-y-4">
        <Text variant="secondary" className="text-xs">
          {t("thumbnailInstruction")}
        </Text>

        {/* Video player — raw <video> required: needs ref for videoWidth/videoHeight */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            controls
            preload="metadata"
          />
        </div>

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isCapturing}>
            {t("thumbnailSkip")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCapture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                {t("thumbnailCapturing")}
              </span>
            ) : (
              t("thumbnailCapture")
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
