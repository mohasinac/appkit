"use client";

import React, { useState, useRef, useEffect } from "react";
import { Text } from "./Typography";
import { Button } from "./Button";
import { HorizontalScroller } from "./HorizontalScroller";
import { useSwipe, useGesture } from "../../react";
import { MediaImage } from "../../features/media/MediaImage";
import { THEME_CONSTANTS } from "../../tokens";

const { themed, flex } = THEME_CONSTANTS;

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
  thumbnail?: string;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  initialIndex?: number;
  showThumbnails?: boolean;
  showCaptions?: boolean;
  allowZoom?: boolean;
  className?: string;
  onImageChange?: (index: number) => void;
}

export default function ImageGallery({
  images,
  initialIndex = 0,
  showThumbnails = true,
  showCaptions = true,
  allowZoom = true,
  className = "",
  onImageChange,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];

  const resetZoom = () => {
    setScale(1);
    setIsZoomed(false);
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
      resetZoom();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
      resetZoom();
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
      onImageChange?.(index);
      resetZoom();
    }
  };

  // Swipe gesture for navigation
  useSwipe(imageContainerRef, {
    onSwipeLeft: () => {
      if (!isZoomed) goToNext();
    },
    onSwipeRight: () => {
      if (!isZoomed) goToPrevious();
    },
    minSwipeDistance: 50,
  });

  // Pinch and zoom gestures
  useGesture(imageContainerRef, {
    onDoubleTap: () => {
      if (allowZoom) {
        if (isZoomed) {
          resetZoom();
        } else {
          setScale(2);
          setIsZoomed(true);
        }
      }
    },
    onPinch: (newScale) => {
      if (allowZoom) {
        const finalScale = Math.max(1, Math.min(newScale, 3));
        setScale(finalScale);
        setIsZoomed(finalScale > 1);
      }
    },
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") resetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isZoomed]);

  if (images.length === 0) {
    return (
      <div
        className={`${flex.center} p-8 ${themed.bgTertiary} rounded-lg ${className}`}
      >
        <Text className={themed.textMuted}>No images to display</Text>
      </div>
    );
  }

  return (
    <div className={`image-gallery ${className}`}>
      {/* Main Image Container */}
      <div
        ref={imageContainerRef}
        className={`relative ${themed.bgSecondary} rounded-lg overflow-hidden touch-pan-y select-none`}
      >
        {/* Image */}
        <div className="relative aspect-video md:aspect-[16/10] overflow-hidden">
          <div
            role="img"
            aria-label={currentImage.alt}
            className="w-full h-full bg-center bg-contain bg-no-repeat transition-transform duration-200"
            style={{
              backgroundImage: `url(${currentImage.src})`,
              transform: `scale(${scale})`,
              cursor: allowZoom
                ? isZoomed
                  ? "zoom-out"
                  : "zoom-in"
                : "default",
            }}
          />

          {/* Navigation Arrows */}
          {images.length > 1 && !isZoomed && (
            <>
              <Button
                variant="ghost"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className={`
                  absolute left-2 md:left-4 top-1/2 -translate-y-1/2
                  p-2 md:p-3 rounded-full
                  ${themed.bgSecondary} bg-opacity-80 backdrop-blur-sm
                  ${themed.textPrimary}
                  transition-all hover:bg-opacity-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  touch-manipulation
                `}
                aria-label="Previous image"
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Button>

              <Button
                variant="ghost"
                onClick={goToNext}
                disabled={currentIndex === images.length - 1}
                className={`
                  absolute right-2 md:right-4 top-1/2 -translate-y-1/2
                  p-2 md:p-3 rounded-full
                  ${themed.bgSecondary} bg-opacity-80 backdrop-blur-sm
                  ${themed.textPrimary}
                  transition-all hover:bg-opacity-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  touch-manipulation
                `}
                aria-label="Next image"
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div
              className={`
              absolute bottom-2 md:bottom-4 right-2 md:right-4
              px-3 py-1.5 rounded-full
              ${themed.bgSecondary} bg-opacity-80 backdrop-blur-sm
              ${themed.textPrimary} text-xs md:text-sm font-medium
            `}
            >
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Zoom Indicator */}
          {allowZoom && isZoomed && (
            <div
              className={`
              absolute top-2 md:top-4 right-2 md:right-4
              px-3 py-1.5 rounded-full
              ${themed.bgSecondary} bg-opacity-80 backdrop-blur-sm
              ${themed.textPrimary} text-xs md:text-sm font-medium
            `}
            >
              {Math.round(scale * 100)}%
            </div>
          )}
        </div>

        {/* Caption */}
        {showCaptions && currentImage.caption && (
          <div className={`p-4 ${themed.border} border-t`}>
            <Text className={`${themed.textSecondary} text-sm md:text-base`}>
              {currentImage.caption}
            </Text>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <HorizontalScroller snapToItems className="mt-4 pb-2">
          {images.map((image, index) => (
            <Button
              key={index}
              variant="ghost"
              onClick={() => goToIndex(index)}
              className={`
                flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden
                border-2 transition-all snap-center touch-manipulation
                ${
                  index === currentIndex
                    ? "border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800"
                    : `${themed.border} hover:border-primary-300 dark:hover:border-primary-700`
                }
              `}
              aria-label={`View image ${index + 1}`}
            >
              <MediaImage
                src={image.thumbnail || image.src}
                alt={image.alt}
                size="thumbnail"
                className="w-full h-full object-cover"
              />
            </Button>
          ))}
        </HorizontalScroller>
      )}

      {/* Mobile Help Text */}
      <div className={`mt-2 text-center ${themed.textMuted} text-xs md:hidden`}>
        {allowZoom
          ? "Swipe to navigate • Double tap to zoom"
          : "Swipe to navigate"}
      </div>
    </div>
  );
}
