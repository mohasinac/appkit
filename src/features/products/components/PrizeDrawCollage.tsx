"use client";

/**
 * PrizeDrawCollage (SB4-B)
 *
 * Read-only display of a prize-draw's full prize pool. Each cell shows the
 * primary image, item-number badge, and title. Items with sieveFilter("isWon", SIEVE_OP.EQ, "= true")
 * are dimmed under a diagonal overlay with a "Won" label so the public
 * collage truthfully reflects what's still up for grabs.
 *
 * Clicking any cell opens a full-screen lightbox starting at that item and
 * cycling circularly through all items in itemNumber order.
 *
 * Optional `highlightItemNumber` (passed by the reveal modal during animation)
 * adds an emphasis ring to the cell that just won.
 */

import { Row, SIEVE_OP, sieveFilter } from "@mohasinac/appkit";
import React, { useState } from "react";
import { Div, Scrim, Text } from "../../../ui";
import { ImageLightbox } from "../../../ui/components/ImageLightbox";
import type { LightboxImage } from "../../../ui/components/ImageLightbox";
import type { PrizeDrawItem } from "../schemas/firestore";

const __P = {
  p6: "p-6",
} as const;

const CLS_WON_STAMP = "rotate-[-12deg] rounded bg-error-surface px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow";

export interface PrizeDrawCollageProps {
  items: PrizeDrawItem[];
  highlightItemNumber?: number;
  /** Custom click handler — overrides the built-in lightbox. */
  onItemClick?: (item: PrizeDrawItem) => void;
  /** Defaults to "Won". Use for localisation. */
  wonLabel?: string;
  /**
   * Public buyer surfaces pass `true` so the diagonal "Won" overlay never
   * renders — otherwise potential buyers would see their favorite prize is
   * already gone and drop out. The seller / admin / winner views leave this
   * `false` (default) to show real pool state.
   */
  hideWonState?: boolean;
}

function makePrizeItemClickHandler(
  it: PrizeDrawItem,
  idx: number,
  onItemClick: ((item: PrizeDrawItem) => void) | undefined,
  setLightboxIndex: (i: number) => void,
): () => void {
  return () => {
    if (onItemClick) {
      onItemClick(it);
    } else {
      setLightboxIndex(idx);
    }
  };
}

/** Build the lightbox images array from sorted prize items. */
function toGalleryImages(items: PrizeDrawItem[]): LightboxImage[] {
  return items.map((it) => ({
    src: it.images?.[0] ?? "",
    alt: it.title || `Prize #${it.itemNumber}`,
    badge: `#${it.itemNumber}`,
    caption: it.title || `Prize #${it.itemNumber}`,
    sub:
      it.estimatedValue != null
        ? `est. ₹${(it.estimatedValue / 100).toLocaleString("en-IN")}`
        : undefined,
  }));
}

export function PrizeDrawCollage({
  items,
  highlightItemNumber,
  onItemClick,
  wonLabel = "Won",
  hideWonState = false,
}: PrizeDrawCollageProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!items.length) {
    return (
      <Div className={`border border-dashed border-[var(--appkit-color-border)] ${__P.p6} text-center`} rounded="default">
        <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
          No prizes configured yet.
        </Text>
      </Div>
    );
  }

  const galleryImages = toGalleryImages(items);

  return (
    <>
      <Div layout="grid" gap="3" className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((it, idx) => {
          const cover = it.images?.[0];
          const isHighlight = highlightItemNumber === it.itemNumber;
          return (
            <button
              key={`collage-${it.itemNumber}`}
              type="button"
              onClick={makePrizeItemClickHandler(it, idx, onItemClick, setLightboxIndex)}
              className={[
                "group relative overflow-hidden rounded-lg border bg-[var(--appkit-color-surface)] text-left transition-transform",
                "border-[var(--appkit-color-border)]",
                isHighlight
                  ? "ring-2 ring-offset-2 ring-[var(--appkit-color-primary)] scale-[1.02]"
                  : "hover:scale-[1.01]",
              ].join(" ")}
              aria-label={`View ${it.title || `prize #${it.itemNumber}`} in lightbox`}
            >
              <Div className="relative aspect-square w-full">
                {cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cover}
                    alt={it.title || `Prize #${it.itemNumber}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Row className="absolute inset-0 bg-[var(--appkit-color-surface-muted)]" align="center" justify="center">
                    <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
                      No image
                    </Text>
                  </Row>
                )}

                <Div textWeight="semibold" textSize="xs" surface="overlay-xl" className="absolute left-2 top-2 px-1.5 py-0.5 text-white" rounded="default">
                  #{it.itemNumber}
                </Div>

                {it.isWon && !hideWonState ? (
                  <>
                    <Scrim
                      direction="diagonal"
                      intensity="medium"
                      multiply
                      className="absolute inset-0"
                    />
                    <Row className="absolute inset-0" align="center" justify="center">
                      <Text className={CLS_WON_STAMP}>
                        {wonLabel}
                      </Text>
                    </Row>
                  </>
                ) : null}
              </Div>

              <Div padding="xs">
                <Text className="line-clamp-2" size="sm" weight="medium">
                  {it.title || `Prize #${it.itemNumber}`}
                </Text>
                {it.estimatedValue != null ? (
                  <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
                    est. ₹{(it.estimatedValue / 100).toLocaleString("en-IN")}
                  </Text>
                ) : null}
              </Div>
            </button>
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

export default PrizeDrawCollage;
