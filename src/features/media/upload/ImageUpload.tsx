"use client"
import { normalizeError } from "../../../errors/normalize";
/**
 * ImageUpload — canonical image upload component for @mohasinac/feat-media.
 *
 * Stage locally → caller-provided onUpload() → sign+PUT+finalize signed-URL flow.
 * Optional focal-point crop (enableCrop, default true).
 * Optional camera capture (captureSource="both").
 */

import { useState, useRef, ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useCamera } from "../../../react";
import { Alert, Button, Div, Label, Progress, Row, Span, Spinner, Stack, Text } from "../../../ui";
import { MediaImage } from "../MediaImage";
import { ImageCropModal } from "../modals/ImageCropModal";
import type { ImageCropData } from "../modals/ImageCropModal";
import { ImageEditor } from "../modals/ImageEditor";
import CameraCapture from "./CameraCapture";

const __O = {
  hidden: "overflow-hidden",
} as const;

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
  /** Use the advanced pixel cropper instead of the focal-point editor. */
  enableAdvancedCrop?: boolean;
  /** Lock the crop aspect ratio (e.g. 1 for square, 16/9 for widescreen). */
  cropAspectRatio?: number;
  onCropDataChange?: (cropData: ImageCropData) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function matchesMimeAccept(fileType: string, accept: string): boolean {
  return accept.split(",").map((a) => a.trim()).some((pattern) => {
    if (pattern === "*" || pattern === "*/*") return true;
    const [pType, pSub] = pattern.split("/");
    const [fType, fSub] = fileType.split("/");
    if (pType !== fType) return false;
    return pSub === "*" || pSub === fSub;
  });
}

export function ImageUpload({
  currentImage,
  onUpload,
  onChange,
  accept = "image/*",
  maxSizeMB = 10,
  label = "Upload Image",
  helperText,
  captureSource = "both",
  enableCrop = true,
  enableAdvancedCrop = false,
  cropAspectRatio,
  onCropDataChange,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || "");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
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
      void normalizeError(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setPreview(currentImage || "");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const prepareFile = (file: File) => {
    if (!enableCrop && !enableAdvancedCrop) {
      void performUpload(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropPreviewUrl(event.target.result as string);
        setPendingFile(file);
        if (enableAdvancedCrop) {
          setShowAdvancedEditor(true);
        } else {
          setShowCropModal(true);
        }
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

  const handleAdvancedEditorSave = (croppedFile: File) => {
    setShowAdvancedEditor(false);
    setCropPreviewUrl(null);
    setPendingFile(null);
    void performUpload(croppedFile);
  };

  const openEditor = (url: string) => {
    setCropPreviewUrl(url);
    if (enableAdvancedCrop) setShowAdvancedEditor(true);
    else setShowCropModal(true);
  };

  const handleAdvancedEditorClose = () => {
    setShowAdvancedEditor(false);
    setCropPreviewUrl(null);
    if (pendingFile) {
      void performUpload(pendingFile);
      setPendingFile(null);
    }
  };

  const handleCameraCapture = (blob: Blob) => {
    // blob.type can be empty from some camera implementations; hard-coded
    // image/webp is always correct here since ImageUpload is photo-only.
    const file = new File([blob], "camera-capture.webp", {
      type: blob.type || "image/webp",
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
    if (!matchesMimeAccept(file.type, accept)) {
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
    <Stack gap="3">
      {label && (
        <Label className="block text-zinc-600 dark:text-zinc-400" size="sm" weight="medium">
          {label}
        </Label>
      )}

      <Div className="relative">
        {preview ? (
          <Stack gap="sm">
            <Div className={`relative h-32 max-w-xs mx-auto ${__O.hidden}`} rounded="lg" border="default">
              <MediaImage src={preview} alt="Preview" size="card" />
              {uploading && progress > 0 && (
                <Div className="absolute inset-x-0 bottom-0">
                  <Progress value={progress} size="sm" />
                </Div>
              )}
            </Div>

            {!uploading && (
              <Row wrap gap="sm">
                {(enableCrop || enableAdvancedCrop) && (
                  <Button
                    type="button"
                    onClick={() => openEditor(preview)}
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
          </Stack>
        ) : (
          <>
            {showCamera && isCameraSupported && (
              <CameraCapture
                mode="photo"
                facingMode="environment"
                onCapture={handleCameraCapture}
                onError={setError}
              />
            )}

            {!showCamera && (
              <Stack gap="sm">
                <Row gap="sm" wrap>
                  {showFileInput && (
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      variant="outline"
                      size="sm"
                    >
                      {uploading ? tUpload("uploading") : tUpload("clickToUpload")}
                    </Button>
                  )}
                  {captureSource !== "file-only" && isCameraSupported && (
                    <Button
                      type="button"
                      onClick={() => setCaptureMode("camera")}
                      disabled={uploading}
                      variant="ghost"
                      size="sm"
                    >
                      {t("switchToCamera")}
                    </Button>
                  )}
                  {captureSource !== "file-only" && !isCameraSupported && (
                    <Button
                      type="button"
                      onClick={() => mobileCaptureRef.current?.click()}
                      disabled={uploading}
                      variant="ghost"
                      size="sm"
                    >
                      {t("switchToCamera")}
                    </Button>
                  )}
                </Row>
                <Text size="xs" variant="secondary">
                  {accept === "image/*"
                    ? `JPG PNG GIF WebP`
                    : accept.split(",").map((a) => a.split("/")[1]?.toUpperCase() ?? a).join(" ")}{" "}
                  — max {maxSizeMB}MB
                </Text>
              </Stack>
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
        data-testid="media-upload-input"
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
          data-testid="media-upload-capture-input"
        />
      )}

      {helperText && !error && (
        <Text variant="secondary" size="xs">
          {helperText}
        </Text>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {uploading && (
        <Row gap="sm">
          <Spinner size="sm" />
          <Text size="sm" variant="secondary">
            {tUpload("uploadingProgress", { progress })}
          </Text>
        </Row>
      )}

      {cropPreviewUrl && !enableAdvancedCrop && (
        <ImageCropModal
          isOpen={showCropModal}
          imageUrl={cropPreviewUrl}
          onClose={handleCropClose}
          onSave={handleCropSave}
        />
      )}

      {cropPreviewUrl && enableAdvancedCrop && (
        <ImageEditor
          isOpen={showAdvancedEditor}
          imageUrl={cropPreviewUrl}
          onClose={handleAdvancedEditorClose}
          onSave={handleAdvancedEditorSave}
          aspectRatio={cropAspectRatio}
        />
      )}
    </Stack>
  );
}
