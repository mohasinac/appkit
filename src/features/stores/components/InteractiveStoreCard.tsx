"use client";
import { useState } from "react";
import Link from "next/link";
import type { StoreListItem } from "../types";
import { BaseListingCard } from "../../../ui/components/BaseListingCard";
import { Div } from "../../../ui/components/Div";
import { Heading, Span } from "../../../ui/components/Typography";
import { RichText } from "../../../ui/rich-text/RichText";
import { Row, Stack } from "../../../ui/components/Layout";
import { Scrim } from "../../../ui/components/Scrim";
import { MediaImage } from "../../media/MediaImage";
import { normalizeRichTextHtml } from "../../../utils";
import { useLongPress } from "../../../react/hooks/useLongPress";
import { SellerTierBadge } from "./SellerTierBadge";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_RATING_BADGE = "absolute top-2 right-2 flex items-center gap-[var(--appkit-space-1)] rounded-full bg-black/50 backdrop-blur-sm px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-semibold text-warning";

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
  /**
   * Owner-only pencil / clone / bin, for an admin or whoever owns this record.
   * Pass `<OwnerQuickActions>`; it renders nothing for anyone else.
   *
   * 🛑 Rendered OUTSIDE this card's own `<Link>`/`<TextLink>`, as a sibling.
   * A `<button>` inside an `<a>` is invalid HTML that browsers resolve by
   * closing the anchor early, which breaks the CARD's navigation rather than
   * just the button's — `stopPropagation` stops a click but cannot fix a parse.
   */
  renderOwnerActions?: () => React.ReactNode;
}

export function InteractiveStoreCard({
  store,
  href,
  selectable,
  isSelected = false,
  onSelect,
  labels = {},
  className = "",
  renderOwnerActions,
}: InteractiveStoreCardProps) {
  const initial = store.storeName[0]?.toUpperCase() ?? "S";
  const [logoBroken, setLogoBroken] = useState(false);
  const hasLogo = Boolean(store.storeLogoURL) && !logoBroken;
  const hasBanner = Boolean(store.storeBannerURL);
  /*
   * The rating badge used to live ONLY as an overlay on the banner, so making
   * the banner conditional would have silently dropped the rating from every
   * bannerless store — a hidden second effect of a layout change (Root Cause
   * #57's family). It renders in the stats row instead when there is no banner
   * to sit on, so the card never loses the number.
   */
  const hasRating = store.averageRating != null && store.averageRating > 0;
  const longPress = useLongPress(() => onSelect?.(store.id, !isSelected));

  const card = (
    <Div
      className={[
        "group relative flex flex-col h-full overflow-hidden rounded-xl border bg-[var(--appkit-color-surface)] shadow-sm transition-shadow hover:shadow-lg",
        isSelected
          ? "border-[var(--appkit-color-primary,theme(colors.violet.600))] outline outline-2 outline-[var(--appkit-color-primary,theme(colors.violet.600))]"
          : "border-[var(--appkit-color-border)]",
        className,
      ].join(" ")}
      onMouseDown={!isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={!isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={!isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={!isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={!isSelected ? longPress.onTouchEnd : undefined}
      onTouchCancel={!isSelected ? longPress.onTouchCancel : undefined}
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
          className={selectable || isSelected ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"}
        />
      )}

      <Link href={href} className="flex flex-col flex-1 min-h-0">
        {/* ── Banner — ONLY when the store actually has one ─────────────
            🛑 No placeholder. This used to render the `aspect-video` box
            unconditionally with a 20%-opacity 🏪 glyph inside it when
            `storeBannerURL` was unset, so every bannerless store paid a
            16:9 slab of empty surface at the top of its card — the single
            largest element on a card whose actual content is the name, the
            description and two counters. A card with nothing to put in that
            space should not reserve it. */}
        {hasBanner && (
          <Div surface="muted" className={`relative aspect-video w-full ${__O.hidden} flex-shrink-0`}>
            <MediaImage
              src={store.storeBannerURL!}
              alt={`${store.storeName} banner`}
              size="banner"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Dark gradient at bottom for logo legibility */}
            <Scrim direction="bottom-up" intensity="subtle" className="absolute inset-x-0 bottom-0 h-12" />

            {/* Rating badge — top right */}
            {hasRating && (
              <Div className={CLS_RATING_BADGE}>
                ★ {store.averageRating!.toFixed(1)}
              </Div>
            )}
          </Div>
        )}

        {/* ── Info section ────────────────────────────────────────────── */}
        <Stack paddingY="b-md" className="flex-1" padding="x-md">
          {/* Logo — overlaps the banner's bottom edge when there IS a banner.
              🛑 The negative margin is conditional: with no banner above it
              there is nothing to overlap, and `-mt-5` would instead pull the
              logo up through the card's own top padding and clip it.
              Uses MediaImage's onError callback → state flip so a missing or
              broken storeLogoURL falls back to the initials circle below
              (matches the §5 plan fix: prevent the "tiny dot" artifact when
              MediaImage's generic emoji fallback gets clipped in a 40×40 box). */}
          <Row className={hasBanner ? "-mt-5 mb-2" : "mt-3 mb-2"} align="end" justify="between">
            <Div className="flex-shrink-0">
              {hasLogo ? (
                <Div className="relative h-10 w-10 border-2 border-[var(--appkit-color-border-subtle)] bg-[var(--appkit-color-surface)]" rounded="lg" shadow="md" overflow="hidden">
                  <MediaImage
                    src={store.storeLogoURL!}
                    alt={store.storeName}
                    size="thumbnail"
                    onError={() => setLogoBroken(true)}
                  />
                </Div>
              ) : (
                <Row textWeight="bold" textSize="base" className="h-10 w-10 border-2 border-white bg-primary/10 dark:bg-primary/20 text-primary" align="center" justify="center" rounded="lg" shadow="md">
                  {initial}
                </Row>
              )}
            </Div>
          </Row>

          {/* Store name */}
          <Heading
            level={3}
            className={`group-hover:text-primary transition-colors`} truncate size="sm" weight="bold" color="primary"
          >
            {store.storeName}
          </Heading>

          {/*
            Trust badges, directly under the name.
            🛑 No `href` — the whole card is already a link, and nesting an
            anchor inside one is invalid HTML that browsers resolve by
            splitting the outer link. The badges explain themselves on the
            store page instead.
          */}
          <SellerTierBadge
            isVerified={store.isVerified}
            sellerTier={store.sellerTier}
            size="xs"
          />

          {/* Description */}
          {store.storeDescription ? (
            <RichText
              html={normalizeRichTextHtml(store.storeDescription)}
              proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
              className="mt-1 line-clamp-2 text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)] flex-1"
            />
          ) : (
            <Div className="flex-1" />
          )}

          {/* Stats row */}
          <Row color="muted" textSize="xs" gap="sm" className="mt-2.5" wrap>
            {/* Only when no banner carried it as an overlay — see `hasRating`. */}
            {!hasBanner && hasRating && (
              <Span layout="flex" gap="2xs" className="text-warning">
                <Span aria-hidden="true">★</Span> {store.averageRating!.toFixed(1)}
              </Span>
            )}
            {store.totalProducts != null && store.totalProducts > 0 && (
              <Span layout="flex" gap="2xs">
                <Span aria-hidden="true">📦</Span> {store.totalProducts} {labels.products ?? "products"}
              </Span>
            )}
            {store.itemsSold != null && store.itemsSold > 0 && (
              <Span layout="flex" gap="2xs">
                <Span aria-hidden="true">🛍️</Span> {store.itemsSold} {labels.sold ?? "sold"}
              </Span>
            )}
          </Row>

          {/* CTA */}
          <Row border="top-subtle" paddingY="y-xs-tall" className="mt-3" align="center" justify="between">
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

  if (!renderOwnerActions) return card;
  /*
   * Sibling of the card, never a child — see the prop's docstring. `z-20`
   * beats this card's own overlays, which all sit at `z-10`.
   */
  return (
    <Div className="relative h-full">
      {card}
      <Div className="absolute right-2 bottom-2 z-20">{renderOwnerActions()}</Div>
    </Div>
  );
}
