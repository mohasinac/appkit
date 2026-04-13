"use client";

/**
 * ImageUpload — canonical image upload component for @mohasinac/feat-media.
 *
 * Stage locally → caller-provided onUpload() → /api/media/upload.
 * Optional focal-point crop (enableCrop, default true).
 * Optional camera capture (captureSource="both").
 */

import { useState, useRef, ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useCamera } from "../../../react";
import {
  Alert,
  Button,
  Div,
  Label,
  Progress,
  Row,
  Span,
  Spinner,
  Text,
} from "../../../ui";
import { MediaImage } from "../MediaImage";
import { ImageCropModal } from "../modals/ImageCropModal";
import type { ImageCropData } from "../modals/ImageCropModal";
import CameraCapture from "./CameraCapture";

export interface ImageUploadProps {
  currentImage?: string;
  onUpload: (file: File) => Promise<string>;
  onChange?: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
  captureSource?: "file-only" | "camera-only" | "both";
  enableCrop?: boolean;
  onCropDataChange?: (cropData: ImageCropData) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

export function ImageUpload({
  currentImage,
  onUpload,
  onChange,
  accept = "image/jpeg,image/png,image/gif,image/webp",
  maxSizeMB = 10,
  label = "Upload Image",
  helperText,
  captureSource = "both",
  enableCrop = true,
  onCropDataChange,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || "");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [captureMode, setCaptureMode] = useState<"file" | "camera">("file");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCaptureRef = useRef<HTMLInputElement>(null);

  const t = useTranslations("camera");
  const tUpload = useTranslations("upload");
  const tMediaEditor = useTranslations("mediaEditor");
  const { isSupported: isCameraSupported } = useCamera();

  const showCamera =
    captureSource === "camera-only" ||
    (captureSource === "both" && captureMode === "camera");
  const showFileInput =
    captureSource === "file-only" ||
    (captureSource === "both" && captureMode === "file");

  const performUpload = async (file: File, cropData?: ImageCropData) => {
    try {
      setUploading(true);
      setProgress(30);
      const url = await onUpload(file);
      setProgress(100);
      setPreview(url);
      onChange?.(url);
      if (cropData) onCropDataChange?.(cropData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setPreview(currentImage || "");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const prepareFile = (file: File) => {
    if (!enableCrop) {
      void performUpload(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropPreviewUrl(event.target.result as string);
        setPendingFile(file);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (cropData: ImageCropData) => {
    setShowCropModal(false);
    if (pendingFile) void performUpload(pendingFile, cropData);
    setCropPreviewUrl(null);
    setPendingFile(null);
  };

  const handleCropClose = () => {
    setShowCropModal(false);
    setCropPreviewUrl(null);
    if (pendingFile) {
      void performUpload(pendingFile);
      setPendingFile(null);
    }
  };

  const handleCameraCapture = (blob: Blob) => {
    const file = new File([blob], "camera-capture.webp", {
      type: "image/webp",
    });
    setError("");
    setProgress(0);
    prepareFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setProgress(0);

    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      setError(
        `File size must be less than ${maxSizeMB}MB (current: ${formatFileSize(file.size)})`,
      );
      return;
    }
    const acceptedTypes = accept.split(",").map((t) => t.trim());
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted: ${accept}`);
      return;
    }
    prepareFile(file);
  };

  const handleRemove = () => {
    setPreview("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.("");
  };

  return (
    <Div className="space-y-3">
      {label && (
        <Label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </Label>
      )}

      <Div className="relative">
        {preview ? (
          <Div className="space-y-2">
            <Div className="relative aspect-[16/9] overflow-hidden rounded-xl border-2 border-zinc-200 dark:border-zinc-700">
              <MediaImage src={preview} alt="Preview" size="card" />
              {uploading && progress > 0 && (
                <Div className="absolute inset-x-0 bottom-0">
                  <Progress value={progress} size="sm" />
                </Div>
              )}
            </Div>

            {!uploading && (
              <Row wrap gap="sm">
                {enableCrop && (
                  <Button
                    type="button"
                    onClick={() => {
                      setCropPreviewUrl(preview);
                      setShowCropModal(true);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    {tMediaEditor("editImage")}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  {tUpload("change")}
                </Button>
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
        ) : (
          <>
            {captureSource === "both" && isCameraSupported && (
              <Div className="flex items-center justify-center gap-2 mb-3">
                <Button
                  type="button"
                  variant={captureMode === "file" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setCaptureMode("file")}
                >
                  {t("switchToUpload")}
                </Button>
                <Button
                  type="button"
                  variant={captureMode === "camera" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setCaptureMode("camera")}
                >
                  {t("switchToCamera")}
                </Button>
              </Div>
            )}

            {showCamera && isCameraSupported && (
              <CameraCapture
                mode="photo"
                facingMode="environment"
                onCapture={handleCameraCapture}
                onError={setError}
              />
            )}

            {showCamera && !isCameraSupported && (
              <Button
                type="button"
                onClick={() => mobileCaptureRef.current?.click()}
                disabled={uploading}
                variant="ghost"
                className="w-full aspect-[16/9] border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center flex-col text-zinc-500 dark:text-zinc-400"
              >
                <Span className="text-sm font-medium">
                  {t("switchToCamera")}
                </Span>
              </Button>
            )}

            {showFileInput && (
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="ghost"
                className="w-full aspect-[16/9] border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center flex-col text-zinc-500 dark:text-zinc-400"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <Span className="text-sm font-medium">
                  {uploading ? tUpload("uploading") : tUpload("clickToUpload")}
                </Span>
                <Span className="text-xs mt-1">
                  {accept
                    .split(",")
                    .map((t) => t.split("/")[1]?.toUpperCase() ?? t)
                    .join(", ")}{" "}
                  (max {maxSizeMB}MB)
                </Span>
              </Button>
            )}
          </>
        )}
      </Div>

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
          accept="image/*"
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

      {uploading && (
        <Div className="flex items-center gap-2">
          <Spinner size="sm" />
          <Text size="sm" variant="secondary">
            {tUpload("uploadingProgress", { progress })}
          </Text>
        </Div>
      )}

      {cropPreviewUrl && (
        <ImageCropModal
          isOpen={showCropModal}
          imageUrl={cropPreviewUrl}
          onClose={handleCropClose}
          onSave={handleCropSave}
        />
      )}
    </Div>
  );
}
