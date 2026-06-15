"use client";

import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import { BaseListingCard, Button, Div, Grid, Row, Span, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { THEME_CONSTANTS } from "../../../tokens";
import type { ViewMode } from "../../../ui";
import type { ProductItem } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { safeDisplayName } from "../../../security";
import { useLongPress } from "../../../react/hooks/useLongPress";
import { FeatureBadgeList } from "./FeatureBadge";
import { useProductFeatures } from "./ProductFeaturesContext";
import { PRODUCT_FEATURE_CARD_MAX_VISIBLE } from "../constants/product-features.constants";
import { isAuctionListing, isPreOrderListing } from "../utils/listing-type";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_BADGE_AUCTION = "bg-warning-surface text-white";
const CLS_BADGE_PREORDER = "bg-violet-600 text-white";
const CLS_BADGE_NEW = "rounded-full bg-error-surface px-2 py-0.5 text-[10px] text-white shadow-sm";
const CLS_BADGE_SALE = "rounded-full bg-success-surface px-2 py-0.5 text-[10px] font-bold text-white shadow-sm";
const CLS_BADGE_TRENDING = "rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm";
const CLS_BADGE_LIMITED = "rounded-full bg-info-surface px-2 py-0.5 text-[10px] font-bold text-white shadow-sm";
const CLS_HEART_ACTIVE = "bg-error-surface text-white hover:bg-error-surface";
const CLS_HEART_IDLE = "bg-white/90 dark:bg-slate-800/90 text-zinc-500 dark:text-zinc-400 hover:text-error hover:bg-white dark:hover:bg-slate-800";
const CLS_STAR = "text-[11px] text-warning";
const CLS_DISCOUNT_TEXT = "mt-1 text-[11px] font-semibold text-error";
const CLS_DISCOUNT_TEXT_BARE = "text-[10px] text-error";
const CLS_STAR_BARE = "text-warning";
const CLS_BID_TEXT = "text-[11px] text-error";
const CLS_HEART_ROSE_ACTIVE = "text-error";
const CLS_HEART_ROSE_IDLE = "text-zinc-300 dark:text-zinc-600 hover:text-error";

// --- ProductCard --------------------------------------------------------------

interface ProductCardProps<T extends ProductItem = ProductItem> {
  product: T;
  /** When provided, wraps the card in a Link for navigation. */
  href?: string;
  onClick?: (product: T) => void;
  onAddToWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
  onAddToCart?: (product: T) => void;
  onBuyNow?: (product: T) => void;
  className?: string;
  /** Bulk selection */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function ProductCard<T extends ProductItem = ProductItem>({
  product,
  href,
  onClick,
  onAddToWishlist,
  isWishlisted,
  onAddToCart,
  onBuyNow,
  className = "",
  selectionMode = false,
  isSelected = false,
  onSelect,
}: ProductCardProps<T>) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : null;

  // SB1-G — canonical accessors that handle the legacy boolean fallback.
  const isAuction = isAuctionListing(product);
  const isPreOrder = isPreOrderListing(product);

  const typeBadge = isAuction
    ? { label: "Auction", cls: CLS_BADGE_AUCTION }
    : isPreOrder
      ? { label: "Pre-Order", cls: CLS_BADGE_PREORDER }
      : null;

  const longPress = useLongPress(() => onSelect?.(product.id));

  const featuresList = useProductFeatures();

  const handleCardClick = selectionMode
    ? (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onSelect?.(product.id); }
    : onClick && !href ? () => onClick(product) : undefined;

  const cardBody = (
    <Div
      role={selectionMode ? "checkbox" : onClick ? "button" : undefined}
      aria-checked={selectionMode ? isSelected : undefined}
      tabIndex={selectionMode || (onClick && !href) ? 0 : undefined}
      onKeyDown={
        selectionMode
          ? (e) => (e.key === "Enter" || e.key === " ") && onSelect?.(product.id)
          : onClick && !href
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(product)
          : undefined
      }
      onClick={handleCardClick}
      {...(!selectionMode ? longPress : {})}
      className={[
        "group relative flex h-full flex-col overflow-hidden",
        "rounded-2xl border bg-white",
        "shadow-sm transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-zinc-200/80 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        "dark:bg-slate-900",
        isSelected ? "dark:border-primary dark:ring-primary/30" : "dark:border-slate-700/60",
        selectionMode || onClick || href ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Image area */}
      <Div className={`relative ${__O.hidden} bg-zinc-100 dark:bg-slate-800 aspect-square`}>
        {product.mainImage ? (
          <MediaImage
            src={product.mainImage}
            alt={product.title}
            size="card"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-slate-800 dark:to-slate-700">
            <Span className="opacity-30" size="4xl">🛍️</Span>
          </Div>
        )}

        {/* Checkbox — always rendered; hidden until hover or selection active */}
        {onSelect && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(e) => { e.preventDefault(); onSelect(product.id); }}
            label={isSelected ? "Deselect" : "Select"}
            position="top-2 left-2"
            className={selectionMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
          />
        )}

        {/* Top-left: badges (offset right when checkbox is shown) */}
        <Div className={`absolute top-2 flex flex-col gap-1 ${onSelect ? "left-10" : "left-2"}`}>
          {!selectionMode && !isSelected && (
            <>
              {discount && (
                <Span weight="bold" className={CLS_BADGE_NEW}>
                  -{discount}%
                </Span>
              )}
              {typeBadge && (
                <Span weight="bold" className={`rounded-full px-2 py-0.5 text-[10px] shadow-sm ${typeBadge.cls}`}>
                  {typeBadge.label}
                </Span>
              )}
              {/* SB7-A — "In bundle" pill when this product is a bundle member.
                  Badge is visual only; the bundle link lives on the product
                  detail page (SB7-B) where it has room to be a real Link
                  without nesting inside the card's outer Link. */}
              {product.partOfBundleIds && product.partOfBundleIds.length > 0 && (
                <Span
                  className={CLS_BADGE_SALE}
                  title={
                    product.partOfBundleTitles && product.partOfBundleTitles.length > 0
                      ? `In bundle: ${product.partOfBundleTitles[0]}`
                      : "In a bundle"
                  }
                >
                  Bundled
                </Span>
              )}
              {/* "Set" pill — product is part of a curated group/set */}
              {product.groupId && (
                <Span
                  className={CLS_BADGE_TRENDING}
                  title={product.groupTitle ? `Part of set: ${product.groupTitle}` : "Part of a set"}
                >
                  {product.isGroupParent ? "Set Parent" : "In Set"}
                </Span>
              )}
              {/* "Variants" pill — product has sub-listings/variants */}
              {product.sublistingCategoryId && (
                <Span
                  className={CLS_BADGE_LIMITED}
                  title="Has variants or sub-listings"
                >
                  Has Variants
                </Span>
              )}
            </>
          )}
        </Div>

        {/* W1-45 — group/sublisting icon overlay (bottom-right) */}
        <BaseListingCard.IconOverlay
          groupIcon={product.groupIcon}
          sublistingIcon={product.sublistingIcon}
          position="bottom-2 right-2"
        />

        {/* Wishlist button — always visible */}
        {onAddToWishlist && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddToWishlist(product.id);
            }}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={[
              "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm",
              "transition-all duration-150",
              isWishlisted
                ? CLS_HEART_ACTIVE
                : CLS_HEART_IDLE,
            ].join(" ")}
          >
            <svg
              className="h-4 w-4"
              fill={isWishlisted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </Button>
        )}
      </Div>

      {/* Content area */}
      <Div className={`flex flex-1 flex-col ${__P.p3} pt-2.5`}>
        <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-semibold text-zinc-900 dark:text-white leading-snug`}>
          {product.title}
        </Text>

        {/* Category + brand chips — W1-46: show up to 3 categories with "+N more" overflow */}
        {(() => {
          const categories = Array.isArray(product.categoryNames)
            ? product.categoryNames.filter(Boolean)
            : product.categoryName
              ? [product.categoryName]
              : [];
          if (!categories.length && !product.brand) return null;
          const MAX_CHIPS = 3;
          const visible = categories.slice(0, MAX_CHIPS);
          const overflow = Math.max(0, categories.length - MAX_CHIPS);
          return (
            <Row className="mt-1" gap="xs" wrap>
              {visible.map((name) => (
                <Span
                  key={name}
                  className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]"
                >
                  <svg className="h-2.5 w-2.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  {name}
                </Span>
              ))}
              {overflow > 0 && (
                <Span
                  weight="medium"
                  className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400"
                  title={categories.slice(MAX_CHIPS).join(", ")}
                >
                  +{overflow}
                </Span>
              )}
              {product.brand && (
                <Span className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 truncate max-w-[90px]">
                  <svg className="h-2.5 w-2.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {product.brand}
                </Span>
              )}
            </Row>
          );
        })()}

        {(() => {
          const seller = safeDisplayName(product.storeName, "");
          return seller ? (
            <Text className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-400 truncate">
              by {seller}
            </Text>
          ) : null;
        })()}

        {product.rating !== undefined && (
          <Row className="mt-1" gap="xs">
            <Span className={CLS_STAR}>★</Span>
            <Span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {product.rating.toFixed(1)}
              {product.reviewCount ? ` (${product.reviewCount})` : ""}
            </Span>
          </Row>
        )}

        {/* Price row */}
        <Div className="mt-auto pt-2">
          <Row align="baseline" gap="sm">
            <Span size="base" weight="bold" className="text-primary dark:text-primary-400">
              {formatCurrency(product.price, getDefaultCurrency())}
            </Span>
            {product.originalPrice && product.originalPrice > product.price && (
              <Span size="xs" className="text-zinc-400 line-through dark:text-zinc-400">
                {formatCurrency(product.originalPrice, getDefaultCurrency())}
              </Span>
            )}
          </Row>

          {(() => {
            const stock =
              product.stockCount ?? product.stockQuantity ?? product.availableQuantity;
            if (stock === undefined || isAuction) return null;
            if (stock <= 0) {
              return (
                <Text className={CLS_DISCOUNT_TEXT}>
                  Out of stock
                </Text>
              );
            }
            const low = stock <= 5;
            return (
              <Text
                className={`mt-1 text-[11px] font-medium ${
                  low
                    ? "text-warning"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {low ? `Only ${stock} left` : `${stock} in stock`}
              </Text>
            );
          })()}

          {/* Feature badges (FI6) — gated on ProductFeaturesProvider */}
          {featuresList && product.features && product.features.length > 0 && (
            <FeatureBadgeList
              productFeatureIds={product.features}
              features={featuresList}
              maxVisible={PRODUCT_FEATURE_CARD_MAX_VISIBLE}
              className="mt-2"
            />
          )}

          {/* Action buttons */}
          {(onAddToCart || onBuyNow) && (
            // audit-inline-style-ok: runtime grid template
            <Div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: onBuyNow && onAddToCart ? "1fr 1fr" : "1fr" }}>
              {onBuyNow && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onBuyNow(product);
                  }}
                  className="flex items-center justify-center gap-1 text-xs btn-glow"
                >
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Buy Now
                </Button>
              )}
              {onAddToCart && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAddToCart(product);
                  }}
                  className="flex items-center justify-center gap-1 text-xs"
                >
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 3H3m4 10v7a1 1 0 001 1h8a1 1 0 001-1v-7M9 21h6" />
                  </svg>
                  Cart
                </Button>
              )}
            </Div>
          )}
        </Div>
      </Div>
    </Div>
  );

  if (href && !selectionMode) {
    return (
      <Link href={href} className="block h-full">
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}

// --- ProductCardContext (passed to renderCard slot) ---------------------------

export interface ProductCardContext<T extends ProductItem = ProductItem> {
  onClick?: (product: T) => void;
  onWishlistToggle?: (productId: string) => void;
  onAddToCart?: (product: T) => void;
  onBuyNow?: (product: T) => void;
  isWishlisted: boolean;
}

// --- ProductGrid --------------------------------------------------------------

interface ProductGridProps<T extends ProductItem = ProductItem> {
  products: T[];
  /**
   * Custom card renderer. When provided, replaces the built-in `ProductCard`.
   * Receives the item and a context object with click/wishlist handlers.
   *
   * @example
   * <ProductGrid<ProductDocument>
   *   products={docs}
   *   renderCard={(p, ctx) => (
   *     <MyRichCard product={p} onWishlist={ctx.onWishlistToggle} />
   *   )}
   * />
   */
  renderCard?: (product: T, ctx: ProductCardContext<T>) => React.ReactNode;
  onProductClick?: (product: T) => void;
  /** When provided, each card is wrapped in a Link using this href generator. */
  getProductHref?: (product: T) => string;
  onWishlistToggle?: (productId: string) => void;
  onAddToCart?: (product: T) => void;
  onBuyNow?: (product: T) => void;
  wishlistedIds?: Set<string>;
  /** Text shown when the list is empty and no `emptySlot` is provided. */
  emptyLabel?: string;
  /** Replaces the default empty-state paragraph. */
  emptySlot?: React.ReactNode;
  /** Rendered above the grid (e.g. filter bar, heading). */
  headerSlot?: React.ReactNode;
  /** Rendered below the grid (e.g. pagination). */
  footerSlot?: React.ReactNode;
  className?: string;
  /**
   * Render-prop slot overrides from a `FeatureExtension`.
   * When both `slots` and the explicit `renderCard`/`headerSlot` props are
   * provided, the explicit props take precedence.
   *
   * @example
   * <ProductGrid products={products} {...extension.slots} />
   * // or
   * <ProductGrid products={products} slots={extension.slots} />
   */
  slots?: LayoutSlots<T>;
  total?: number;
  currentPage?: number;
  totalPages?: number;
  /**
   * Layout mode for the product listing.
   * - `"card"`  — fixed breakpoint columns (2→3→4→5) per Section 34 spec
   * - `"fluid"` — CSS auto-fill columns, min 220 px each
   * - `"list"`  — compact horizontal rows (thumbnail + title + price)
   * @default "card"
   */
  view?: ViewMode;
  /** Bulk selection */
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

// --- Grid class maps ---------------------------------------------------------

const GRID_CLASSES: Record<"card", string> = {
  card: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6",
};

// --- ProductListRow (list-mode row) ------------------------------------------

interface ProductListRowProps<T extends ProductItem = ProductItem> {
  product: T;
  onClick?: (product: T) => void;
  onAddToWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

function ProductListRow<T extends ProductItem = ProductItem>({
  product,
  onClick,
  onAddToWishlist,
  isWishlisted,
}: ProductListRowProps<T>) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : null;

  return (
    <Div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(product)
          : undefined
      }
      onClick={onClick ? () => onClick(product) : undefined}
      className={[
        "flex items-center gap-3 p-2 sm:p-3",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors",
        onClick ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Thumbnail */}
      <Div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg ${__O.hidden} bg-neutral-100 dark:bg-zinc-800`}>
        {product.mainImage ? (
          <MediaImage
            src={product.mainImage}
            alt={product.title}
            size="thumbnail"
          />
        ) : (
          <Div className="w-full h-full bg-neutral-200 dark:bg-zinc-700" />
        )}
      </Div>

      {/* Content */}
      <Div className="flex flex-1 flex-col min-w-0 gap-0.5">
        <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-medium text-zinc-900 dark:text-zinc-100`}>
          {product.title}
        </Text>
        {(product.categoryName || product.brand) && (
          <Span className="text-[11px] text-zinc-400 dark:text-zinc-400 truncate">
            {[product.categoryName, product.brand].filter(Boolean).join(" · ")}
          </Span>
        )}
        <Div className="flex items-center gap-2 flex-wrap mt-0.5">
          <Span size="sm" weight="semibold" className="text-primary">
            {formatCurrency(product.price, getDefaultCurrency())}
          </Span>
          {discount && (
            <Span weight="bold" className={CLS_DISCOUNT_TEXT_BARE}>-{discount}%</Span>
          )}
          {product.rating !== undefined && (
            <Span className="text-[11px] text-zinc-400 dark:text-zinc-400 flex items-center gap-0.5">
              <Span className={CLS_STAR_BARE}>★</Span>
              {product.rating.toFixed(1)}
            </Span>
          )}
          {(() => {
            const stock =
              product.stockCount ?? product.stockQuantity ?? product.availableQuantity;
            if (stock === undefined) return null;
            if (stock <= 0) {
              return (
                <Span weight="semibold" className={CLS_BID_TEXT}>
                  Out of stock
                </Span>
              );
            }
            const low = stock <= 5;
            return (
              <Span
                weight="medium"
                className={`text-[11px] ${
                  low
                    ? "text-warning"
                    : "text-zinc-400 dark:text-zinc-400"
                }`}
              >
                {low ? `Only ${stock} left` : `${stock} in stock`}
              </Span>
            );
          })()}
        </Div>
      </Div>

      {/* Wishlist action */}
      {onAddToWishlist && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAddToWishlist(product.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-base leading-none ${isWishlisted ? CLS_HEART_ROSE_ACTIVE : CLS_HEART_ROSE_IDLE}`}
        >
          {isWishlisted ? "♥" : "♡"}
        </Button>
      )}
    </Div>
  );
}

function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  // drop any href that would navigate to a literal "/undefined" segment
  if (href.includes("/undefined") || href.includes("/null")) return undefined;
  return href;
}

export function ProductGrid<T extends ProductItem = ProductItem>({
  products,
  renderCard,
  onProductClick,
  getProductHref,
  onWishlistToggle,
  onAddToCart,
  onBuyNow,
  wishlistedIds,
  emptyLabel = "No products found",
  emptySlot,
  headerSlot,
  footerSlot,
  className = "",
  slots,
  total = 0,
  currentPage = 1,
  totalPages = 1,
  view = "card",
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: ProductGridProps<T>) {
  const isEmpty = products.length === 0;

  // Slot resolution: explicit props win over `slots` object
  const resolvedHeader =
    headerSlot ??
    (slots?.renderHeader
      ? (slots.renderHeader({ total }) as React.ReactNode)
      : null);
  const resolvedFooter =
    footerSlot ??
    (slots?.renderFooter
      ? (slots.renderFooter({
          page: currentPage,
          totalPages,
        }) as React.ReactNode)
      : null);
  const resolvedEmpty =
    emptySlot ??
    (slots?.renderEmptyState
      ? (slots.renderEmptyState() as React.ReactNode)
      : null);

  function buildProductCardContext(p: T): ProductCardContext<T> {
    return {
      onClick: onProductClick,
      onWishlistToggle,
      onAddToCart,
      onBuyNow,
      isWishlisted: wishlistedIds?.has(p.id) ?? false,
    };
  }

  const renderItems = () => {
    if (view === "list") {
      return (
        <Div
          className={`flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 ${className}`}
        >
          {products.map((p) => (
            <ProductListRow<T>
              key={p.id}
              product={p}
              onClick={onProductClick}
              onAddToWishlist={onWishlistToggle}
              isWishlisted={wishlistedIds?.has(p.id) ?? false}
            />
          ))}
        </Div>
      );
    }

    if (view === "fluid") {
      return (
        <Grid cols="productCardsCompact" className={className}>
          {products.map((p, i) => {
            const ctx = buildProductCardContext(p);
            const cardRenderer = renderCard ?? slots?.renderCard;
            return cardRenderer ? (
              <React.Fragment key={p.id}>
                {cardRenderer === renderCard
                  ? (renderCard as NonNullable<typeof renderCard>)(p, ctx)
                  : (slots!.renderCard!(p, i) as React.ReactNode)}
              </React.Fragment>
            ) : (
              <ProductCard<T>
                key={p.id}
                product={p}
                href={safeHref(getProductHref ? getProductHref(p) : undefined)}
                onClick={onProductClick}
                onAddToWishlist={onWishlistToggle}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                isWishlisted={ctx.isWishlisted}
                selectionMode={selectionMode}
                isSelected={selectedIds?.has(p.id) ?? false}
                onSelect={onToggleSelect}
              />
            );
          })}
        </Grid>
      );
    }

    const gridClass = GRID_CLASSES.card;
    return (
      <Div className={`${gridClass} ${className}`}>
        {products.map((p, i) => {
          const ctx = buildProductCardContext(p);
          const cardRenderer = renderCard ?? slots?.renderCard;
          return cardRenderer ? (
            <React.Fragment key={p.id}>
              {cardRenderer === renderCard
                ? (renderCard as NonNullable<typeof renderCard>)(p, ctx)
                : (slots!.renderCard!(p, i) as React.ReactNode)}
            </React.Fragment>
          ) : (
            <ProductCard<T>
              key={p.id}
              product={p}
              href={safeHref(getProductHref ? getProductHref(p) : undefined)}
              onClick={onProductClick}
              onAddToWishlist={onWishlistToggle}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
              isWishlisted={ctx.isWishlisted}
              selectionMode={selectionMode}
              isSelected={selectedIds?.has(p.id) ?? false}
              onSelect={onToggleSelect}
            />
          );
        })}
      </Div>
    );
  };

  return (
    <Div>
      {resolvedHeader}
      {isEmpty
        ? (resolvedEmpty ?? (
            <Text className="py-12 text-zinc-500 dark:text-zinc-400" size="sm" align="center">
              {emptyLabel}
            </Text>
          ))
        : renderItems()}
      {resolvedFooter}
    </Div>
  );
}
