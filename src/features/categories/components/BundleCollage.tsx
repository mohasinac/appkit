"use client";

/**
 * BundleCollage — collage grid of bundle member products with lightbox support.
 *
 * Mirrors PrizeDrawCollage's visual style. Clicking any cell opens a
 * full-screen lightbox starting at that product and cycling circularly.
 * Each cell also keeps a "Visit product" link accessible as the keyboard
 * action so the lightbox does not break product discovery.
 */

import React, { useState } from "react";
import Link from "next/link";
import { Div, Row, Text } from "../../../ui";
import { ImageLightbox } from "../../../ui/components/ImageLightbox";
import type { LightboxImage } from "../../../ui/components/ImageLightbox";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils/number.formatter";
import type { ProductDocument } from "../../products/schemas/firestore";

export interface BundleCollageProps {
  members: ProductDocument[];
  /** Optional click handler — overrides the built-in lightbox (e.g. open a product drawer). */
  onItemClick?: (product: ProductDocument) => void;
}

const PLACEHOLDER_EMOJI = "📦" as const;

function toGalleryImages(members: ProductDocument[]): LightboxImage[] {
  return members.map((p, i) => ({
    src: p.mainImage ?? p.images?.[0] ?? "",
    alt: p.title,
    badge: `#${i + 1}`,
    caption: p.title,
    sub: formatCurrency((p.price ?? 0) / 100, p.currency ?? "INR"),
  }));
}

function makeBundleItemClickHandler(
  p: ProductDocument,
  idx: number,
  onItemClick: ((product: ProductDocument) => void) | undefined,
  setLightboxIndex: (i: number) => void,
): () => void {
  return () => {
    if (onItemClick) {
      onItemClick(p);
    } else {
      setLightboxIndex(idx);
    }
  };
}

export function BundleCollage({ members, onItemClick }: BundleCollageProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!members.length) return null;

  const galleryImages = toGalleryImages(members);

  return (
    <>
      <Div layout="grid" gap="3" className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {members.map((p, idx) => {
          const cover = p.mainImage ?? p.images?.[0];
          const href = String(
            ROUTES.PUBLIC.PRODUCT_DETAIL?.(p.slug ?? p.id) ?? "#",
          );
          return (
            <Div
              key={p.id}
              className="group relative overflow-hidden border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] transition-transform hover:scale-[1.01]" rounded="lg"
            >
              {/* Clickable image area → lightbox */}
              <button
                type="button"
                onClick={makeBundleItemClickHandler(p, idx, onItemClick, setLightboxIndex)}
                className="relative block aspect-square w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--appkit-color-primary)]"
                aria-label={`View ${p.title} in lightbox`}
              >
                {cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cover}
                    alt={p.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Row className="absolute inset-0 bg-[var(--appkit-color-surface-muted)] text-3xl" align="center" justify="center">
                    {PLACEHOLDER_EMOJI}
                  </Row>
                )}

                <Div textWeight="semibold" textSize="xs" surface="overlay-xl" className="absolute left-2 top-2 px-1.5 py-0.5 text-white" rounded="default">
                  #{idx + 1}
                </Div>
              </button>

              {/* Text area with PDP link */}
              <Div padding="xs">
                <Link
                  href={href}
                  className="line-clamp-2 text-sm font-medium hover:underline"
                >
                  {p.title}
                </Link>
                <Text className="mt-0.5 text-[var(--appkit-color-text-muted)]" size="xs">
                  {formatCurrency((p.price ?? 0) / 100, p.currency ?? "INR")}
                </Text>
              </Div>
            </Div>
          );
        })}
      </Div>

      <ImageLightbox
        images={galleryImages}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(i) => setLightboxIndex(i)}
        showThumbnails
      />
    </>
  );
}

export default BundleCollage;
