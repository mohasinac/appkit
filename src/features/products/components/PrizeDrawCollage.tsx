/**
 * PrizeDrawCollage (SB4-B)
 *
 * Read-only display of a prize-draw's full prize pool. Each cell shows the
 * primary image, item-number badge, and title. Items with `isWon === true`
 * are dimmed under a diagonal overlay with a "Won" label so the public
 * collage truthfully reflects what's still up for grabs.
 *
 * Optional `highlightItemNumber` (passed by the reveal modal during animation)
 * adds an emphasis ring to the cell that just won.
 */

import React from "react";
import { Div, Text } from "../../../ui";
import type { PrizeDrawItem } from "../schemas/firestore";

export interface PrizeDrawCollageProps {
  items: PrizeDrawItem[];
  highlightItemNumber?: number;
  /** Custom click handler — e.g. open detail modal for an item. */
  onItemClick?: (item: PrizeDrawItem) => void;
  /** Defaults to "Won". Use for localisation. */
  wonLabel?: string;
  /**
   * Public buyer surfaces pass `true` so the diagonal "Won" overlay never
   * renders — otherwise potential buyers would see their favorite prize is
   * already gone and drop out. The seller / admin / winner views leave this
   * `false` (default) to show real pool state.
   *
   * The product adapter for public reads should ALSO strip `isWon` before
   * sending the items array client-side; this prop is the visual fallback.
   */
  hideWonState?: boolean;
}

export function PrizeDrawCollage({
  items,
  highlightItemNumber,
  onItemClick,
  wonLabel = "Won",
  hideWonState = false,
}: PrizeDrawCollageProps) {
  if (!items.length) {
    return (
      <Div className="rounded border border-dashed border-[var(--appkit-color-border)] p-6 text-center">
        <Text className="text-sm text-[var(--appkit-color-text-muted)]">
          No prizes configured yet.
        </Text>
      </Div>
    );
  }

  return (
    <Div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((it) => {
        const cover = it.images?.[0];
        const isHighlight = highlightItemNumber === it.itemNumber;
        const Cell = onItemClick ? "button" : "div";
        return (
          <Cell
            key={`collage-${it.itemNumber}`}
            type={onItemClick ? "button" : undefined}
            onClick={onItemClick ? () => onItemClick(it) : undefined}
            className={[
              "group relative overflow-hidden rounded-lg border bg-[var(--appkit-color-surface)] text-left transition-transform",
              "border-[var(--appkit-color-border)]",
              isHighlight
                ? "ring-2 ring-offset-2 ring-[var(--appkit-color-primary)] scale-[1.02]"
                : "hover:scale-[1.01]",
            ].join(" ")}
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
                <Div className="absolute inset-0 flex items-center justify-center bg-[var(--appkit-color-surface-muted)]">
                  <Text className="text-xs text-[var(--appkit-color-text-muted)]">
                    No image
                  </Text>
                </Div>
              )}

              <Div className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
                #{it.itemNumber}
              </Div>

              {it.isWon && !hideWonState ? (
                <>
                  <Div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-black/60 mix-blend-multiply"
                  />
                  <Div className="absolute inset-0 flex items-center justify-center">
                    <Text className="rotate-[-12deg] rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow">
                      {wonLabel}
                    </Text>
                  </Div>
                </>
              ) : null}
            </Div>

            <Div className="p-2">
              <Text className="line-clamp-2 text-sm font-medium">
                {it.title || `Prize #${it.itemNumber}`}
              </Text>
              {it.estimatedValue != null ? (
                <Text className="text-xs text-[var(--appkit-color-text-muted)]">
                  est. ₹{(it.estimatedValue / 100).toLocaleString("en-IN")}
                </Text>
              ) : null}
            </Div>
          </Cell>
        );
      })}
    </Div>
  );
}

export default PrizeDrawCollage;
