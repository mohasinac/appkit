"use client";

/**
 * THE CROP STEP, ONCE — and it produces METADATA, never a modified file.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11: *"keep the crop tool as universal, why did we not use the
 * built in from the shop"*. The answer, measured, is that it was never shared:
 *
 * | surface | crop refs before this |
 * |---|---|
 * | `upload/ImageUpload.tsx` (the shop's) | 8 |
 * | `AvatarUpload.tsx` | 2 |
 * | **`upload/MediaUploadField.tsx`** (the SHARED field) | **0** |
 * | **`events/EntryMediaUploadField.tsx`** | **0** |
 *
 * So an avatar could be cropped and a product photo could not. The tool was
 * built, exported, and simply unreachable from most of the platform.
 *
 * ## 🛑 NON-DESTRUCTIVE: the ORIGINAL is always what gets uploaded
 *
 * Owner, same day: *"the imagecropgate should only give the meta data, so that
 * we always upload the original but display using the meta data"* — and *"that
 * reference sits in the media collection of firebase with the meta data, while
 * the original file sits in the storage"*.
 *
 * So this hook returns **`ImageCropMeta | null`** and nothing else. It cannot
 * hand back a file, which makes the destructive version unrepresentable rather
 * than merely discouraged. The caller uploads the file it already had.
 *
 * Why that is the right shape:
 * - **A crop is a display decision, and display decisions change.** Baking it
 *   into the bytes makes re-framing impossible without re-uploading, and the
 *   original is gone.
 * - **One set of bytes, many framings.** The same photo can be a square
 *   thumbnail and a wide hero without a second upload.
 * - It matches what this codebase already does for avatars: `avatarMetadata`
 *   stores `{ url, position }` and `AvatarDisplay` applies it at render time.
 *   This is that pattern, generalised to all media.
 *
 * The metadata lands on the `mediaAssets` document (see
 * `MediaAssetDocument.crop`); the bytes stay untouched in Storage.
 *
 * ## 🛑 Images only, never video
 *
 * `ImageCropModal` draws to a canvas, so `shouldOfferCrop` gates on the MIME
 * type and a contest video goes straight through rather than opening an editor
 * that cannot render it.
 *
 * ## 🛑 Cancelling yields `null`, and the upload proceeds
 *
 * "I changed my mind about cropping" is not "discard my selection". The
 * promise never rejects, because a rejection would surface as an upload error
 * for a user who did nothing wrong.
 *
 * @tag domain:media
 * @tag layer:hook
 */

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { ImageCropData } from "../modals/ImageCropModal";

/*
 * Loaded on demand, exactly as `ImageUpload` does — the cropper is heavy and
 * most visits to a form never open it.
 */
const ImageCropModal = dynamic(
  () => import("../modals/ImageCropModal").then((m) => m.ImageCropModal),
  { ssr: false },
);

/**
 * What a crop IS: where the frame sits over the original, and how far in.
 *
 * 🛑 Deliberately WITHOUT `url`. `ImageCropData` carries one because the modal
 * is handed a preview to render; the stored metadata must not, or a crop would
 * pin itself to a blob: URL that expires the moment the page unloads — and the
 * asset it belongs to already knows its own URL.
 */
export interface ImageCropMeta {
  /** Centre of the visible frame, as a percentage of the original. */
  position: { x: number; y: number };
  /** 1 = the whole image; >1 zooms in. */
  zoom: number;
}

/** Is this file something the cropper can actually render? */
export function shouldOfferCrop(file: File): boolean {
  return typeof file.type === "string" && file.type.startsWith("image/");
}

/** Strip the preview url; keep only what is meaningful to store. */
function toMeta(data: ImageCropData): ImageCropMeta {
  return {
    position: {
      x: typeof data.position?.x === "number" ? data.position.x : 50,
      y: typeof data.position?.y === "number" ? data.position.y : 50,
    },
    zoom: typeof data.zoom === "number" && data.zoom > 0 ? data.zoom : 1,
  };
}

export interface ImageCropGate {
  /**
   * Offer the crop step for a chosen file.
   *
   * Resolves with the crop METADATA, or `null` when the user cancelled or the
   * file is not an image. 🛑 It never returns a file — the caller uploads the
   * original it already holds.
   */
  beginAsync: (file: File) => Promise<ImageCropMeta | null>;
  /** Render this inside the field; `null` until a crop is pending. */
  modal: React.ReactNode;
  /** A crop is currently open. */
  isOpen: boolean;
}

/**
 * @param enabled Opt out entirely (a field that genuinely must not crop).
 */
export function useImageCropGate(enabled = true): ImageCropGate {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    resolve: (meta: ImageCropMeta | null) => void;
  } | null>(null);

  const close = useCallback(() => {
    setPending(null);
    setPreviewUrl((url) => {
      /*
       * Release the object URL. A form that uploads twenty photos would
       * otherwise hold twenty decoded images alive for the life of the page.
       */
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  const beginAsync = useCallback<ImageCropGate["beginAsync"]>(
    (file) =>
      new Promise((resolve) => {
        if (!enabled || !shouldOfferCrop(file)) {
          resolve(null);
          return;
        }
        /*
         * `createObjectURL`, not a FileReader data URL: a 9 MB phone photo
         * becomes a ~12 MB base64 string in memory, and the modal only needs
         * something an <img> can render.
         */
        let url: string;
        try {
          url = URL.createObjectURL(file);
        } catch {
          /* Cannot preview it — upload it uncropped rather than stranding. */
          resolve(null);
          return;
        }
        setPreviewUrl(url);
        setPending({ resolve });
      }),
    [enabled],
  );

  const modal =
    pending && previewUrl ? (
      <ImageCropModal
        isOpen
        imageUrl={previewUrl}
        onClose={() => {
          /* Cancelled — upload the original, uncropped. */
          pending.resolve(null);
          close();
        }}
        onSave={(cropData: ImageCropData) => {
          pending.resolve(toMeta(cropData));
          close();
        }}
      />
    ) : null;

  return { beginAsync, modal, isOpen: Boolean(pending) };
}
