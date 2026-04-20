"use client"
/**
 * VideoTrimModal — set-in/out trim for @mohasinac/feat-media.
 *
 * Calls POST /api/media/trim via useMediaTrim. Returns trimmed URL on save.
 */

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Div, Modal, Row, Span, Stack, Text } from "../../../ui";
import { MediaSlider } from "../components/MediaSlider";
import { useMediaTrim } from "../hooks/useMedia";

export interface VideoTrimModalProps {
  isOpen: boolean;
  /** Already-uploaded video URL on an approved CDN/Storage domain. */
  videoUrl: string;
  onClose: () => void;
  /** Called with the trimmed video URL after the server operation succeeds. */
  onSave: (trimmedUrl: string) => void;
  /** Override POST endpoint. Defaults to /api/media/trim. */
  endpoint?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoTrimModal({
  isOpen,
  videoUrl,
  onClose,
  onSave,
  endpoint,
}: VideoTrimModalProps) {
  const t = useTranslations("mediaEditor");
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { mutateAsync: trim, isPending } = useMediaTrim(endpoint);

  useEffect(() => {
    if (isOpen) {
      setStartTime(0);
      setEndTime(0);
      setDuration(0);
      setError(null);
    }
  }, [isOpen, videoUrl]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setEndTime(video.duration);
  };

  const seekTo = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const handleStartChange = (val: number) => {
    const clamped = Math.min(val, endTime - 0.1);
    setStartTime(clamped);
    seekTo(clamped);
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.max(val, startTime + 0.1);
    setEndTime(clamped);
    seekTo(clamped);
  };

  const handleTrim = async () => {
    setError(null);
    try {
      const result = await trim({ sourceUrl: videoUrl, startTime, endTime, quality });
      onSave(result.url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trimError"));
    }
  };

  const qualityLabels: Record<"low" | "medium" | "high", string> = {
    low: t("trimQualityLow"),
    medium: t("trimQualityMedium"),
    high: t("trimQualityHigh"),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("trimTitle")} size="lg">
      <Stack gap="md">
        <Text variant="secondary" className="text-xs">
          {t("trimInstruction")}
        </Text>

        {/* Video player — raw <video> required: needs ref for duration/currentTime */}
        <Div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            controls
            onLoadedMetadata={handleLoadedMetadata}
          />
        </Div>

        {duration > 0 && (
          <>
            <Stack gap="xs">
              <Row justify="between">
                <Text size="sm">{t("trimStart")}</Text>
                <Span className="text-sm font-mono tabular-nums">
                  {formatTime(startTime)}
                </Span>
              </Row>
              <MediaSlider
                value={startTime}
                min={0}
                max={duration}
                step={0.1}
                onChange={handleStartChange}
              />
            </Stack>

            <Stack gap="xs">
              <Row justify="between">
                <Text size="sm">{t("trimEnd")}</Text>
                <Span className="text-sm font-mono tabular-nums">
                  {formatTime(endTime)}
                </Span>
              </Row>
              <MediaSlider
                value={endTime}
                min={0}
                max={duration}
                step={0.1}
                onChange={handleEndChange}
              />
            </Stack>

            <Text size="xs" variant="secondary">
              {t("trimDuration", { duration: (endTime - startTime).toFixed(1) })}
            </Text>

            <Stack gap="xs">
              <Text size="sm">{t("trimQuality")}</Text>
              <Div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant={quality === q ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setQuality(q)}
                    disabled={isPending}
                  >
                    {qualityLabels[q]}
                  </Button>
                ))}
              </Div>
            </Stack>
          </>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <Row justify="end" className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            {t("trimSkip")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleTrim}
            disabled={isPending || duration === 0}
          >
            {isPending ? t("trimming") : t("trimSave")}
          </Button>
        </Row>
      </Stack>
    </Modal>
  );
}
