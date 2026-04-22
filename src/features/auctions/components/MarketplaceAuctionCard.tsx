"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gavel, Heart, Play, ShoppingBag, Star } from "lucide-react";
import { MediaImage } from "../../media";
import { useWishlistToggle, type WishlistToggleActions } from "../../wishlist";
import { useCountdown, type CountdownRemaining } from "../../../react";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils";
import {
  BaseListingCard,
  Button,
  Caption,
  Div,
  RichText,
  Row,
  Span,
  Text,
  TextLink,
} from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";

export interface MarketplaceAuctionCardData {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  mainImage?: string;
  images?: string[];
  video?: { url?: string; thumbnailUrl?: string };
  isAuction?: boolean;
  auctionEndDate?: string | Date;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  featured?: boolean;
  status?: string;
  slug?: string;
  buyNowPrice?: number;
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
  totalBids: (count: number) => `${count} bids`,
  placeBid: "Place bid",
  buyout: "Buyout",
  addToWishlist: "Add to wishlist",
  removeFromWishlist: "Remove from wishlist",
  videoLabel: "Video available",
};

function resolveHref(
  product: MarketplaceAuctionCardData,
  href?: string,
  hrefBuilder?: (product: MarketplaceAuctionCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(product);
  return ROUTES.PUBLIC.AUCTION_DETAIL(product.id);
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

  const handleNavigate = useCallback(() => {
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
    ? "bg-zinc-100 text-zinc-500"
    : isEndingSoon
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <BaseListingCard
      isSelected={isSelected}
      isDisabled={isEnded}
      variant={baseVariant}
      className={className}
    >
      <BaseListingCard.Hero
        aspect="square"
        variant={baseVariant}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <TextLink href={auctionHref} className="absolute inset-0 block">
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
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </Div>
        ) : null}

        {selectable ? (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={handleSelect}
            label={
              isSelected ? mergedLabels.deselectItem : mergedLabels.selectItem
            }
          />
        ) : null}

        <Div
          className={`absolute left-2 z-10 flex flex-col gap-1 ${product.featured ? "top-8" : "top-2"}`}
        >
          {!isEnded ? (
            <Span className="rounded-full bg-rose-600/90 px-2 py-0.5 text-xs font-bold text-white">
              {mergedLabels.liveBadge}
            </Span>
          ) : null}
          {isEndingSoon ? (
            <Span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-bold text-white">
              {mergedLabels.endingSoon}
            </Span>
          ) : null}
          {isEnded ? (
            <Span className="rounded-full bg-zinc-600/90 px-2 py-0.5 text-xs font-bold text-white">
              {mergedLabels.ended}
            </Span>
          ) : null}
          {product.status === "sold" ? (
            <Span className="rounded-full bg-zinc-700/90 px-2 py-0.5 text-xs font-bold text-white">
              {mergedLabels.sold}
            </Span>
          ) : null}
        </Div>

        <Div className="pointer-events-none absolute bottom-2 right-2 z-10">
          <Span className="inline-flex items-center gap-1 rounded-full bg-amber-600/90 px-2 py-0.5 text-xs font-semibold text-white">
            <Gavel className="h-3 w-3" />
            {mergedLabels.typeBadge}
          </Span>
        </Div>
      </BaseListingCard.Hero>

      <BaseListingCard.Info variant={baseVariant}>
        <Div className="flex items-start gap-2">
          <TextLink
            href={auctionHref}
            className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-900 transition-colors hover:text-primary"
          >
            {product.title}
          </TextLink>
          {wishlistActions ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleWishlist}
              disabled={wishlistLoading}
              aria-label={
                inWishlist
                  ? mergedLabels.removeFromWishlist
                  : mergedLabels.addToWishlist
              }
              className="-mt-0.5 rounded-full p-1"
            >
              <Heart
                className={`h-4 w-4 ${inWishlist ? "fill-rose-500 text-rose-500" : "text-zinc-400"}`}
              />
            </Button>
          ) : null}
        </Div>

        {variant === "list" && product.description ? (
          <RichText
            html={normalizeRichTextHtml(product.description)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className="line-clamp-2 text-xs text-zinc-500"
          />
        ) : null}

        <Div>
          <Caption>
            {hasCurrentBid ? mergedLabels.currentBid : mergedLabels.startingBid}
          </Caption>
          <Text className="text-base font-bold leading-none text-primary">
            {formatCurrency(displayBid, product.currency)}
          </Text>
        </Div>

        <Row wrap justify="between" gap="sm" className="gap-x-2 gap-y-1">
          <Div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${countdownClass}`}
          >
            <Clock className="h-3 w-3" />
            <Span>{formatCountdownLabel(remaining, mergedLabels.ended)}</Span>
          </Div>
          <Caption>{mergedLabels.totalBids(bidCount)}</Caption>
        </Row>

        <Row wrap gap="xs" className="mt-auto">
          {isEnded ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1 cursor-not-allowed gap-1 px-2 text-xs opacity-60"
              disabled
            >
              <Span>{mergedLabels.ended}</Span>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="warning"
                size="sm"
                className="flex-1 gap-1 px-2 text-xs"
                onClick={handleNavigate}
              >
                <Gavel className="h-3 w-3" />
                <Span>{mergedLabels.placeBid}</Span>
              </Button>
              {resolvedBuyoutPrice ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="flex-1 gap-1 px-2 text-xs"
                  onClick={handleNavigate}
                >
                  <ShoppingBag className="h-3 w-3" />
                  <Span>{mergedLabels.buyout}</Span>
                </Button>
              ) : null}
            </>
          )}
        </Row>
      </BaseListingCard.Info>
    </BaseListingCard>
  );
}
