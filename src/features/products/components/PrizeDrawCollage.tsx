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

import { Row } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { Button, Div, Grid, Scrim, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ImageLightbox } from "../../../ui/components/ImageLightbox";
import type { LightboxImage } from "../../../ui/components/ImageLightbox";
import type { PrizeDrawItem } from "../schemas/firestore";

const __P = {
  p6: "p-[var(--appkit-space-6)]",
} as const;

const CLS_WON_STAMP = "rotate-[-12deg] rounded bg-error-solid px-[var(--appkit-space-3)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] font-bold uppercase tracking-wider text-error-on-solid shadow";

/**
 * The subset of a prize this collage actually renders.
 *
 * Declared structurally, and deliberately narrower than `PrizeDrawItem`, so a
 * lottery slot can be mapped onto it without inventing the fields it does not
 * have (`condition` is required on `PrizeDrawItem`; a lottery slot has no such
 * concept, and faking one would be a shape lie). `PrizeDrawItem` already
 * satisfies this interface, so every existing caller is unaffected.
 */
export interface CollagePrizeItem {
  itemNumber: number;
  title: string;
  images?: string[];
  estimatedValue?: number;
  isWon?: boolean;
}

export interface PrizeDrawCollageProps<T extends CollagePrizeItem = PrizeDrawItem> {
  items: T[];
  highlightItemNumber?: number;
  /** Custom click handler — overrides the built-in lightbox. */
  onItemClick?: (item: T) => void;
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

function makePrizeItemClickHandler<T extends CollagePrizeItem>(
  it: T,
  idx: number,
  onItemClick: ((item: T) => void) | undefined,
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
function toGalleryImages(items: CollagePrizeItem[]): LightboxImage[] {
  return items.map((it) => ({
    src: it.images?.[0] ?? "",
    alt: it.title || `Prize #${it.itemNumber}`,
    badge: `#${it.itemNumber}`,
    caption: it.title || `Prize #${it.itemNumber}`,
    sub:
      it.estimatedValue != null
        ? `est. ₹${it.estimatedValue.toLocaleString("en-IN")}`
        : undefined,
  }));
}

export function PrizeDrawCollage<T extends CollagePrizeItem = PrizeDrawItem>({
  items,
  highlightItemNumber,
  onItemClick,
  wonLabel = "Won",
  hideWonState = false,
}: PrizeDrawCollageProps<T>) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!items.length) {
    return (
      <Div className={`border border-dashed border-[var(--appkit-color-border)] ${__P.p6} text-left`} rounded="default">
        <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
          No prizes configured yet.
        </Text>
      </Div>
    );
  }

  const galleryImages = toGalleryImages(items);

  return (
    <>
      <Grid cols="categoryCards" gap="3">
        {items.map((it, idx) => {
          const cover = it.images?.[0];
          const isHighlight = highlightItemNumber === it.itemNumber;
          return (
            <Button
              variant="ghost"
              key={`collage-${it.itemNumber}`}
              type="button"
              onClick={makePrizeItemClickHandler(it, idx, onItemClick, setLightboxIndex)}
              rounded="lg"
              paddingX="none"
              paddingY="none"
              className={[
                // `flex-col items-stretch` reaches the real children only because
                // `.appkit-button__content` declares `flex-direction: inherit` /
                // `align-items: inherit`. Without them the square tile and the caption
                // become side-by-side row items and the tile shrinks to ~half width.
                // `items-stretch` is load-bearing: the span would otherwise inherit
                // `center` from `.appkit-button` and the caption would ignore `text-left`.
                // Never add a bare `block` / `flex` / `hidden` utility here — see
                // Root Cause #68 and scripts/audit-primitive-child-wrappers.mjs.
                "group relative flex-col items-stretch overflow-hidden border bg-[var(--appkit-color-surface)] text-left transition-transform",
                "border-[var(--appkit-color-border)]",
                isHighlight
                  ? "ring-2 ring-offset-2 ring-[var(--appkit-color-primary)] scale-[1.02]"
                  : "hover:scale-[1.01]",
              ].join(" ")}
              aria-label={`View ${it.title || `prize #${it.itemNumber}`} in lightbox`}
            >
              <Div className="relative aspect-square w-full">
                {cover ? (
                  <MediaImage src={cover} alt={it.title || `Prize #${it.itemNumber}`} size="thumbnail" />
                ) : (
                  <Row className="absolute inset-0 bg-[var(--appkit-color-surface-muted)]" align="center" justify="center">
                    <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
                      No image
                    </Text>
                  </Row>
                )}

                <Div textWeight="semibold" textSize="xs" surface="overlay-xl" padding="chip-2xs" className="absolute left-2 top-2 text-white" rounded="default">
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
                    est. ₹{it.estimatedValue.toLocaleString("en-IN")}
                  </Text>
                ) : null}
              </Div>
            </Button>
          );
        })}
      </Grid>

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
