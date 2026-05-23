"use client";
import React, { type ReactNode } from "react";
import { SettingsSection } from "../../../ui/components/SettingsSection";

export interface ImageFieldGroupProps {
  /** Slot for the hero / cover image input — wire your own ImageUpload here. */
  heroSlot?: ReactNode;
  /** Slot for an additional gallery input (e.g. MediaUploadField with multi-image). */
  gallerySlot?: ReactNode;
  /** Optional section label override. */
  sectionTitle?: ReactNode;
  sectionDescription?: ReactNode;
}

/**
 * `ImageFieldGroup` — wraps hero + gallery image slots in a `SettingsSection`.
 * The actual `<ImageUpload>` / `<MediaUploadField>` instances stay with the
 * consumer because their `onUpload` / context wiring is form-specific.
 *
 * W1-15 — extracted 2026-05-23.
 */
export function ImageFieldGroup({
  heroSlot,
  gallerySlot,
  sectionTitle = "Images",
  sectionDescription,
}: ImageFieldGroupProps) {
  if (!heroSlot && !gallerySlot) return null;
  return (
    <SettingsSection title={sectionTitle} description={sectionDescription}>
      {heroSlot}
      {gallerySlot}
    </SettingsSection>
  );
}
