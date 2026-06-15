"use client";
import { useState } from "react";
import Link from "next/link";
import type { StoreListItem } from "../types";
import { BaseListingCard, Div, Heading, RichText, Row, Span, Stack } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { THEME_CONSTANTS } from "../../../tokens";
import { normalizeRichTextHtml } from "../../../utils";
import { useLongPress } from "../../../react/hooks/useLongPress";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_RATING_BADGE = "absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-warning";

export interface InteractiveStoreCardProps {
  store: StoreListItem;
  href: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  labels?: {
    products?: string;
    sold?: string;
    reviews?: string;
    visitStore?: string;
  };
  className?: string;
}

export function InteractiveStoreCard({
  store,
  href,
  selectable,
  isSelected = false,
  onSelect,
  labels = {},
  className = "",
}: InteractiveStoreCardProps) {
  const initial = store.storeName[0]?.toUpperCase() ?? "S";
  const [logoBroken, setLogoBroken] = useState(false);
  const [bannerBroken, setBannerBroken] = useState(false);
  const hasLogo = Boolean(store.storeLogoURL) && !logoBroken;
  const hasBanner = Boolean(store.storeBannerURL) && !bannerBroken;
  const longPress = useLongPress(() => onSelect?.(store.id, !isSelected));

  return (
    <Div
      className={[
        "group relative flex flex-col h-full overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-shadow hover:shadow-lg",
        isSelected
          ? "border-[var(--appkit-color-primary,theme(colors.violet.600))] outline outline-2 outline-[var(--appkit-color-primary,theme(colors.violet.600))]"
          : "border-zinc-200 dark:border-zinc-700",
        className,
      ].join(" ")}
      onMouseDown={!isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={!isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={!isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={!isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={!isSelected ? longPress.onTouchEnd : undefined}
    >
      {/* Hover/selection checkbox */}
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={(e) => {
            e.preventDefault();
            onSelect(store.id, !isSelected);
          }}
          label={isSelected ? "Deselect store" : "Select store"}
          position="top-2 left-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}

      <Link href={href} className="flex flex-col flex-1 min-h-0">
        {/* ── Banner ──────────────────────────────────────────────────── */}
        <Div className={`relative aspect-video w-full ${__O.hidden} bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-900 flex-shrink-0`}>
          {hasBanner ? (
            <MediaImage
              src={store.storeBannerURL!}
              alt={`${store.storeName} banner`}
              size="banner"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <Row className="absolute inset-0" align="center" justify="center">
              <Span className="opacity-20 select-none" size="5xl" aria-hidden="true">🏪</Span>
            </Row>
          )}
          {/* Dark gradient at bottom for logo legibility */}
          <Div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          {/* Rating badge — top right */}
          {store.averageRating != null && store.averageRating > 0 && (
            <Div className={CLS_RATING_BADGE}>
              ★ {store.averageRating.toFixed(1)}
            </Div>
          )}
        </Div>

        {/* ── Info section ────────────────────────────────────────────── */}
        <Stack className="flex-1 pb-4" padding="x-md">
          {/* Logo — overlaps banner bottom edge.
              Uses a native <img> with onError → state flip so a missing or
              broken storeLogoURL falls back to the initials circle below
              (matches the §5 plan fix: prevent the "tiny dot" artifact when
              MediaImage's generic emoji fallback gets clipped in a 40×40 box). */}
          <Row className="-mt-5 mb-2" align="end" justify="between">
            <Div className="flex-shrink-0">
              {hasLogo ? (
                <img
                  src={store.storeLogoURL!}
                  alt={store.storeName}
                  className="h-10 w-10 rounded-lg border-2 border-white dark:border-zinc-800 shadow-md object-cover bg-white dark:bg-zinc-800"
                  onError={() => setLogoBroken(true)}
                  loading="lazy"
                />
              ) : (
                <Row className="h-10 w-10 border-2 border-white bg-primary/10 dark:bg-primary/20 text-base font-bold text-primary" align="center" justify="center" rounded="lg" shadow="md">
                  {initial}
                </Row>
              )}
            </Div>
          </Row>

          {/* Store name */}
          <Heading
            level={3}
            className={`${THEME_CONSTANTS.utilities.textClamp1} group-hover:text-primary transition-colors`} size="sm" weight="bold" color="primary"
          >
            {store.storeName}
          </Heading>

          {/* Description */}
          {store.storeDescription ? (
            <RichText
              html={normalizeRichTextHtml(store.storeDescription)}
              proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
              className={`mt-1 ${THEME_CONSTANTS.utilities.textClamp2} text-xs text-zinc-500 dark:text-zinc-400 flex-1`}
            />
          ) : (
            <Div className="flex-1" />
          )}

          {/* Stats row */}
          <Row gap="sm" className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400" wrap>
            {store.totalProducts != null && store.totalProducts > 0 && (
              <Span className="flex items-center gap-0.5">
                <Span aria-hidden="true">📦</Span> {store.totalProducts} {labels.products ?? "products"}
              </Span>
            )}
            {store.itemsSold != null && store.itemsSold > 0 && (
              <Span className="flex items-center gap-0.5">
                <Span aria-hidden="true">🛍️</Span> {store.itemsSold} {labels.sold ?? "sold"}
              </Span>
            )}
          </Row>

          {/* CTA */}
          <Row className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800" align="center" justify="between">
            <Span size="xs" weight="semibold" className="text-primary group-hover:underline transition-colors">
              {labels.visitStore ?? "Visit store"} →
            </Span>
            {store.totalReviews != null && store.totalReviews > 0 && (
              <Span size="xs" color="muted">
                {store.totalReviews} {labels.reviews ?? "reviews"}
              </Span>
            )}
          </Row>
        </Stack>
      </Link>
    </Div>
  );
}
