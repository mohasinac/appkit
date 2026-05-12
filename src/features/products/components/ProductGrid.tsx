import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import { Button, Div, Grid, Row, Span, Text } from "../../../ui";
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
    ? { label: "Auction", cls: "bg-amber-500 text-white" }
    : isPreOrder
      ? { label: "Pre-Order", cls: "bg-violet-600 text-white" }
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
      <Div className="relative overflow-hidden bg-zinc-100 dark:bg-slate-800 aspect-square">
        {product.mainImage ? (
          <MediaImage
            src={product.mainImage}
            alt={product.title}
            size="card"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-slate-800 dark:to-slate-700">
            <Span className="text-4xl opacity-30">🛍️</Span>
          </Div>
        )}

        {/* Top-left: hover/selection checkbox + badges */}
        <Div className="absolute left-2 top-2 flex flex-col gap-1">
          {/* Checkbox — always rendered; hidden until hover or selection active */}
          {onSelect && (
            <Div
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(product.id); }}
              aria-label={isSelected ? "Deselect" : "Select"}
              className={[
                "flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm transition-all duration-150 cursor-pointer",
                isSelected
                  ? "bg-primary border-primary text-white opacity-100"
                  : "bg-white/90 dark:bg-slate-800/90 border-zinc-300 dark:border-slate-500",
                selectionMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              ].join(" ")}
            >
              {isSelected && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </Div>
          )}
          {!selectionMode && !isSelected && (
            <>
              {discount && (
                <Span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  -{discount}%
                </Span>
              )}
              {typeBadge && (
                <Span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${typeBadge.cls}`}>
                  {typeBadge.label}
                </Span>
              )}
            </>
          )}
        </Div>

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
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-white/90 dark:bg-slate-800/90 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800",
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
      <Div className="flex flex-1 flex-col p-3 pt-2.5">
        <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-semibold text-zinc-900 dark:text-white leading-snug`}>
          {product.title}
        </Text>

        {/* Category + brand chips */}
        {(product.categoryName || product.brand) && (
          <Row className="mt-1 gap-1 flex-wrap">
            {product.categoryName && (
              <Span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[90px]">
                {product.categoryName}
              </Span>
            )}
            {product.brand && (
              <Span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[80px]">
                {product.brand}
              </Span>
            )}
          </Row>
        )}

        {(() => {
          const seller = safeDisplayName(product.storeName, "");
          return seller ? (
            <Text className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
              by {seller}
            </Text>
          ) : null;
        })()}

        {product.rating !== undefined && (
          <Row className="mt-1 gap-1 items-center">
            <Span className="text-[11px] text-amber-400">★</Span>
            <Span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {product.rating.toFixed(1)}
              {product.reviewCount ? ` (${product.reviewCount})` : ""}
            </Span>
          </Row>
        )}

        {/* Price row */}
        <Div className="mt-auto pt-2">
          <Row className="items-baseline gap-2">
            <Span className="text-base font-bold text-primary dark:text-primary-400">
              {formatCurrency(product.price, getDefaultCurrency())}
            </Span>
            {product.originalPrice && product.originalPrice > product.price && (
              <Span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
                {formatCurrency(product.originalPrice, getDefaultCurrency())}
              </Span>
            )}
          </Row>

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
            <Div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: onBuyNow && onAddToCart ? "1fr 1fr" : "1fr" }}>
              {onBuyNow && (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onBuyNow(product);
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-semibold text-white hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 btn-glow"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAddToCart(product);
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl border-2 border-primary/30 py-2 text-xs font-semibold text-primary hover:bg-primary/5 hover:border-primary/50 active:scale-[0.97] transition-all duration-150 dark:text-primary-400 dark:border-primary-400/30 dark:hover:bg-primary/10"
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
      <Div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-neutral-100 dark:bg-zinc-800">
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
          <Span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
            {[product.categoryName, product.brand].filter(Boolean).join(" · ")}
          </Span>
        )}
        <Div className="flex items-center gap-2 flex-wrap mt-0.5">
          <Span className="text-sm font-semibold text-primary">
            {formatCurrency(product.price, getDefaultCurrency())}
          </Span>
          {discount && (
            <Span className="text-[10px] font-bold text-rose-500">-{discount}%</Span>
          )}
          {product.rating !== undefined && (
            <Span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
              <Span className="text-amber-400">★</Span>
              {product.rating.toFixed(1)}
            </Span>
          )}
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
          className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-base leading-none ${isWishlisted ? "text-rose-500" : "text-zinc-300 dark:text-zinc-600 hover:text-rose-400"}`}
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
            const ctx: ProductCardContext<T> = {
              onClick: onProductClick,
              onWishlistToggle,
              onAddToCart,
              onBuyNow,
              isWishlisted: wishlistedIds?.has(p.id) ?? false,
            };
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
          const ctx: ProductCardContext<T> = {
            onClick: onProductClick,
            onWishlistToggle,
            onAddToCart,
            onBuyNow,
            isWishlisted: wishlistedIds?.has(p.id) ?? false,
          };
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
            <Text className="py-12 text-center text-sm text-neutral-500">
              {emptyLabel}
            </Text>
          ))
        : renderItems()}
      {resolvedFooter}
    </Div>
  );
}
