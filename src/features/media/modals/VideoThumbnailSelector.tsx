"use client"
/**
 * VideoThumbnailSelector — frame-capture thumbnail picker for @mohasinac/feat-media.
 *
 * User scrubs to desired frame, clicks "Use This Frame". That frame is drawn to
 * a hidden canvas, converted to JPEG, and uploaded via onUpload.
 */

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
/*
 * Defining modules, not the `ui` barrel — Root Cause #18.
 *
 * `ui/index.ts` re-exports `FormField`, `PaginatedSelect` and
 * `RecordDetailModal`, and those three import back INTO `features/media` and
 * `features/shell`. So reaching a primitive through the barrel closed a
 * ten-module cycle (`audit-import-cycles` component 1) — while the deep paths
 * below have one direction only. `ui → features/media` is the real dependency
 * and it stays; the barrel hop is what did not need to exist.
 */
import { Alert } from "../../../ui/components/Alert";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Modal } from "../../../ui/components/Modal";
import { Spinner } from "../../../ui/components/Spinner";
import { Span, Text } from "../../../ui/components/Typography";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

const __O = {
  hidden: "overflow-hidden",
} as const;

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

      const file = new File([blob], `thumbnail-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const url = await onUpload(file);
      onSelect(url);
      onClose();
    } catch (err) {
      const e = normalizeError(err);
      // `t` is namespaced ("mediaEditor"), so it cannot resolve the absolute
      // `errors.codes.*` keys — omit it and let the authored copy stand.
      setError(toUserMessage(e.code, undefined, { fallback: t("thumbnailError") }));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("thumbnailTitle")}
      size="lg"
    >
      <Stack gap="md">
        <Text variant="secondary" size="xs">
          {t("thumbnailInstruction")}
        </Text>

        {/* Video player — raw <video> required: needs ref for videoWidth/videoHeight */}
        <Div className={`relative aspect-video ${__O.hidden} bg-black`} rounded="lg">
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            controls
            preload="metadata"
          />
        </Div>

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {error && <Alert variant="error">{error}</Alert>}

        <Row justify="end" gap="sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isCapturing}
          >
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
              <Span layout="flex" gap="md" >
                <Spinner size="sm" />
                {t("thumbnailCapturing")}
              </Span>
            ) : (
              t("thumbnailCapture")
            )}
          </Button>
        </Row>
      </Stack>
    </Modal>
  );
}
