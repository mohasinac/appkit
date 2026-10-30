"use client"
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";
import { normalizeError } from "../../../errors/normalize";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gavel, Play, ShoppingBag, Star } from "lucide-react";
import { WishlistHeartButton } from "../../wishlist/components/WishlistHeartButton";
import { useLongPress } from "../../../react/hooks/useLongPress";
import { MediaImage } from "../../media/MediaImage";
import { useWishlistToggle } from "../../wishlist/hooks/useWishlistToggle";
import type { WishlistToggleActions } from "../../wishlist/hooks/useWishlistToggle";
import { useCountdown, type CountdownRemaining } from "../../../react";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { BaseListingCard } from "../../../ui/components/BaseListingCard";
import { Button } from "../../../ui/components/Button";
import { Caption, Span, Text } from "../../../ui/components/Typography";
import { Div } from "../../../ui/components/Div";
import { GatedPrice } from "../../../ui/components/GatedPrice";
import { Row, Stack } from "../../../ui/components/Layout";
import { TextLink } from "../../../ui/components/TextLink";
import { isBuyNowAvailable } from "../../../_internal/shared/features/collector-drops/config";
import type { ListingType } from "../../products/types/index";
import { CardStoreLine } from "../../products/components/CardStoreLine";

const CLS_STAR_ICON = "h-5 w-5 fill-warning text-warning";
const CLS_LIVE_BADGE = "rounded-full bg-error-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-error-on-solid";
const CLS_ENDING_BADGE = "rounded-full bg-warning-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-warning-on-solid";
const CLS_RESERVE_BADGE = "inline-flex items-center gap-[var(--appkit-space-1)] rounded-full bg-warning-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-warning-on-solid";

export interface MarketplaceCollectorDropCardData {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  mainImage?: string;
  images?: string[];
  video?: { url?: string; thumbnailUrl?: string };
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
  collectorDropEndDate?: string | Date;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  featured?: boolean;
  status?: string;
  slug?: string;
  buyNowPrice?: number;
  /**
   * Feeds `isBuyNowAvailable` alongside `currentBid`/`collectorDropEndDate`. Every
   * doc→card mapper must copy it: dropping one field a shared predicate reads
   * is exactly how a card ends up advertising a buyout the detail page refuses
   * (Root Cause #48).
   */
  isSold?: boolean;
  /**
   * D53 — the reserve, read by `isBuyNowAvailable` so a card cannot advertise
   * a buyout the server will refuse.
   *
   * 🛑 Declared late: the predicate already read `product.reservePrice` while
   * this type did not carry it, so the card was a type error AND every
   * doc→card mapper was free to drop it. That is the exact failure the
   * `isSold` note directly above warns about — a shared predicate reading a
   * field the card shape does not guarantee.
   */
  reservePrice?: number | null;
  /**
   * The seller. Absent from this hand-rolled type entirely until now, so the
   * collector drop card could not show a seller even where every other card did —
   * the same dropped-field shape the `isSold` note directly above warns about,
   * one field over. Every doc→card mapper must copy BOTH: `storeId` says the
   * listing has a seller at all, `storeName` says who.
   */
  storeId?: string;
  storeName?: string;
  /** Display name of the collector drop winner — shown masked when the collector drop has ended */
  winnerDisplayName?: string;
}

export interface MarketplaceCollectorDropCardLabels {
  selectItem?: string;
  deselectItem?: string;
  liveBadge?: string;
  endingSoon?: string;
  ended?: string;
  sold?: string;
  typeBadge?: string;
  currentBid?: string;
  startingBid?: string;
  winningBid?: string;
  wonBy?: string;
  totalBids?: (count: number) => string;
  placeBid?: string;
  buyout?: string;
  addToWishlist?: string;
  removeFromWishlist?: string;
  videoLabel?: string;
}

export interface MarketplaceCollectorDropCardProps {
  product: MarketplaceCollectorDropCardData;
  buyoutPrice?: number;
  className?: string;
  variant?: "grid" | "card" | "fluid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  inWishlist?: boolean;
  href?: string;
  hrefBuilder?: (product: MarketplaceCollectorDropCardData) => string;
  onNavigate?: (href: string) => void;
  wishlistActions?: WishlistToggleActions;
  labels?: MarketplaceCollectorDropCardLabels;
  /**
   * Owner-only pencil / clone / bin. Pass `<OwnerQuickActions>`; it renders
   * nothing for a visitor who does not own the record.
   *
   * 🛑 Rendered OUTSIDE this card's own anchor, as a sibling. A `<button>`
   * inside an `<a>` is invalid HTML that browsers resolve by closing the
   * anchor early, which breaks the CARD's navigation rather than just the
   * button's — `stopPropagation` stops a click but cannot fix a parse.
   */
  renderOwnerActions?: () => React.ReactNode;
}

interface CollectorDropCardHeroProps {
  product: MarketplaceCollectorDropCardData;
  collectorDropHref: string | undefined;
  currentSrc: string | undefined;
  hovered: boolean;
  images: (string | undefined)[];
  imageIndex: number;
  hasVideo: boolean;
  isEnded: boolean;
  isEndingSoon: boolean;
  isSelected: boolean;
  selectable: boolean;
  mergedLabels: Required<MarketplaceCollectorDropCardLabels>;
  onSelect?: (id: string, selected: boolean) => void;
  setHovered: (v: boolean) => void;
  handleSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function renderCollectorDropCardHero(props: CollectorDropCardHeroProps) {
  const { product, collectorDropHref, currentSrc, hovered, images, imageIndex, hasVideo, isEnded, isEndingSoon, isSelected, selectable, mergedLabels, onSelect, setHovered, handleSelect } = props;
  return (
    <BaseListingCard.Hero
      aspect="square"
      variant="grid"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TextLink href={collectorDropHref ?? "#"} className="absolute inset-0 block">
        <MediaImage
          src={currentSrc}
          alt={product.title}
          size="card"
          fallback="Collector Drop image"
          className={`transition-transform duration-500 ${hovered && images.length > 1 ? "scale-105" : "scale-100"}`}
        />
      </TextLink>
      {hasVideo && imageIndex === 0 ? (
        <Div className="absolute right-2 top-2">
          <Span surface="overlay-sm" layout="flex-center" color="inverse" className="h-8 w-8" rounded="full">
            <Play className="h-4 w-4" aria-label={mergedLabels.videoLabel} />
          </Span>
        </Div>
      ) : null}
      {images.length > 1 ? (
        <Row gap="xs" className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
          {images.map((_, index) => (
            <Span
              key={`${product.id}-image-${index}`}
              className={`transition-all duration-200 ${index === imageIndex ? "h-1.5 w-3 bg-[white]" : "h-1.5 w-1.5 bg-[white]/60"}`} rounded="full"
            />
          ))}
        </Row>
      ) : null}
      {product.featured ? (
        <Div className="pointer-events-none absolute left-2 top-2 z-10">
          <Star className={CLS_STAR_ICON} />
        </Div>
      ) : null}
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={handleSelect}
          label={isSelected ? mergedLabels.deselectItem : mergedLabels.selectItem}
          className={selectable || isSelected ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"}
        />
      )}
      <Stack className={`absolute left-2 z-10 ${product.featured ? "top-8" : "top-2"}`} gap="xs">
        {!isEnded ? <Span size="xs" weight="bold" className={CLS_LIVE_BADGE}>{mergedLabels.liveBadge}</Span> : null}
        {isEndingSoon ? <Span size="xs" weight="bold" className={CLS_ENDING_BADGE}>{mergedLabels.endingSoon}</Span> : null}
        {isEnded ? <Span color="inverse" size="xs" weight="bold" surface="overlay-lg" rounded="full" padding="pill-xs">{mergedLabels.ended}</Span> : null}
        {product.status === "sold" ? <Span color="inverse" size="xs" weight="bold" surface="overlay-xl" rounded="full" padding="pill-xs">{mergedLabels.sold}</Span> : null}
      </Stack>
      <Div className="pointer-events-none absolute bottom-2 right-2 z-10">
        <Span size="xs" weight="semibold" className={CLS_RESERVE_BADGE}>
          <Gavel className="h-3 w-3" />
          {mergedLabels.typeBadge}
        </Span>
      </Div>
    </BaseListingCard.Hero>
  );
}

interface CollectorDropCardInfoProps {
  product: MarketplaceCollectorDropCardData;
  collectorDropHref: string | undefined;
  displayBid: number;
  bidCount: number;
  hasCurrentBid: boolean;
  isEnded: boolean;
  isEndingSoon: boolean;
  remaining: import("../../../react").CountdownRemaining | null;
  resolvedBuyoutPrice: number | undefined;
  inWishlist: boolean;
  wishlistLoading: boolean;
  wishlistActions?: WishlistToggleActions;
  countdownClass: string;
  mergedLabels: Required<MarketplaceCollectorDropCardLabels>;
  handleWishlist: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleNavigate: () => void;
}

function renderCollectorDropCardInfoList(props: CollectorDropCardInfoProps) {
  const { product, collectorDropHref, displayBid, bidCount, isEnded, remaining, inWishlist, wishlistLoading, wishlistActions, countdownClass, mergedLabels, handleWishlist, handleNavigate } = props;
  return (
    <>
      <Row className="min-w-0" align="start" justify="between" gap="sm">
        <TextLink href={collectorDropHref ?? "#"} className={`flex-1 leading-snug transition-colors hover:text-primary`} color="primary" truncate={2} size="sm" weight="medium">
          {product.title}
        </TextLink>
        {wishlistActions ? (
          <WishlistHeartButton
            size="inline"
            inWishlist={inWishlist}
            isLoading={wishlistLoading}
            addLabel={mergedLabels.addToWishlist}
            removeLabel={mergedLabels.removeFromWishlist}
            onToggle={handleWishlist}
          />
        ) : null}
      </Row>
      <CardStoreLine storeName={product.storeName} storeId={product.storeId} />
      <Row align="center" gap="sm" wrap>
        <Text className="text-primary" size="sm" weight="bold">
          <GatedPrice label="Sign in to see the bid">{formatCurrency(displayBid, getDefaultCurrency())}</GatedPrice>
        </Text>
        <Div layout="inline-flex" gap="1" textWeight="semibold" align="center" className={`py-[0.125rem] text-[11px] ${countdownClass}`} padding="x-xs" rounded="full">
          <Clock className="h-2.5 w-2.5" />
          <Span>{formatCountdownLabel(remaining, mergedLabels.ended)}</Span>
        </Div>
        {bidCount > 0 && <Caption className="text-[11px]">{mergedLabels.totalBids(bidCount)}</Caption>}
      </Row>
      {!isEnded && (
        <Button gap="xs" type="button" variant="warning" size="sm" textSize="xs" className="self-start px-[0.625rem] mt-0.5" onClick={handleNavigate}>
          <Gavel className="h-3 w-3" />
          <Span>{mergedLabels.placeBid}</Span>
        </Button>
      )}
    </>
  );
}

function renderCollectorDropCardInfoGrid(props: CollectorDropCardInfoProps) {
  const { product, collectorDropHref, displayBid, bidCount, hasCurrentBid, isEnded, remaining, resolvedBuyoutPrice, inWishlist, wishlistLoading, wishlistActions, countdownClass, mergedLabels, handleWishlist, handleNavigate } = props;
  return (
    <>
      <Row align="start" gap="sm">
        <TextLink href={collectorDropHref ?? "#"} className="min-w-0 flex-1 leading-snug transition-colors hover:text-primary" color="primary" size="sm" weight="medium">
          {product.title}
        </TextLink>
        {wishlistActions ? (
          <WishlistHeartButton
            size="inline"
            inWishlist={inWishlist}
            isLoading={wishlistLoading}
            addLabel={mergedLabels.addToWishlist}
            removeLabel={mergedLabels.removeFromWishlist}
            onToggle={handleWishlist}
          />
        ) : null}
      </Row>
      <CardStoreLine storeName={product.storeName} storeId={product.storeId} />
      <Div>
        <Caption>
          {isEnded && hasCurrentBid ? mergedLabels.winningBid : hasCurrentBid ? mergedLabels.currentBid : mergedLabels.startingBid}
        </Caption>
        <Text className="leading-none text-primary" size="base" weight="bold">
          <GatedPrice label="Sign in to see the bid">{formatCurrency(displayBid, getDefaultCurrency())}</GatedPrice>
        </Text>
        {isEnded && product.winnerDisplayName && (
          <Caption className="mt-0.5" color="muted">{mergedLabels.wonBy}: {maskDisplayName(product.winnerDisplayName)}</Caption>
        )}
      </Div>
      <Row wrap justify="between" gap="sm" className="gap-x-2 gap-y-1">
        <Div layout="inline-flex" gap="1" textWeight="semibold" textSize="xs" align="center" className={`${countdownClass}`} paddingY="y-2xs" paddingX="x-xs" rounded="full">
          <Clock className="h-3 w-3" />
          <Span>{formatCountdownLabel(remaining, mergedLabels.ended)}</Span>
        </Div>
        <Caption>{mergedLabels.totalBids(bidCount)}</Caption>
      </Row>
      <Row wrap gap="xs" className="mt-auto">
        {isEnded ? (
          <Button gap="xs" type="button" variant="ghost" size="sm" textSize="xs" paddingX="xs" className="flex-1 cursor-not-allowed opacity-60" disabled>
            <Span>{mergedLabels.ended}</Span>
          </Button>
        ) : (
          <>
            <Button gap="xs" type="button" variant="warning" size="sm" textSize="xs" paddingX="xs" className="flex-1" onClick={handleNavigate}>
              <Gavel className="h-3 w-3" />
              <Span>{mergedLabels.placeBid}</Span>
            </Button>
            {resolvedBuyoutPrice ? (
              /* `secondary`, not `danger` — this button only navigates to the
                 PDP, and `danger` is reserved for destructive actions (Rule #7
                 kinds). ACTIONS.COLLECTOR_DROP["buy-it-now"] is itself `secondary`. */
              <Button gap="xs" type="button" variant="secondary" size="sm" textSize="xs" paddingX="xs" className="flex-1" onClick={handleNavigate}>
                <ShoppingBag className="h-3 w-3" />
                <Span>{mergedLabels.buyout}</Span>
              </Button>
            ) : null}
          </>
        )}
      </Row>
    </>
  );
}

const DEFAULT_LABELS: Required<MarketplaceCollectorDropCardLabels> = {
  selectItem: "Select item",
  deselectItem: "Deselect item",
  liveBadge: "Live",
  endingSoon: "Ending soon",
  ended: "Ended",
  sold: "Sold",
  typeBadge: "Collector Drop",
  currentBid: "Current bid",
  startingBid: "Starting bid",
  winningBid: "Winning bid",
  wonBy: "Won by",
  totalBids: (count: number) => `${count} bids`,
  placeBid: "Place bid",
  buyout: "Buyout",
  addToWishlist: "Add to wishlist",
  removeFromWishlist: "Remove from wishlist",
  videoLabel: "Video available",
};

const COUNTDOWN_STATUS_CLASS = {
  ended: "bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text-muted)]",
  endingSoon: "bg-warning-surface text-warning",
  live: "bg-success-surface text-success",
} as const;

function maskDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const p = parts[0];
    return p.length <= 2 ? p : p[0] + "*".repeat(Math.min(p.length - 1, 3));
  }
  return parts
    .map((part, i) => {
      if (!part) return "";
      if (i === parts.length - 1) return part[0] + ".";
      return part[0] + "*".repeat(Math.min(part.length - 1, 3));
    })
    .join(" ");
}

function resolveHref(
  product: MarketplaceCollectorDropCardData,
  href?: string,
  hrefBuilder?: (product: MarketplaceCollectorDropCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(product);
  if (!product.id) return undefined;
  return ROUTES.PUBLIC.COLLECTOR_DROP_DETAIL(product.slug ?? product.id);
}

function formatCountdownLabel(
  remaining: CountdownRemaining | null,
  endedLabel: string,
): string {
  if (!remaining) return endedLabel;
  const { days, hours, minutes, seconds } = remaining;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function MarketplaceCollectorDropCard({
  product,
  buyoutPrice,
  className = "",
  variant = "grid",
  selectable = false,
  isSelected = false,
  onSelect,
  inWishlist: initialInWishlist = false,
  href,
  hrefBuilder,
  onNavigate,
  wishlistActions,
  labels,
  renderOwnerActions,
}: MarketplaceCollectorDropCardProps) {
  const router = useRouter();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const baseVariant: "grid" | "list" = variant === "list" ? "list" : "grid";
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remaining = useCountdown(product.collectorDropEndDate);
  const {
    inWishlist,
    isLoading: wishlistLoading,
    toggle,
  } = useWishlistToggle(product.id, initialInWishlist, wishlistActions);

  const collectorDropHref = resolveHref(product, href, hrefBuilder);
  const isEnded = remaining === null;
  const isEndingSoon =
    remaining !== null && remaining.days === 0 && remaining.hours < 1;
  const displayBid =
    (product.currentBid ?? 0) > 0
      ? product.currentBid!
      : (product.startingBid ?? product.price);
  const bidCount = product.bidCount ?? 0;
  const hasCurrentBid = (product.currentBid ?? 0) > 0;
  const hasVideo = Boolean(product.video?.url);
  // Availability is folded in HERE rather than at the render site, so the chip
  // can never advertise a buyout the detail page will refuse. It used to gate on
  // the price merely EXISTING, so cards linked through to a PDP with no Buy Now
  // button at all. `isBuyNowAvailable` is the same predicate that page uses.
  const rawBuyoutPrice = buyoutPrice ?? product.buyNowPrice;
  const resolvedBuyoutPrice = isBuyNowAvailable({
    buyNowPrice: rawBuyoutPrice,
    currentBid: product.currentBid,
    isEnded,
    isSold: product.isSold === true,
    // D53 — a card must not advertise a buyout price the server refuses.
    reservePrice: typeof product.reservePrice === "number" ? product.reservePrice : null,
  })
    ? rawBuyoutPrice
    : undefined;
  const images = [product.mainImage, ...(product.images ?? [])].filter(Boolean);
  const currentSrc = images[imageIndex] ?? product.mainImage;

  useEffect(() => {
    if (hovered && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setImageIndex((value) => (value + 1) % images.length);
      }, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setImageIndex(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hovered, images.length]);

  const longPress = useLongPress(() => onSelect?.(product.id, !isSelected));

  const handleNavigate = useCallback(() => {
    if (!collectorDropHref) return;
    if (onNavigate) {
      onNavigate(collectorDropHref);
      return;
    }
    router.push(collectorDropHref);
  }, [collectorDropHref, onNavigate, router]);

  const handleSelect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(product.id, !isSelected);
    },
    [isSelected, onSelect, product.id],
  );

  const handleWishlist = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      try {
        await toggle();
      } catch (_err) {
        // useWishlistToggle rolls back its optimistic state and raises its own
        // toast on failure, so the heart returns to its true value on screen.
        // Reporting again here would double-notify for one user action.
        void normalizeError(_err);
      }
    },
    [toggle],
  );

  const countdownClass = isEnded
    ? COUNTDOWN_STATUS_CLASS.ended
    : isEndingSoon
      ? COUNTDOWN_STATUS_CLASS.endingSoon
      : COUNTDOWN_STATUS_CLASS.live;

  const cardInfoProps: CollectorDropCardInfoProps = {
    product, collectorDropHref, displayBid, bidCount, hasCurrentBid, isEnded, isEndingSoon,
    remaining, resolvedBuyoutPrice, inWishlist, wishlistLoading, wishlistActions,
    countdownClass, mergedLabels, handleWishlist, handleNavigate,
  };

  const card = (
    <BaseListingCard
      isSelected={isSelected}
      isDisabled={isEnded}
      variant={baseVariant}
      className={className}
      onMouseDown={!isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={!isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={!isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={!isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={!isSelected ? longPress.onTouchEnd : undefined}
      onTouchCancel={!isSelected ? longPress.onTouchCancel : undefined}
    >
      {renderCollectorDropCardHero({ product, collectorDropHref, currentSrc, hovered, images, imageIndex, hasVideo, isEnded, isEndingSoon, isSelected, selectable, mergedLabels, onSelect, setHovered, handleSelect })}
      <BaseListingCard.Info variant={baseVariant}>
        {baseVariant === "list" ? renderCollectorDropCardInfoList(cardInfoProps) : renderCollectorDropCardInfoGrid(cardInfoProps)}
      </BaseListingCard.Info>
    </BaseListingCard>
  );

  /*
   * 🛑 Default, not opt-in. Nothing in either repo ever passed
   * `renderOwnerActions`, so this toolbar was unreachable on every grid that
   * mounts this card (Root Cause #8 — a slot shell rendered with zero render
   * props). A card is resource-specific by construction, so it names its own
   * resource rather than being threaded one; the prop stays as an override.
   */
  const ownerActions = renderOwnerActions
    ? renderOwnerActions()
    : product.id
      ? (
          <RecordOwnerQuickActions resource="PRODUCT" recordId={String(product.id)} storeId={product.storeId ? String(product.storeId) : undefined} recordLabel={product.title} placement="card" />
        )
      : null;

  if (!ownerActions) return card;
  /*
   * Sibling of the card, never a child — see the prop's docstring. `z-20`
   * clears this card's own overlays, which all sit at `z-10`.
   */
  return (
    <Div layout="flex-col" className="h-full">
      {card}
    {/*
      🛑 NORMAL FLOW AT THE FOOT, not an absolute corner.

      Across the five card types this toolbar appeared in FIVE different
      places — `top-14` on the product grid (on the photograph), `top-2`
      here and on the prize draw (on the badges), `bottom-2` on the pre-order
      and collector drop (on top of their own CTA button). Each was chosen by
      elimination against that one card's overlays, so each landed somewhere
      different and none of them read as a toolbar.

      At the foot in normal flow there is no corner budget to reason about and
      no overlay to dodge, so it is the same position on every card. It stays
      a SIBLING of the card body because that body is wrapped in a `<Link>`
      and a button inside an anchor is invalid HTML.
    */}
    <Div layout="flex" justify="end" className="px-[var(--appkit-space-3)] pb-[var(--appkit-space-3)]">{ownerActions}</Div>
    </Div>
  );
}
