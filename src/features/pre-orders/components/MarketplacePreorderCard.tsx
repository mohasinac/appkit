"use client"
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "../../../react/hooks/useLongPress";
import type { ProductItem } from "../../products";
import { MediaImage } from "../../media";
import { useWishlistToggle, type WishlistToggleActions } from "../../wishlist";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  BaseListingCard,
  Button,
  Div,
  RichText,
  Row,
  Span,
  Text,
  TextLink,
} from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { THEME_CONSTANTS } from "../../../tokens";
import { PreorderBadge } from "./PreorderCard";

export type MarketplacePreorderCardData = ProductItem;

export interface MarketplacePreorderCardLabels {
  preOrderBadge?: string;
  featuredBadge?: string;
  reserveNow?: string;
  addToCart?: string;
  addToWishlist?: string;
  removeFromWishlist?: string;
}

export interface MarketplacePreorderCardProps {
  product: MarketplacePreorderCardData;
  className?: string;
  variant?: "grid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  inWishlist?: boolean;
  href?: string;
  hrefBuilder?: (product: MarketplacePreorderCardData) => string;
  onNavigate?: (href: string) => void;
  onAddToCart?: (product: MarketplacePreorderCardData) => void;
  wishlistActions?: WishlistToggleActions;
  labels?: MarketplacePreorderCardLabels;
}

const DEFAULT_LABELS: Required<MarketplacePreorderCardLabels> = {
  preOrderBadge: "Pre-order",
  featuredBadge: "Featured",
  reserveNow: "Reserve now",
  addToCart: "Add to Cart",
  addToWishlist: "Add to wishlist",
  removeFromWishlist: "Remove from wishlist",
};

function resolveHref(
  product: MarketplacePreorderCardData,
  href?: string,
  hrefBuilder?: (product: MarketplacePreorderCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(product);
  return ROUTES.PUBLIC.PRE_ORDER_DETAIL(product.slug ?? product.id);
}

export function MarketplacePreorderCard({
  product,
  className = "",
  variant = "grid",
  selectable = false,
  isSelected = false,
  onSelect,
  inWishlist: initialInWishlist = false,
  href,
  hrefBuilder,
  onNavigate,
  onAddToCart,
  wishlistActions,
  labels,
}: MarketplacePreorderCardProps) {
  const router = useRouter();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const detailHref = resolveHref(product, href, hrefBuilder);
  const longPress = useLongPress(() => onSelect?.(product.id, !isSelected));
  const deliveryDate = product.preOrderDeliveryDate;
  const shipDate =
    deliveryDate instanceof Date ? deliveryDate.toISOString() : deliveryDate;
  const { inWishlist, toggle } = useWishlistToggle(
    product.id,
    initialInWishlist,
    wishlistActions,
  );

  const handleNavigate = useCallback(() => {
    if (onNavigate) {
      onNavigate(detailHref);
      return;
    }
    router.push(detailHref);
  }, [detailHref, onNavigate, router]);

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

  return (
    <BaseListingCard
      isSelected={isSelected}
      variant={variant}
      className={className}
      onMouseDown={!isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={!isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={!isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={!isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={!isSelected ? longPress.onTouchEnd : undefined}
    >
      <BaseListingCard.Hero aspect="square" variant={variant}>
        <TextLink href={detailHref} className="absolute inset-0 block">
          <MediaImage
            src={product.mainImage}
            alt={product.title}
            size="card"
            fallback="Product image"
          />
        </TextLink>

        <Div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <Span className="inline-flex items-center rounded-full bg-cobalt px-2 py-0.5 text-xs font-medium text-white">
            {mergedLabels.preOrderBadge}
          </Span>
          {product.featured && (
            <Span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
              {mergedLabels.featuredBadge}
            </Span>
          )}
        </Div>

        {onSelect && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(event) => {
              event.stopPropagation();
              onSelect(product.id, !isSelected);
            }}
            className={
              selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
            }
          />
        )}
      </BaseListingCard.Hero>

      <BaseListingCard.Info variant={variant}>
        <TextLink href={detailHref}>
          <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-medium text-zinc-900`}>
            {product.title}
          </Text>
        </TextLink>
        {product.description ? (
          <RichText
            html={normalizeRichTextHtml(product.description)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className={`${THEME_CONSTANTS.utilities.textClamp2} text-xs text-zinc-500`}
          />
        ) : null}

        <Row justify="between" className="mt-1 gap-2">
          <Text className="text-sm font-semibold text-zinc-900">
            {formatCurrency(product.price, getDefaultCurrency())}
          </Text>
          {shipDate && <PreorderBadge shipDate={shipDate} />}
        </Row>

        <Row justify="between" className="mt-2 gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleNavigate}
          >
            {mergedLabels.reserveNow}
          </Button>
          {onAddToCart ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              {mergedLabels.addToCart}
            </Button>
          ) : null}
          {wishlistActions ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`text-base ${inWishlist ? "text-primary" : "text-zinc-500"}`}
              onClick={handleWishlist}
              aria-label={
                inWishlist
                  ? mergedLabels.removeFromWishlist
                  : mergedLabels.addToWishlist
              }
            >
              {inWishlist ? "♥" : "♡"}
            </Button>
          ) : null}
        </Row>
      </BaseListingCard.Info>
    </BaseListingCard>
  );
}
