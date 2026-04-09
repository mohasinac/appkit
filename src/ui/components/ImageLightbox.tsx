"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Button } from "./Button";
import { Text, Span } from "./Typography";

/**
 * ImageLightbox — full-screen image overlay with keyboard navigation.
 *
 * Standalone @mohasinac/ui primitive. No app-specific imports.
 * Navigation: ← / → arrow keys, Esc to close. Displays item counter.
 *
 * Uses a standard <img> tag for framework portability.
 * In a Next.js app, callers may swap src with a blurDataURL if desired.
 */

export interface LightboxImage {
  src: string;
  alt?: string;
  caption?: string;
}

export interface ImageLightboxProps {
  images: LightboxImage[];
  /** The index to open. Pass `null` or `-1` to close. */
  activeIndex: number | null;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex ?? 0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync external activeIndex
  useEffect(() => {
    if (activeIndex !== null && activeIndex >= 0) {
      setCurrentIndex(activeIndex);
    }
  }, [activeIndex]);

  const isOpen = activeIndex !== null && activeIndex >= 0 && images.length > 0;

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setCurrentIndex((prev) => {
        const next = (prev + dir + images.length) % images.length;
        onNavigate?.(next);
        return next;
      });
    },
    [images.length, onNavigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        navigate(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        navigate(1);
        return;
      }
    },
    [onClose, navigate],
  );

  // Focus overlay on open for keyboard to work
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => overlayRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const image = images[currentIndex];
  const hasMultiple = images.length > 1;

  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      onKeyDown={handleKeyDown}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-red-500/50 text-white flex items-center justify-center"
        aria-label="Close lightbox"
      >
        <X className="w-7 h-7" />
      </Button>

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev button */}
      {hasMultiple && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-white/30 text-white z-10 flex items-center justify-center"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-7 h-7" />
        </Button>
      )}

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-16 w-full h-full relative">
        <img
          src={image.src}
          alt={image.alt ?? ""}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
        {/* Zoom icon hint */}
        <div className="absolute bottom-4 right-4 text-white/40 flex items-center gap-1 text-xs">
          <ZoomIn className="w-4 h-4" />
          <Span className="text-xs">Scroll to zoom</Span>
        </div>
      </div>

      {/* Caption */}
      {image.caption && (
        <Text
          size="sm"
          variant="secondary"
          className="flex-shrink-0 !text-white/70 text-center px-8 pb-4"
        >
          {image.caption}
        </Text>
      )}

      {/* Next button */}
      {hasMultiple && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-white/30 text-white z-10 flex items-center justify-center"
          aria-label="Next image"
        >
          <ChevronRight className="w-7 h-7" />
        </Button>
      )}
    </div>,
    document.body,
  );
}
