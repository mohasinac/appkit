"use client"
/**
 * ImageEditor — WhatsApp-style crop/rotate/zoom editor.
 *
 * Uses react-advanced-cropper for real pixel cropping (not just focal-point).
 * Outputs a cropped File ready for upload.
 */

import React, { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Cropper, CropperRef } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import { Button, Div, Modal, Row, Text, useToast } from "../../../ui";

import { normalizeError } from "../../../errors/normalize";
export interface ImageEditorProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedFile: File) => void;
  aspectRatio?: number;
  outputFormat?: "image/jpeg" | "image/png" | "image/webp";
  outputQuality?: number;
  maxOutputWidth?: number;
}

export function ImageEditor({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  aspectRatio,
  outputFormat = "image/webp",
  outputQuality = 0.9,
  maxOutputWidth = 2048,
}: ImageEditorProps) {
  const t = useTranslations("mediaEditor");
  const { showToast } = useToast();
  const cropperRef = useRef<CropperRef>(null);
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleRotate = useCallback((degrees: number) => {
    setRotation((r) => (r + degrees) % 360);
    cropperRef.current?.rotateImage(degrees);
  }, []);

  const handleFlipH = useCallback(() => {
    cropperRef.current?.flipImage(true, false);
  }, []);

  const handleFlipV = useCallback(() => {
    cropperRef.current?.flipImage(false, true);
  }, []);

  const handleReset = useCallback(() => {
    setRotation(0);
    cropperRef.current?.reset();
  }, []);

  const applyAspectRatio = useCallback((ratio: number | undefined) => {
    if (!ratio) {
      cropperRef.current?.reset();
      return;
    }
    const coords = cropperRef.current?.getCoordinates();
    if (!coords) return;
    cropperRef.current?.setCoordinates({ ...coords, height: coords.width / ratio });
  }, []);

  const handleSave = useCallback(async () => {
    const cropper = cropperRef.current;
    if (!cropper) return;

    setSaving(true);
    try {
      const canvas = cropper.getCanvas({
        maxWidth: maxOutputWidth,
        maxHeight: maxOutputWidth,
      });
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputFormat, outputQuality),
      );
      if (!blob) return;

      const ext = outputFormat.split("/")[1] || "webp";
      const file = new File([blob], `cropped.${ext}`, { type: outputFormat });
      onSave(file);
    } catch (err) {
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to save image.", "error");
    } finally {
      setSaving(false);
    }
  }, [maxOutputWidth, outputFormat, outputQuality, onSave, showToast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("cropTitle")} size="lg">
      <Div className="space-y-3">
        <Text variant="secondary" size="xs">
          {t("cropInstruction")}
        </Text>

        {/* Cropper */}
        <Div className="relative w-full max-h-[400px] overflow-hidden" surface="subtle" rounded="lg">
          <Cropper
            ref={cropperRef}
            src={imageUrl}
            stencilProps={aspectRatio ? { aspectRatio } : undefined}
            className="max-h-[400px]"
          />
        </Div>

        {/* Toolbar */}
        <Row gap="sm" justify="center" wrap>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRotate(-90)}
            aria-label={t("cropRotateLeft")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 014 4v0a4 4 0 01-4 4H3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6l-4 4 4 4" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRotate(90)}
            aria-label={t("cropRotateRight")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a4 4 0 00-4 4v0a4 4 0 004 4h10" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 6l4 4-4 4" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFlipH}
            aria-label={t("cropFlipH")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4l-4 4m0 4l4 4M17 16V4l4 4m0 4l-4 4M12 2v20" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFlipV}
            aria-label={t("cropFlipV")}
          >
            <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4l-4 4m0 4l4 4M17 16V4l4 4m0 4l-4 4M12 2v20" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            {t("cropReset")}
          </Button>
          <Text size="xs" variant="secondary" className="ml-auto">
            {rotation}°
          </Text>
        </Row>

        {/* Aspect ratio presets */}
        {!aspectRatio && (
          <Row gap="sm" justify="center" wrap>
            {[
              { label: "Free", ratio: undefined },
              { label: "1:1", ratio: 1 },
              { label: "4:3", ratio: 4 / 3 },
              { label: "16:9", ratio: 16 / 9 },
              { label: "3:2", ratio: 3 / 2 },
            ].map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyAspectRatio(preset.ratio)}
                className="px-3 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-slate-800"
              >
                {preset.label}
              </Button>
            ))}
          </Row>
        )}

        {/* Actions */}
        <Div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            variant="primary"
            className="flex-1"
            disabled={saving}
          >
            {saving ? t("cropSaving") : t("cropSave")}
          </Button>
          <Button onClick={onClose} variant="secondary" className="flex-1">
            {t("cropCancel")}
          </Button>
        </Div>
      </Div>
    </Modal>
  );
}
