"use client"
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "../../../react/hooks/useLongPress";
import type { ProductItem } from "../../products";
import { MediaImage } from "../../media";
import { useWishlistToggle, type WishlistToggleActions } from "../../wishlist";
import { ROUTES } from "../../../next";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
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
  reserveNow: ACTIONS.PRE_ORDER["reserve-now"].label,
  addToCart: ACTIONS.PRODUCT["add-to-cart"].label,
  addToWishlist: ACTIONS.PRODUCT["add-to-wishlist"].label,
  removeFromWishlist: ACTIONS.PRODUCT["remove-from-wishlist"].label,
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
          <Span size="xs" weight="medium" className="inline-flex items-center rounded-full bg-cobalt px-2 py-0.5 text-white">
            {mergedLabels.preOrderBadge}
          </Span>
          {product.featured && (
            <Span size="xs" weight="medium" className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-white">
              {mergedLabels.featuredBadge}
            </Span>
          )}
        </Div>

        <Div className="absolute left-2 top-2 flex flex-col gap-1 pointer-events-none">
          {product.partOfBundleIds && product.partOfBundleIds.length > 0 && (
            <Span
              className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-bold text-white"
              title={product.partOfBundleTitles?.[0] ? `In bundle: ${product.partOfBundleTitles[0]}` : "In a bundle"}
            >
              Bundled
            </Span>
          )}
          {product.groupId && (
            <Span
              className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white"
              title={product.groupTitle ? `Part of set: ${product.groupTitle}` : "Part of a set"}
            >
              {product.isGroupParent ? "Set Parent" : "In Set"}
            </Span>
          )}
          {product.sublistingCategoryId && (
            <Span
              className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white"
              title="Has variants or sub-listings"
            >
              Has Variants
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
        {variant === "list" ? (
          /* ── Compact list layout ── */
          <>
            <Div className="flex items-start justify-between gap-2 min-w-0">
              <TextLink href={detailHref} className="min-w-0 flex-1">
                <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-medium text-zinc-900 dark:text-zinc-100`}>
                  {product.title}
                </Text>
              </TextLink>
              {wishlistActions && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`shrink-0 p-1 text-base leading-none ${inWishlist ? "text-primary" : "text-zinc-400"}`}
                  onClick={handleWishlist}
                  aria-label={inWishlist ? mergedLabels.removeFromWishlist : mergedLabels.addToWishlist}
                >
                  {inWishlist ? "♥" : "♡"}
                </Button>
              )}
            </Div>
            <Div className="flex items-center gap-2 flex-wrap">
              <Text className="text-sm font-bold text-primary">
                {formatCurrency(product.price, getDefaultCurrency())}
              </Text>
              {shipDate && <PreorderBadge shipDate={shipDate} />}
            </Div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="self-start text-xs mt-0.5"
              onClick={handleNavigate}
            >
              {mergedLabels.reserveNow}
            </Button>
          </>
        ) : (
          /* ── Full grid layout ── */
          <>
            <TextLink href={detailHref}>
              <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-medium text-zinc-900 dark:text-zinc-100`}>
                {product.title}
              </Text>
            </TextLink>
            {product.description ? (
              <RichText
                html={normalizeRichTextHtml(product.description)}
                proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                className={`${THEME_CONSTANTS.utilities.textClamp2} text-xs text-zinc-500 dark:text-zinc-400`}
              />
            ) : null}
            <Row justify="between" className="mt-1 gap-2">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(product.price, getDefaultCurrency())}
              </Text>
              {shipDate && <PreorderBadge shipDate={shipDate} />}
            </Row>
            <Row justify="between" className="mt-2 gap-2">
              <Button type="button" variant="primary" size="sm" className="flex-1 text-xs" onClick={handleNavigate}>
                {mergedLabels.reserveNow}
              </Button>
              {onAddToCart ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                >
                  {mergedLabels.addToCart}
                </Button>
              ) : null}
              {wishlistActions ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`text-base ${inWishlist ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}
                  onClick={handleWishlist}
                  aria-label={inWishlist ? mergedLabels.removeFromWishlist : mergedLabels.addToWishlist}
                >
                  {inWishlist ? "♥" : "♡"}
                </Button>
              ) : null}
            </Row>
          </>
        )}
      </BaseListingCard.Info>
    </BaseListingCard>
  );
}
