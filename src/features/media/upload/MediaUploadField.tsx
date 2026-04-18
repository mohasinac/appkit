"use client";

/**
 * MediaUploadField — single-file upload field for @mohasinac/feat-media.
 *
 * For video: optionally opens VideoTrimModal then VideoThumbnailSelector after upload.
 * Stage locally → caller-provided onUpload() → /api/media/upload.
 */

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useCamera } from "../../../react";
import { Alert, Button, Div, Label, Row, Spinner, Text } from "../../../ui";
import { MediaImage } from "../MediaImage";
import { MediaVideo } from "../MediaVideo";
import { VideoTrimModal } from "../modals/VideoTrimModal";
import { VideoThumbnailSelector } from "../modals/VideoThumbnailSelector";
import CameraCapture from "./CameraCapture";
import { inferMediaTypeFromMime, type MediaField } from "../types/index";

export interface MediaUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onChangeField?: (media: MediaField | null) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  helperText?: string;
  captureSource?: "file-only" | "camera-only" | "both";
  captureMode?: "photo" | "video" | "both";
  enableTrim?: boolean;
  enableThumbnail?: boolean;
  onThumbnailChange?: (url: string) => void;
  /**
   * Called with every URL that was staged (uploaded) but never persisted.
   * The parent form should call `DELETE /api/media?url=…` for each entry.
   */
  onAbort?: (stagedUrls: string[]) => void;
  /**
   * Called whenever staged URLs change.
   */
  onStagedUrlsChange?: (stagedUrls: string[]) => void;
  /**
   * Set true after successful save to prevent auto-cleanup on unmount.
   */
  isPersisted?: boolean;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url);
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url);
}

function filenameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  } catch {
    return url;
  }
}

export function MediaUploadField({
  label,
  value,
  onChange,
  onChangeField,
  onUpload,
  accept = "*",
  maxSizeMB = 50,
  disabled = false,
  helperText,
  captureSource = "file-only",
  captureMode = "photo",
  enableTrim = true,
  enableThumbnail = true,
  onThumbnailChange,
  onAbort,
  onStagedUrlsChange,
  isPersisted = false,
}: MediaUploadFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string | null>(null);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "camera">("file");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCaptureRef = useRef<HTMLInputElement>(null);
  const stagedUrlsRef = useRef<string[]>([]);
  const onAbortRef = useRef(onAbort);
  const onStagedUrlsChangeRef = useRef(onStagedUrlsChange);
  const isPersistedRef = useRef(isPersisted);

  useEffect(() => {
    onAbortRef.current = onAbort;
  }, [onAbort]);

  useEffect(() => {
    onStagedUrlsChangeRef.current = onStagedUrlsChange;
  }, [onStagedUrlsChange]);

  useEffect(() => {
    isPersistedRef.current = isPersisted;
  }, [isPersisted]);

  // On unmount, clean up only if the form wasn't persisted.
  useEffect(() => {
    return () => {
      if (!isPersistedRef.current && stagedUrlsRef.current.length > 0) {
        onAbortRef.current?.([...stagedUrlsRef.current]);
      }
    };
  }, []);

  const emitStaged = () => {
    onStagedUrlsChangeRef.current?.([...stagedUrlsRef.current]);
  };

  const stageUrl = (url: string) => {
    if (!stagedUrlsRef.current.includes(url)) {
      stagedUrlsRef.current.push(url);
      emitStaged();
    }
  };

  const unstageUrl = (url: string) => {
    const next = stagedUrlsRef.current.filter((u) => u !== url);
    if (next.length !== stagedUrlsRef.current.length) {
      stagedUrlsRef.current = next;
      emitStaged();
    }
  };

  const t = useTranslations("camera");
  const tUpload = useTranslations("upload");
  const tMediaEditor = useTranslations("mediaEditor");
  const { isSupported: isCameraSupported } = useCamera();

  const showCamera =
    captureSource === "camera-only" ||
    (captureSource === "both" && inputMode === "camera");
  const showFileInput =
    captureSource === "file-only" ||
    (captureSource === "both" && inputMode === "file");

  const captureModeAccept =
    captureMode === "video"
      ? "video/*"
      : captureMode === "both"
        ? "image/*,video/*"
        : "image/*";

  const afterUpload = (url: string, fileType: string) => {
    onChangeField?.({
      url,
      type: inferMediaTypeFromMime(fileType, url),
    });

    const isVideoFile = fileType.startsWith("video/");
    if (isVideoFile && enableTrim) {
      setPendingVideoUrl(url);
      setShowTrimModal(true);
      return;
    }
    if (isVideoFile && enableThumbnail) {
      setPendingVideoUrl(url);
      setShowThumbnailModal(true);
      return;
    }
    onChange(url);
  };

  const handleTrimSave = (trimmedUrl: string) => {
    setShowTrimModal(false);
    if (enableThumbnail) {
      setPendingVideoUrl(trimmedUrl);
      setShowThumbnailModal(true);
    } else {
      onChange(trimmedUrl);
      setPendingVideoUrl(null);
    }
  };

  const handleTrimClose = () => {
    setShowTrimModal(false);
    if (enableThumbnail && pendingVideoUrl) {
      setShowThumbnailModal(true);
    } else {
      if (pendingVideoUrl) onChange(pendingVideoUrl);
      setPendingVideoUrl(null);
    }
  };

  const handleThumbnailSelect = (thumbUrl: string) => {
    setShowThumbnailModal(false);
    if (pendingVideoUrl) onChange(pendingVideoUrl);
    onThumbnailChange?.(thumbUrl);
    setPendingVideoUrl(null);
  };

  const handleThumbnailClose = () => {
    setShowThumbnailModal(false);
    if (pendingVideoUrl) onChange(pendingVideoUrl);
    setPendingVideoUrl(null);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const url = await onUpload(file);
      stageUrl(url);
      afterUpload(url, file.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    if (value && stagedUrlsRef.current.includes(value)) {
      onAbortRef.current?.([value]);
      unstageUrl(value);
    }
    onChange("");
    onChangeField?.(null);
    setError(null);
  };

  const handleCameraCapture = async (blob: Blob, type: "photo" | "video") => {
    const ext = type === "video" ? "webm" : "webp";
    const file = new File([blob], `camera-capture.${ext}`, { type: blob.type });
    setError(null);
    setIsLoading(true);
    try {
      const url = await onUpload(file);
      stageUrl(url);
      afterUpload(url, blob.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Div className="space-y-2">
      <Label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </Label>

      {value && !isLoading && (
        <Div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
          {isVideo(value) ? (
            <Div className="relative aspect-video overflow-hidden rounded-lg">
              <MediaVideo
                src={value}
                alt={label}
                controls
                objectFit="contain"
              />
            </Div>
          ) : isImage(value) ? (
            <Div className="relative aspect-video overflow-hidden rounded-lg">
              <MediaImage
                src={value}
                alt={label}
                size="card"
                objectFit="contain"
              />
            </Div>
          ) : (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline break-all text-blue-600 dark:text-blue-400"
            >
              {filenameFromUrl(value)}
            </a>
          )}

          {!disabled && (
            <Row wrap gap="sm" className="mt-2">
              {isVideo(value) && (enableTrim || enableThumbnail) && (
                <Button
                  type="button"
                  onClick={() => {
                    setPendingVideoUrl(value);
                    if (enableTrim) setShowTrimModal(true);
                    else setShowThumbnailModal(true);
                  }}
                  variant="secondary"
                  size="sm"
                >
                  {tMediaEditor("editVideo")}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleRemove}
                variant="danger"
                size="sm"
              >
                {tUpload("remove")}
              </Button>
            </Row>
          )}
        </Div>
      )}

      {!disabled && !isLoading && (
        <>
          {captureSource === "both" && isCameraSupported && (
            <Row className="gap-2">
              <Button
                type="button"
                variant={inputMode === "file" ? "primary" : "outline"}
                size="sm"
                onClick={() => setInputMode("file")}
              >
                {t("switchToUpload")}
              </Button>
              <Button
                type="button"
                variant={inputMode === "camera" ? "primary" : "outline"}
                size="sm"
                onClick={() => setInputMode("camera")}
              >
                {t("switchToCamera")}
              </Button>
            </Row>
          )}

          {showCamera && isCameraSupported && (
            <CameraCapture
              mode={captureMode}
              facingMode="environment"
              onCapture={handleCameraCapture}
              onError={(msg) => setError(msg)}
            />
          )}

          {showCamera && !isCameraSupported && (
            <Button
              type="button"
              onClick={() => mobileCaptureRef.current?.click()}
              variant="ghost"
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 dark:text-zinc-400"
            >
              {t("switchToCamera")}
            </Button>
          )}

          {showFileInput && (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 dark:text-zinc-400"
            >
              {value ? tUpload("replaceFile") : tUpload("chooseFile")}
            </Button>
          )}
        </>
      )}

      {isLoading && (
        <Row className="gap-2">
          <Spinner size="sm" />
          <Text size="sm" variant="secondary">
            {tUpload("uploading")}
          </Text>
        </Row>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {showCamera && !isCameraSupported && (
        <input
          ref={mobileCaptureRef}
          type="file"
          accept={captureModeAccept}
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {helperText && !error && (
        <Text variant="secondary" size="xs">
          {helperText}
        </Text>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {pendingVideoUrl && (
        <VideoTrimModal
          isOpen={showTrimModal}
          videoUrl={pendingVideoUrl}
          onClose={handleTrimClose}
          onSave={handleTrimSave}
        />
      )}

      {pendingVideoUrl && (
        <VideoThumbnailSelector
          isOpen={showThumbnailModal}
          videoUrl={pendingVideoUrl}
          onClose={handleThumbnailClose}
          onSelect={handleThumbnailSelect}
          onUpload={onUpload}
        />
      )}
    </Div>
  );
}
