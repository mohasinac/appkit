"use client"
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ProductItem } from "../../products";
import { MediaImage } from "../../media";
import { useWishlistToggle, type WishlistToggleActions } from "../../wishlist";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils";
import {
  BaseListingCard,
  Button,
  Div,
  Row,
  Span,
  Text,
  TextLink,
} from "../../../ui";
import { PreorderBadge } from "./PreorderCard";

export type MarketplacePreorderCardData = ProductItem;

export interface MarketplacePreorderCardLabels {
  preOrderBadge?: string;
  reserveNow?: string;
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
  wishlistActions?: WishlistToggleActions;
  labels?: MarketplacePreorderCardLabels;
}

const DEFAULT_LABELS: Required<MarketplacePreorderCardLabels> = {
  preOrderBadge: "Pre-order",
  reserveNow: "Reserve now",
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
  return ROUTES.PUBLIC.PRE_ORDER_DETAIL(product.id);
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
  wishlistActions,
  labels,
}: MarketplacePreorderCardProps) {
  const router = useRouter();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const detailHref = resolveHref(product, href, hrefBuilder);
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

        <Div className="absolute right-2 top-2">
          <Span className="inline-flex items-center rounded-full bg-cobalt px-2 py-0.5 text-xs font-medium text-white">
            {mergedLabels.preOrderBadge}
          </Span>
        </Div>

        {selectable && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(event) => {
              event.stopPropagation();
              onSelect?.(product.id, !isSelected);
            }}
          />
        )}
      </BaseListingCard.Hero>

      <BaseListingCard.Info variant={variant}>
        <TextLink href={detailHref}>
          <Text className="line-clamp-2 text-sm font-medium text-zinc-900">
            {product.title}
          </Text>
        </TextLink>

        <Row justify="between" className="mt-1 gap-2">
          <Text className="text-sm font-semibold text-zinc-900">
            {formatCurrency(product.price, product.currency)}
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
