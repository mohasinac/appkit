"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gavel, Heart, Play, ShoppingBag, Star } from "lucide-react";
import { useLongPress } from "../../../react/hooks/useLongPress";
import { MediaImage } from "../../media";
import { useWishlistToggle, type WishlistToggleActions } from "../../wishlist";
import { useCountdown, type CountdownRemaining } from "../../../react";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  BaseListingCard,
  Button,
  Caption,
  Div,
  Row,
  Span,
  Text,
  TextLink,
} from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";

const CLS_STAR_ICON = "h-5 w-5 fill-warning text-warning";
const CLS_LIVE_BADGE = "rounded-full bg-error-surface px-2 py-0.5 text-white";
const CLS_ENDING_BADGE = "rounded-full bg-warning-surface px-2 py-0.5 text-white";
const CLS_RESERVE_BADGE = "inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-white";
const CLS_HEART_ON = "fill-error text-error";
const CLS_HEART_OFF = "text-zinc-400";

export interface MarketplaceAuctionCardData {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  mainImage?: string;
  images?: string[];
  video?: { url?: string; thumbnailUrl?: string };
  /** Canonical discriminator (SB1-G Phase 4 · SB-UNI-F 2026-05-13 union extension). */
  listingType?:
    | "standard"
    | "auction"
    | "pre-order"
    | "prize-draw"
    | "classified"
    | "digital-code"
    | "live";
  auctionEndDate?: string | Date;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  featured?: boolean;
  status?: string;
  slug?: string;
  buyNowPrice?: number;
  /** Display name of the auction winner — shown masked when the auction has ended */
  winnerDisplayName?: string;
}

export interface MarketplaceAuctionCardLabels {
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

export interface MarketplaceAuctionCardProps {
  product: MarketplaceAuctionCardData;
  buyoutPrice?: number;
  className?: string;
  variant?: "grid" | "card" | "fluid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  inWishlist?: boolean;
  href?: string;
  hrefBuilder?: (product: MarketplaceAuctionCardData) => string;
  onNavigate?: (href: string) => void;
  wishlistActions?: WishlistToggleActions;
  labels?: MarketplaceAuctionCardLabels;
}

interface AuctionCardHeroProps {
  product: MarketplaceAuctionCardData;
  auctionHref: string | undefined;
  currentSrc: string | undefined;
  hovered: boolean;
  images: (string | undefined)[];
  imageIndex: number;
  hasVideo: boolean;
  isEnded: boolean;
  isEndingSoon: boolean;
  isSelected: boolean;
  selectable: boolean;
  mergedLabels: Required<MarketplaceAuctionCardLabels>;
  onSelect?: (id: string, selected: boolean) => void;
  setHovered: (v: boolean) => void;
  handleSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function renderAuctionCardHero(props: AuctionCardHeroProps) {
  const { product, auctionHref, currentSrc, hovered, images, imageIndex, hasVideo, isEnded, isEndingSoon, isSelected, selectable, mergedLabels, onSelect, setHovered, handleSelect } = props;
  return (
    <BaseListingCard.Hero
      aspect="square"
      variant="grid"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TextLink href={auctionHref ?? "#"} className="absolute inset-0 block">
        <MediaImage
          src={currentSrc}
          alt={product.title}
          size="card"
          fallback="Auction image"
          className={`transition-transform duration-500 ${hovered && images.length > 1 ? "scale-105" : "scale-100"}`}
        />
      </TextLink>
      {hasVideo && imageIndex === 0 ? (
        <Div className="absolute right-2 top-2">
          <Span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white">
            <Play className="h-4 w-4" aria-label={mergedLabels.videoLabel} />
          </Span>
        </Div>
      ) : null}
      {images.length > 1 ? (
        <Div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {images.map((_, index) => (
            <Span
              key={`${product.id}-image-${index}`}
              className={`rounded-full transition-all duration-200 ${index === imageIndex ? "h-1.5 w-3 bg-white" : "h-1.5 w-1.5 bg-white/60"}`}
            />
          ))}
        </Div>
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
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}
      <Div className={`absolute left-2 z-10 flex flex-col gap-1 ${product.featured ? "top-8" : "top-2"}`}>
        {!isEnded ? <Span size="xs" weight="bold" className={CLS_LIVE_BADGE}>{mergedLabels.liveBadge}</Span> : null}
        {isEndingSoon ? <Span size="xs" weight="bold" className={CLS_ENDING_BADGE}>{mergedLabels.endingSoon}</Span> : null}
        {isEnded ? <Span size="xs" weight="bold" className="rounded-full bg-zinc-600/90 px-2 py-0.5 text-white">{mergedLabels.ended}</Span> : null}
        {product.status === "sold" ? <Span size="xs" weight="bold" className="rounded-full bg-zinc-700/90 px-2 py-0.5 text-white">{mergedLabels.sold}</Span> : null}
      </Div>
      <Div className="pointer-events-none absolute bottom-2 right-2 z-10">
        <Span size="xs" weight="semibold" className={CLS_RESERVE_BADGE}>
          <Gavel className="h-3 w-3" />
          {mergedLabels.typeBadge}
        </Span>
      </Div>
    </BaseListingCard.Hero>
  );
}

interface AuctionCardInfoProps {
  product: MarketplaceAuctionCardData;
  auctionHref: string | undefined;
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
  mergedLabels: Required<MarketplaceAuctionCardLabels>;
  handleWishlist: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleNavigate: () => void;
}

function renderAuctionCardInfoList(props: AuctionCardInfoProps) {
  const { product, auctionHref, displayBid, bidCount, isEnded, remaining, inWishlist, wishlistLoading, wishlistActions, countdownClass, mergedLabels, handleWishlist, handleNavigate } = props;
  return (
    <>
      <Row className="min-w-0" align="start" justify="between" gap="sm">
        <TextLink href={auctionHref ?? "#"} className={`${THEME_CONSTANTS.utilities.textClamp2} flex-1 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100 transition-colors hover:text-primary`}>
          {product.title}
        </TextLink>
        {wishlistActions ? (
          <Button type="button" variant="ghost" onClick={handleWishlist} disabled={wishlistLoading} aria-label={inWishlist ? mergedLabels.removeFromWishlist : mergedLabels.addToWishlist} className="shrink-0 rounded-full p-1">
            <Heart className={`h-3.5 w-3.5 ${inWishlist ? CLS_HEART_ON : CLS_HEART_OFF}`} />
          </Button>
        ) : null}
      </Row>
      <Row align="center" gap="sm" wrap>
        <Text className="text-primary" size="sm" weight="bold">{formatCurrency(displayBid, getDefaultCurrency())}</Text>
        <Div className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold ${countdownClass}`} rounded="full">
          <Clock className="h-2.5 w-2.5" />
          <Span>{formatCountdownLabel(remaining, mergedLabels.ended)}</Span>
        </Div>
        {bidCount > 0 && <Caption className="text-[11px]">{mergedLabels.totalBids(bidCount)}</Caption>}
      </Row>
      {!isEnded && (
        <Button type="button" variant="warning" size="sm" className="self-start gap-1 px-2.5 text-xs mt-0.5" onClick={handleNavigate}>
          <Gavel className="h-3 w-3" />
          <Span>{mergedLabels.placeBid}</Span>
        </Button>
      )}
    </>
  );
}

function renderAuctionCardInfoGrid(props: AuctionCardInfoProps) {
  const { product, auctionHref, displayBid, bidCount, hasCurrentBid, isEnded, remaining, resolvedBuyoutPrice, inWishlist, wishlistLoading, wishlistActions, countdownClass, mergedLabels, handleWishlist, handleNavigate } = props;
  return (
    <>
      <Row align="start" gap="sm">
        <TextLink href={auctionHref ?? "#"} className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100 transition-colors hover:text-primary">
          {product.title}
        </TextLink>
        {wishlistActions ? (
          <Button type="button" variant="ghost" onClick={handleWishlist} disabled={wishlistLoading} aria-label={inWishlist ? mergedLabels.removeFromWishlist : mergedLabels.addToWishlist} className="-mt-0.5 rounded-full p-1">
            <Heart className={`h-4 w-4 ${inWishlist ? CLS_HEART_ON : CLS_HEART_OFF}`} />
          </Button>
        ) : null}
      </Row>
      <Div>
        <Caption>
          {isEnded && hasCurrentBid ? mergedLabels.winningBid : hasCurrentBid ? mergedLabels.currentBid : mergedLabels.startingBid}
        </Caption>
        <Text className="leading-none text-primary" size="base" weight="bold">{formatCurrency(displayBid, getDefaultCurrency())}</Text>
        {isEnded && product.winnerDisplayName && (
          <Caption className="mt-0.5 text-zinc-500 dark:text-zinc-400">{mergedLabels.wonBy}: {maskDisplayName(product.winnerDisplayName)}</Caption>
        )}
      </Div>
      <Row wrap justify="between" gap="sm" className="gap-x-2 gap-y-1">
        <Div className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold ${countdownClass}`} rounded="full">
          <Clock className="h-3 w-3" />
          <Span>{formatCountdownLabel(remaining, mergedLabels.ended)}</Span>
        </Div>
        <Caption>{mergedLabels.totalBids(bidCount)}</Caption>
      </Row>
      <Row wrap gap="xs" className="mt-auto">
        {isEnded ? (
          <Button type="button" variant="ghost" size="sm" className="flex-1 cursor-not-allowed gap-1 px-2 text-xs opacity-60" disabled>
            <Span>{mergedLabels.ended}</Span>
          </Button>
        ) : (
          <>
            <Button type="button" variant="warning" size="sm" className="flex-1 gap-1 px-2 text-xs" onClick={handleNavigate}>
              <Gavel className="h-3 w-3" />
              <Span>{mergedLabels.placeBid}</Span>
            </Button>
            {resolvedBuyoutPrice ? (
              <Button type="button" variant="danger" size="sm" className="flex-1 gap-1 px-2 text-xs" onClick={handleNavigate}>
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

const DEFAULT_LABELS: Required<MarketplaceAuctionCardLabels> = {
  selectItem: "Select item",
  deselectItem: "Deselect item",
  liveBadge: "Live",
  endingSoon: "Ending soon",
  ended: "Ended",
  sold: "Sold",
  typeBadge: "Auction",
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
  ended: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
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
  product: MarketplaceAuctionCardData,
  href?: string,
  hrefBuilder?: (product: MarketplaceAuctionCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(product);
  if (!product.id) return undefined;
  return ROUTES.PUBLIC.AUCTION_DETAIL(product.slug ?? product.id);
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

export function MarketplaceAuctionCard({
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
}: MarketplaceAuctionCardProps) {
  const router = useRouter();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const baseVariant: "grid" | "list" = variant === "list" ? "list" : "grid";
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remaining = useCountdown(product.auctionEndDate);
  const {
    inWishlist,
    isLoading: wishlistLoading,
    toggle,
  } = useWishlistToggle(product.id, initialInWishlist, wishlistActions);

  const auctionHref = resolveHref(product, href, hrefBuilder);
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
  const resolvedBuyoutPrice = buyoutPrice ?? product.buyNowPrice;
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
    if (!auctionHref) return;
    if (onNavigate) {
      onNavigate(auctionHref);
      return;
    }
    router.push(auctionHref);
  }, [auctionHref, onNavigate, router]);

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
      } catch {
        // The hook rolls back optimistic state when the mutation fails.
      }
    },
    [toggle],
  );

  const countdownClass = isEnded
    ? COUNTDOWN_STATUS_CLASS.ended
    : isEndingSoon
      ? COUNTDOWN_STATUS_CLASS.endingSoon
      : COUNTDOWN_STATUS_CLASS.live;

  const cardInfoProps: AuctionCardInfoProps = {
    product, auctionHref, displayBid, bidCount, hasCurrentBid, isEnded, isEndingSoon,
    remaining, resolvedBuyoutPrice, inWishlist, wishlistLoading, wishlistActions,
    countdownClass, mergedLabels, handleWishlist, handleNavigate,
  };

  return (
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
    >
      {renderAuctionCardHero({ product, auctionHref, currentSrc, hovered, images, imageIndex, hasVideo, isEnded, isEndingSoon, isSelected, selectable, mergedLabels, onSelect, setHovered, handleSelect })}
      <BaseListingCard.Info variant={baseVariant}>
        {baseVariant === "list" ? renderAuctionCardInfoList(cardInfoProps) : renderAuctionCardInfoGrid(cardInfoProps)}
      </BaseListingCard.Info>
    </BaseListingCard>
  );
}
