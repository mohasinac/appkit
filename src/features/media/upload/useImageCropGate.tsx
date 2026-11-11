"use client";

/**
 * THE CROP STEP, ONCE — for every upload surface on the platform.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11: *"keep the crop tool as universal, why did we not use the
 * built in from the shop"*. The answer, measured, is that the crop was never
 * shared — it was wired into two components and never reached the rest:
 *
 * | surface | crop refs before this |
 * |---|---|
 * | `upload/ImageUpload.tsx` (the shop's) | 8 |
 * | `AvatarUpload.tsx` | 2 |
 * | **`upload/MediaUploadField.tsx`** (the SHARED field) | **0** |
 * | **`events/EntryMediaUploadField.tsx`** | **0** |
 * | `FilePickerButton` · `MediaUploadList` | 0 |
 *
 * So a seller adding a product photo and an entrant submitting a contest photo
 * got no crop, while an avatar did. The tool was built, exported from
 * `src/index.ts`, and simply not reached — the "declared but unwired" shape
 * this codebase keeps rediscovering, in UI form.
 *
 * This hook is `ImageUpload`'s flow lifted out verbatim in behaviour:
 * choose a file → hold it → show the cropper → upload the cropped result.
 * Any field can adopt it without re-deriving the state machine, and there is
 * one definition to fix when the cropper changes.
 *
 * ## 🛑 Images only, never video
 *
 * There is no crop path for a video — `ImageCropModal` draws to a canvas.
 * `shouldOfferCrop` gates on the MIME type, so an entry's video item uploads
 * untouched rather than opening an editor that cannot render it.
 *
 * ## 🛑 Cancelling still uploads
 *
 * `cancel()` proceeds with the ORIGINAL file rather than dropping it. A user
 * who opens the cropper and thinks better of it meant "upload it as-is", not
 * "discard what I just chose" — and silently discarding a selection reads as a
 * broken picker. Same decision `ImageUpload.handleCropClose` already makes.
 *
 * @tag domain:media
 * @tag layer:hook
 */

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { ImageCropData } from "../modals/ImageCropModal";

/*
 * Loaded on demand, exactly as `ImageUpload` does. The cropper and the
 * advanced editor are heavy (the latter pulls `react-advanced-cropper`), and
 * most visits to a form never open either.
 */
const ImageCropModal = dynamic(
  () => import("../modals/ImageCropModal").then((m) => m.ImageCropModal),
  { ssr: false },
);

/** Is this file something the cropper can actually render? */
export function shouldOfferCrop(file: File): boolean {
  return typeof file.type === "string" && file.type.startsWith("image/");
}

export interface ImageCropGate {
  /**
   * Run a chosen file through the crop step.
   *
   * Calls `onReady` with the file to upload — cropped if the user cropped,
   * the original if they cancelled or the file is not an image.
   */
  begin: (file: File, onReady: (file: File, crop?: ImageCropData) => void) => void;
  /**
   * Promise form of `begin`, for the fields whose upload path is `await`ed.
   *
   * Resolves once the user has cropped or cancelled, with the file to upload.
   * 🛑 It never rejects: cancelling resolves with the ORIGINAL file, because
   * "I changed my mind about cropping" is not "discard my selection". A
   * rejection here would surface as an upload error for a user who did nothing
   * wrong.
   */
  beginAsync: (file: File) => Promise<{ file: File; crop?: ImageCropData }>;
  /** Render this inside the field; it is `null` until a crop is pending. */
  modal: React.ReactNode;
  /** A crop is currently open — fields use this to disable their picker. */
  isOpen: boolean;
}

/**
 * @param enabled Opt out entirely (a field that genuinely must not crop).
 */
export function useImageCropGate(enabled = true): ImageCropGate {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    file: File;
    onReady: (file: File, crop?: ImageCropData) => void;
  } | null>(null);

  const begin = useCallback<ImageCropGate["begin"]>(
    (file, onReady) => {
      if (!enabled || !shouldOfferCrop(file)) {
        onReady(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          /* Unreadable file — upload it rather than stranding the user. */
          onReady(file);
          return;
        }
        setPreviewUrl(event.target.result as string);
        setPending({ file, onReady });
      };
      /*
       * A read FAILURE must not swallow the selection either — same reasoning
       * as cancelling.
       */
      reader.onerror = () => onReady(file);
      reader.readAsDataURL(file);
    },
    [enabled],
  );

  const beginAsync = useCallback<ImageCropGate["beginAsync"]>(
    (file) =>
      new Promise((resolve) => {
        begin(file, (ready, crop) =>
          resolve(crop ? { file: ready, crop } : { file: ready }),
        );
      }),
    [begin],
  );

  const close = useCallback(() => {
    setPending(null);
    setPreviewUrl(null);
  }, []);

  const modal =
    pending && previewUrl ? (
      <ImageCropModal
        isOpen
        imageUrl={previewUrl}
        onClose={() => {
          /* Cancel = upload the original. See the header. */
          pending.onReady(pending.file);
          close();
        }}
        onSave={(cropData: ImageCropData) => {
          pending.onReady(pending.file, cropData);
          close();
        }}
      />
    ) : null;

  return { begin, beginAsync, modal, isOpen: Boolean(pending) };
}
