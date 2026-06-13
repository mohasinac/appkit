"use client";
import React, { useState } from "react";
import { ImageLightbox } from "../../../ui/components/ImageLightbox";
import type { LightboxImage } from "../../../ui/components/ImageLightbox";
import { Div, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

export interface ProductGalleryClientProps {
  images: string[];
  productName?: string;
}

const PlaceholderSvg = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export function ProductGalleryClient({ images, productName }: ProductGalleryClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxImages: LightboxImage[] = images.map((src, i) => ({
    src,
    alt: productName ? `${productName} — image ${i + 1}` : `Product image ${i + 1}`,
  }));

  if (images.length === 0) {
    return (
      <Div className={`${__O.hidden} rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900`}>
        <Div className="flex aspect-square items-center justify-center text-zinc-300 dark:text-zinc-700">
          <PlaceholderSvg />
        </Div>
      </Div>
    );
  }

  const mainImage = images[activeIndex] ?? images[0];

  return (
    <Div className="space-y-3">
      {/* Main image — click to open lightbox */}
      <div
        className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800 cursor-zoom-in aspect-square w-full"
        onClick={() => setLightboxIndex(activeIndex)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setLightboxIndex(activeIndex);
        }}
        aria-label={`View ${productName ?? "product"} image in full screen`}
      >
        <MediaImage
          src={mainImage}
          alt={productName ? `${productName} — image ${activeIndex + 1}` : `Product image ${activeIndex + 1}`}
          size="gallery"
          className="transition-transform duration-300 hover:scale-105"
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <Div className={`flex gap-2 ${__O.xAuto} pb-1`}>
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 h-16 w-16 overflow-hidden rounded-lg border-2 transition-all${
                i === activeIndex
                  ? " border-primary-500"
                  : " border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <MediaImage src={src} alt={`Thumbnail ${i + 1}`} size="thumbnail" />
            </button>
          ))}
        </Div>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <Text className="text-center text-xs text-zinc-400 dark:text-zinc-400">
          {activeIndex + 1} / {images.length}
        </Text>
      )}

      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(i) => setLightboxIndex(i)}
      />
    </Div>
  );
}
