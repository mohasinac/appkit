"use client";

/**
 * ImageCropModal — focal-point editor for @mohasinac/feat-media.
 *
 * Drag-to-pan, zoom slider, keyboard arrows. Returns CSS position/zoom percentages
 * (display-only focal-point). No pixel cropping — use useMediaCrop for that.
 */

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Modal, Span, Text } from "@mohasinac/ui";
import { MediaSlider } from "../components/MediaSlider";

export interface ImageCropData {
  url: string;
  position: { x: number; y: number };
  zoom: number;
}

export interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (cropData: ImageCropData) => void;
  initialCropData?: Partial<ImageCropData>;
}

export function ImageCropModal({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  initialCropData,
}: ImageCropModalProps) {
  const t = useTranslations("mediaEditor");

  const [zoom, setZoom] = useState(initialCropData?.zoom ?? 1);
  const [position, setPosition] = useState(
    initialCropData?.position ?? { x: 50, y: 50 },
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowZoomWarning(zoom < 0.5);
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(0, Math.min(100, ((e.clientX - dragStart.x) / container.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - dragStart.y) / container.height) * 100)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    const container = containerRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(0, Math.min(100, ((touch.clientX - dragStart.x) / container.width) * 100)),
      y: Math.max(0, Math.min(100, ((touch.clientY - dragStart.y) / container.height) * 100)),
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setPosition((p) => ({ ...p, x: Math.max(0, p.x - step) }));
        break;
      case "ArrowRight":
        e.preventDefault();
        setPosition((p) => ({ ...p, x: Math.min(100, p.x + step) }));
        break;
      case "ArrowUp":
        e.preventDefault();
        setPosition((p) => ({ ...p, y: Math.max(0, p.y - step) }));
        break;
      case "ArrowDown":
        e.preventDefault();
        setPosition((p) => ({ ...p, y: Math.min(100, p.y + step) }));
        break;
      case "+":
      case "=":
        e.preventDefault();
        setZoom((z) => Math.min(3, z + 0.1));
        break;
      case "-":
        e.preventDefault();
        setZoom((z) => Math.max(0.1, z - 0.1));
        break;
    }
  };

  const handleSave = () => {
    onSave({ url: imageUrl, position, zoom });
    onClose();
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 50, y: 50 });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("cropTitle")} size="lg">
      <div className="space-y-3">
        <Text variant="secondary" className="text-xs">
          {t("cropInstruction")}
        </Text>

        {/* Preview container */}
        <div
          ref={containerRef}
          className="relative w-full max-w-sm mx-auto aspect-square bg-zinc-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-move max-h-[280px] touch-none"
          data-disable-swipe="true"
          tabIndex={0}
          role="application"
          aria-label={t("cropInstruction")}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt={t("cropPreviewAlt")}
            draggable={false}
            className="absolute select-none pointer-events-none object-cover"
            style={{
              width: `${zoom * 100}%`,
              height: `${zoom * 100}%`,
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
          {/* 3×3 grid overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-full h-full grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/20 dark:border-slate-600/30" />
              ))}
            </div>
            {/* Centre crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-px bg-white/50" />
              <div className="absolute h-6 w-px bg-white/50" />
            </div>
          </div>
        </div>

        {/* Zoom control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Text className="text-xs font-medium">{t("cropZoom")}</Text>
            <Text className="text-xs text-zinc-500 dark:text-slate-400">
              {Math.round(zoom * 100)}%
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              aria-label={t("cropZoomOut")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </Button>
            <MediaSlider
              value={zoom}
              min={0.1}
              max={3}
              step={0.01}
              onChange={(v) => setZoom(v)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              aria-label={t("cropZoomIn")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </Button>
          </div>
          {/* Zoom presets */}
          <div className="flex gap-2">
            {[0.5, 1, 1.5, 2].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZoom(preset)}
                className="px-3 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-slate-800"
              >
                {preset * 100}%
              </Button>
            ))}
          </div>
        </div>

        {/* Zoom warning */}
        {showZoomWarning && (
          <Alert variant="warning">
            <strong>{t("cropWarningTitle")}</strong> {t("cropWarningMessage")}
          </Alert>
        )}

        {/* Position info + reset */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-slate-400">
          <Span>
            {t("cropPosition")}: {Math.round(position.x)}%, {Math.round(position.y)}%
          </Span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t("cropReset")}
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} variant="primary" className="flex-1">
            {t("cropSave")}
          </Button>
          <Button onClick={onClose} variant="secondary" className="flex-1">
            {t("cropCancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
