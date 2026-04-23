"use client"
import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Progress, Text, useToast } from "../../ui";
import { useMediaUpload } from "./hooks/useMedia";
import { ImageCropModal, type ImageCropData } from "./modals/ImageCropModal";
import { AvatarDisplay } from "../../ui/components/AvatarDisplay";

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
    mutateAsync: uploadMedia,
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

    const formData = new FormData();
    formData.append("file", pendingUploadFile);

    const nameParts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || userId;
    const lastName = nameParts.slice(1).join("-") || firstName;

    formData.append(
      "context",
      JSON.stringify({
        type: "user-avatar",
        firstName,
        lastName,
      }),
    );
    formData.append("folder", "users");
    formData.append("public", "true");
    formData.append(
      "metadata",
      JSON.stringify({
        cropX: 0,
        cropY: 0,
        cropWidth: 400,
        cropHeight: 400,
        zoom: pendingCropData.zoom ?? 1,
        focalX: (pendingCropData.position?.x ?? 50) / 100,
        focalY: (pendingCropData.position?.y ?? 50) / 100,
        aspectRatio: "1:1",
        objectFit: "cover",
        displayMode: "avatar",
        originalWidth: 400,
        originalHeight: 400,
        mimeType: pendingUploadFile.type,
        fileSize: pendingUploadFile.size,
      }),
    );

    try {
      const result = await uploadMedia(formData);
      const downloadURL = result.url;

      await onUploadSuccess?.(downloadURL, pendingCropData);

      setPreviewUrl(downloadURL);
      setCropData(pendingCropData);
      setPendingCropData(null);
      setPendingUploadFile(null);

      showToast("Avatar uploaded", "success");
      onSaveComplete?.();
    } catch (error) {
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
      const message =
        error instanceof Error ? error.message : "Failed to remove photo";
      onUploadError?.(message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasPending = pendingCropData !== null && pendingUploadFile !== null;

  return (
    <>
      <div className="space-y-4" data-section="avatarupload-div-404">
        <div className="flex items-start gap-6" data-section="avatarupload-div-405">
          <div className="shrink-0" data-section="avatarupload-div-406">
            <AvatarDisplay
              cropData={hasPending ? pendingCropData : cropData}
              size="2xl"
              className={`border-4 ${hasPending ? "border-primary/60 ring-2 ring-primary/20" : "border-zinc-200 dark:border-slate-700"}`}
              displayName={displayName}
            />
          </div>

          <div className="flex-1 space-y-3" data-section="avatarupload-div-407">
            <Text variant="secondary" className="text-xs">
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
              <div className="space-y-2" data-section="avatarupload-div-408">
                <Text variant="secondary" className="text-xs text-primary">
                  {t.readyToSave}
                </Text>
                <div className="flex gap-3" data-section="avatarupload-div-409">
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
                </div>
              </div>
            ) : null}

            {!hasPending && !isUploading ? (
              <div className="flex gap-3" data-section="avatarupload-div-410">
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
              </div>
            ) : null}

            <Input
              ref={fileInputRef}
              bare
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
              aria-label={t.changePhoto}
            />
          </div>
        </div>

        {uploadApiError ? (
          <Alert variant="error">{uploadApiError.message}</Alert>
        ) : null}
      </div>

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
