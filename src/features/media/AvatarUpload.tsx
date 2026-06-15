"use client"
import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Div, Input, Progress, Text, useToast } from "../../ui";
import { useMediaUpload } from "./hooks/useMedia";
import { ImageCropModal, type ImageCropData } from "./modals/ImageCropModal";
import { AvatarDisplay } from "../../ui/components/AvatarDisplay";

import { normalizeError } from "../../errors/normalize";
export interface AvatarUploadProps {
  currentPhotoURL?: string | null;
  currentCropData?: ImageCropData | null;
  userId: string;
  displayName?: string;
  onUploadSuccess?: (
    photoURL: string,
    cropData: ImageCropData,
  ) => Promise<void> | void;
  onUploadError?: (error: string) => void;
  onSaveComplete?: () => void;
  onPendingStateChange?: (hasPending: boolean) => void;
  labels?: {
    chooseImage?: string;
    changePhoto?: string;
    removePhoto?: string;
    saveAvatar?: string;
    cancelChange?: string;
    uploading?: string;
    readyToSave?: string;
  };
}

export function AvatarUpload({
  currentPhotoURL,
  currentCropData,
  userId,
  displayName,
  onUploadSuccess,
  onUploadError,
  onSaveComplete,
  onPendingStateChange,
  labels,
}: AvatarUploadProps) {
  const t = {
    chooseImage: labels?.chooseImage ?? "Choose image",
    changePhoto: labels?.changePhoto ?? "Change photo",
    removePhoto: labels?.removePhoto ?? "Remove photo",
    saveAvatar: labels?.saveAvatar ?? "Save avatar",
    cancelChange: labels?.cancelChange ?? "Cancel",
    uploading: labels?.uploading ?? "Uploading",
    readyToSave: labels?.readyToSave ?? "Ready to save",
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentPhotoURL || null,
  );
  const [cropData, setCropData] = useState<ImageCropData | null>(
    currentCropData || null,
  );
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCropData, setPendingCropData] = useState<ImageCropData | null>(
    null,
  );
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const {
    upload: uploadMedia,
    isPending: isUploading,
    error: uploadApiError,
  } = useMediaUpload();

  useEffect(() => {
    const hasPending = pendingCropData !== null && pendingUploadFile !== null;
    onPendingStateChange?.(hasPending);
  }, [pendingCropData, pendingUploadFile, onPendingStateChange]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageUrl(reader.result as string);
      setPendingFile(file);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (newCropData: ImageCropData) => {
    if (!pendingFile) return;
    setPendingCropData(newCropData);
    setPendingUploadFile(pendingFile);
    setTempImageUrl(null);
    setPendingFile(null);
    setShowCropModal(false);
  };

  const handleConfirmSave = async () => {
    if (!pendingUploadFile || !pendingCropData) return;

    const nameParts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || userId;
    const lastName = nameParts.slice(1).join("-") || firstName;

    try {
      const downloadURL = await uploadMedia(
        pendingUploadFile,
        "users",
        true,
        {
          type: "user-avatar",
          firstName,
          lastName,
        },
      );

      await onUploadSuccess?.(downloadURL, pendingCropData);

      setPreviewUrl(downloadURL);
      setCropData(pendingCropData);
      setPendingCropData(null);
      setPendingUploadFile(null);

      showToast("Avatar uploaded", "success");
      onSaveComplete?.();
    } catch (error) {
      void normalizeError(error);
      const message = error instanceof Error ? error.message : "Upload failed";
      onUploadError?.(message);
      showToast(message, "error");
    }
  };

  const handleCancelPending = () => {
    setPendingCropData(null);
    setPendingUploadFile(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setTempImageUrl(null);
    setPendingFile(null);
  };

  const handleRemovePhoto = async () => {
    try {
      await onUploadSuccess?.("", {
        url: "",
        position: { x: 50, y: 50 },
        zoom: 1,
      });
      setPreviewUrl(null);
      setCropData(null);
      setPendingCropData(null);
      setPendingUploadFile(null);
      onSaveComplete?.();
    } catch (error) {
      void normalizeError(error);
      const message =
        error instanceof Error ? error.message : "Failed to remove photo";
      onUploadError?.(message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasPending = pendingCropData !== null && pendingUploadFile !== null;

  return (
    <>
      <Div className="space-y-4">
        <Div className="flex items-start gap-6">
          <Div className="shrink-0">
            <AvatarDisplay
              cropData={hasPending ? pendingCropData : cropData}
              size="2xl"
              className={`border-4 ${hasPending ? "border-primary/60 ring-2 ring-primary/20" : "border-zinc-200 dark:border-slate-700"}`}
              displayName={displayName}
            />
          </Div>

          <Div className="flex-1 space-y-3">
            <Text variant="secondary" size="xs">
              JPG, PNG, WEBP or GIF up to 10MB.
            </Text>

            {isUploading ? (
              <Progress
                value={50}
                variant="primary"
                size="sm"
                label={t.uploading}
              />
            ) : null}

            {hasPending && !isUploading ? (
              <Div className="space-y-2">
                <Text variant="secondary" className="text-primary" size="xs">
                  {t.readyToSave}
                </Text>
                <Div className="flex gap-3">
                  <Button type="button" onClick={handleConfirmSave} size="sm">
                    {t.saveAvatar}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelPending}
                  >
                    {t.cancelChange}
                  </Button>
                </Div>
              </Div>
            ) : null}

            {!hasPending && !isUploading ? (
              <Div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                >
                  {previewUrl ? t.changePhoto : t.chooseImage}
                </Button>
                {previewUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRemovePhoto}
                  >
                    {t.removePhoto}
                  </Button>
                ) : null}
              </Div>
            ) : null}

            <Input
              ref={fileInputRef}
              bare
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label={t.changePhoto}
            />
          </Div>
        </Div>

        {uploadApiError ? (
          <Alert variant="error">{uploadApiError.message}</Alert>
        ) : null}
      </Div>

      {showCropModal && tempImageUrl ? (
        <ImageCropModal
          isOpen={showCropModal}
          imageUrl={tempImageUrl}
          onClose={handleCropCancel}
          onSave={handleCropSave}
          initialCropData={cropData || undefined}
        />
      ) : null}
    </>
  );
}

export default AvatarUpload;
