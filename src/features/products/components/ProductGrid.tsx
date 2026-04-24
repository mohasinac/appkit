import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import { Button, Div, Grid, RichText, Row, Span, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import type { ViewMode } from "../../../ui";
import type { ProductItem } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultCurrency, getDefaultCurrencySymbol } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";

// --- ProductCard --------------------------------------------------------------

interface ProductCardProps<T extends ProductItem = ProductItem> {
  product: T;
  /** When provided, wraps the card in a Link for navigation. */
  href?: string;
  onClick?: (product: T) => void;
  onAddToWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
  className?: string;
}

export function ProductCard<T extends ProductItem = ProductItem>({
  product,
  href,
  onClick,
  onAddToWishlist,
  isWishlisted,
  className = "",
}: ProductCardProps<T>) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : null;

  const cardBody = (
    <Div
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !href ? 0 : undefined}
      onKeyDown={
        onClick && !href
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(product)
          : undefined
      }
      onClick={onClick && !href ? () => onClick(product) : undefined}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${onClick || href ? "cursor-pointer" : ""} ${className}`}
    >
      <Div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-slate-800">
        {product.mainImage ? (
          <Div
            role="img"
            aria-label={product.title}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${product.mainImage})` }}
          />
        ) : (
          <Div className="h-full w-full bg-neutral-200 dark:bg-slate-700" />
        )}
        {discount && (
          <Span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </Span>
        )}
        {product.isAuction && (
          <Span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            Auction
          </Span>
        )}
        {onAddToWishlist && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToWishlist(product.id);
            }}
            aria-label={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 text-neutral-600 dark:text-zinc-300 shadow transition hover:bg-white dark:hover:bg-slate-700 hover:text-red-500"
          >
            {isWishlisted ? "♥" : "♡"}
          </Button>
        )}
      </Div>
      <Div className="flex flex-1 flex-col border-t border-zinc-200/80 bg-zinc-50 p-3 dark:border-slate-700/80 dark:bg-slate-900">
        <Text className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-medium text-zinc-950 dark:text-white`}>
          {product.title}
        </Text>
        {product.description && (
          <RichText
            html={normalizeRichTextHtml(product.description)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className={`mt-1 ${THEME_CONSTANTS.utilities.textClamp2} text-xs text-zinc-600 dark:text-zinc-400`}
          />
        )}
        {product.sellerName && (
          <Text className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {safeDisplayName(product.sellerName, "Seller")}
          </Text>
        )}
        <Div className="mt-2 flex items-baseline gap-2">
          <Span className="font-semibold text-zinc-950 dark:text-white">
            {formatCurrency(
              product.price,
              getDefaultCurrency(),
            )}
          </Span>
          {product.originalPrice && (
            <Span className="text-xs text-zinc-500 line-through dark:text-zinc-400">
              {formatCurrency(
                product.originalPrice,
                getDefaultCurrency(),
              )}
            </Span>
          )}
        </Div>
        {product.rating !== undefined && (
          <Row className="mt-1 gap-1">
            <Span className="text-xs text-yellow-500">★</Span>
            <Span className="text-xs text-neutral-500 dark:text-zinc-400">
              {product.rating.toFixed(1)}
              {product.reviewCount ? ` (${product.reviewCount})` : ""}
            </Span>
          </Row>
        )}
      </Div>
    </Div>
  );

  if (href) {
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
}

// --- Grid class maps ---------------------------------------------------------

const GRID_CLASSES: Record<"card", string> = {
  card: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
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
        "flex items-center gap-3 p-3 rounded-lg",
        "border-b border-zinc-100 dark:border-zinc-800 last:border-0",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors",
        onClick ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Thumbnail — 72×72 */}
      <Div className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-neutral-100 dark:bg-zinc-800">
        {product.mainImage ? (
          <Div
            role="img"
            aria-label={product.title}
            className="w-full h-full bg-center bg-cover"
            style={{ backgroundImage: `url(${product.mainImage})` }}
          />
        ) : (
          <Div className="w-full h-full bg-neutral-200 dark:bg-zinc-700" />
        )}
      </Div>

      {/* Title — flex-1 */}
      <Div className="flex-1 min-w-0">
        <Text className="truncate text-sm font-medium text-neutral-900 dark:text-zinc-100">
          {product.title}
        </Text>
        {product.description && (
          <RichText
            html={normalizeRichTextHtml(product.description)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className={`${THEME_CONSTANTS.utilities.textClamp1} text-xs text-neutral-500 dark:text-zinc-400`}
          />
        )}
      </Div>

      {/* Category — hidden on mobile */}
      {product.categoryName && (
        <Span className="hidden sm:block w-[110px] text-xs text-neutral-400 dark:text-zinc-500 truncate">
          {product.categoryName}
        </Span>
      )}

      {/* Rating — hidden on mobile */}
      {product.rating !== undefined && (
        <Span className="hidden sm:flex w-[72px] items-center gap-0.5 text-xs text-neutral-500">
          <Span className="text-yellow-500">★</Span>
          {product.rating.toFixed(1)}
        </Span>
      )}

      {/* Price */}
      <Div className="w-[80px] text-right flex-shrink-0">
        <Span className="text-sm font-semibold text-neutral-900 dark:text-zinc-100">
          {getDefaultCurrencySymbol()}{product.price.toLocaleString()}
        </Span>
        {discount && (
          <Span className="block text-[10px] text-neutral-400 dark:text-zinc-500">
            -{discount}%
          </Span>
        )}
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
          className="flex-shrink-0 w-[36px] h-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
        >
          {isWishlisted ? "♥" : "♡"}
        </Button>
      )}
    </Div>
  );
}

export function ProductGrid<T extends ProductItem = ProductItem>({
  products,
  renderCard,
  onProductClick,
  getProductHref,
  onWishlistToggle,
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
                href={getProductHref ? getProductHref(p) : undefined}
                onClick={onProductClick}
                onAddToWishlist={onWishlistToggle}
                isWishlisted={ctx.isWishlisted}
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
              href={getProductHref ? getProductHref(p) : undefined}
              onClick={onProductClick}
              onAddToWishlist={onWishlistToggle}
              isWishlisted={ctx.isWishlisted}
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
