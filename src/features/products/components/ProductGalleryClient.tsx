"use client";
import React, { useState } from "react";
import { Play } from "lucide-react";
import { ImageLightbox } from "../../../ui/components/ImageLightbox";
import type { LightboxImage } from "../../../ui/components/ImageLightbox";
import { Button, Div, Row, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

/** Product video field shape — mirrors `ProductVideoField` from the products schema. */
export interface ProductGalleryVideo {
  /** Raw, unwrapped playable video URL — never routed through the (image-only) media proxy. */
  url: string;
  /** Poster frame — a normal image, already resolved/proxied by the caller (e.g. via seedExtMedia). */
  thumbnailUrl?: string;
}

export interface ProductGalleryClientProps {
  images: string[];
  /** Optional product video — rendered as a trailing slide/thumbnail; opens in theater mode (lightbox) on click. */
  video?: ProductGalleryVideo;
  productName?: string;
}

type GallerySlide =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string; poster?: string };

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

export function ProductGalleryClient({ images, video, productName }: ProductGalleryClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const slides: GallerySlide[] = [
    ...images.map((src): GallerySlide => ({ kind: "image", src })),
    ...(video ? [{ kind: "video", src: video.url, poster: video.thumbnailUrl } as GallerySlide] : []),
  ];

  const lightboxImages: LightboxImage[] = slides.map((slide, i) => ({
    src: slide.src,
    alt: productName
      ? `${productName} — ${slide.kind === "video" ? "video" : `image ${i + 1}`}`
      : slide.kind === "video"
        ? "Product video"
        : `Product image ${i + 1}`,
    kind: slide.kind,
    poster: slide.kind === "video" ? slide.poster : undefined,
  }));

  if (slides.length === 0) {
    return (
      <Div className={`${__O.hidden}`} border="subtle" rounded="xl" surface="muted">
        <Row className="aspect-square text-[var(--appkit-color-border)] dark:text-[var(--appkit-color-border-subtle)]" align="center" justify="center">
          <PlaceholderSvg />
        </Row>
      </Div>
    );
  }

  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <Stack gap="3">
      {/* Main slide — click to open theater-mode lightbox */}
      <Div
        rounded="xl"
        className="overflow-hidden border border-[var(--appkit-color-border-subtle)] cursor-zoom-in aspect-square w-full relative"
        onClick={() => setLightboxIndex(activeIndex)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setLightboxIndex(activeIndex);
        }}
        aria-label={
          activeSlide.kind === "video"
            ? `Play ${productName ?? "product"} video`
            : `View ${productName ?? "product"} image in full screen`
        }
      >
        <MediaImage
          src={activeSlide.kind === "video" ? activeSlide.poster : activeSlide.src}
          alt={
            activeSlide.kind === "video"
              ? productName
                ? `${productName} — video`
                : "Product video"
              : productName
                ? `${productName} — image ${activeIndex + 1}`
                : `Product image ${activeIndex + 1}`
          }
          size="gallery"
          className="transition-transform duration-300 hover:scale-105"
        />
        {activeSlide.kind === "video" && (
          <Row
            className="absolute inset-0 pointer-events-none"
            align="center"
            justify="center"
          >
            <Row
              className="h-16 w-16 rounded-full bg-black/50 text-white"
              align="center"
              justify="center"
            >
              <Play className="h-7 w-7 fill-current" aria-hidden="true" />
            </Row>
          </Row>
        )}
      </Div>

      {/* Thumbnail strip */}
      {slides.length > 1 && (
        <Div layout="flex" gap="2" className={`${__O.xAuto}`} padding="b-2xs">
          {slides.map((slide, i) => (
            <Button
              variant="ghost"
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              rounded="lg"
              paddingX="none"
              paddingY="none"
              className={`relative flex-shrink-0 h-16 w-16 overflow-hidden border-2 transition-all${
 i === activeIndex
 ? " border-primary-500"
 : " border-transparent opacity-60 hover:opacity-100"
 }`}
              aria-label={slide.kind === "video" ? "View video" : `View image ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <MediaImage
                src={slide.kind === "video" ? slide.poster : slide.src}
                alt={slide.kind === "video" ? "Video thumbnail" : `Thumbnail ${i + 1}`}
                size="thumbnail"
              />
              {slide.kind === "video" && (
                <Row
                  className="absolute inset-0 pointer-events-none bg-black/25"
                  align="center"
                  justify="center"
                >
                  <Play className="h-5 w-5 text-white fill-current" aria-hidden="true" />
                </Row>
              )}
            </Button>
          ))}
        </Div>
      )}

      {/* Slide counter */}
      {slides.length > 1 && (
        // audit-content-alignment-ok: functional image-counter label under the gallery, not page content
        <Text size="xs" align="center" color="faint">
          {activeIndex + 1} / {slides.length}
        </Text>
      )}

      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(i) => setLightboxIndex(i)}
      />
    </Stack>
  );
}
