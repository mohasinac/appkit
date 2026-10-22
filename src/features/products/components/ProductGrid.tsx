"use client";

import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import { BaseListingCard, Button, Div, GatedPrice, Grid, PriceDisplay, PricesOnly, Row, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";

import type { ViewMode } from "../../../ui";
import type { ProductItem } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { useLongPress } from "../../../react/hooks/useLongPress";
import { CardStoreLine } from "./CardStoreLine";
import { isFinalSale } from "../constants/final-sale";
import { CARD_BADGE, resolveCardBadges } from "../constants/card-badges";
import { FeatureBadgeList } from "./FeatureBadge";
import { useProductFeatures } from "./ProductFeaturesContext";
import { PRODUCT_FEATURE_CARD_MAX_VISIBLE } from "../constants/product-features.constants";
import { normalizeListingType } from "../utils/listing-type";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { WishlistHeartButton } from "../../wishlist/components/WishlistHeartButton";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_BADGE_NEW = "rounded-full bg-error-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[10px] text-error-on-solid shadow-sm";
const CLS_STAR = "text-[11px] text-warning";
const CLS_DISCOUNT_TEXT = "mt-1 text-[11px] font-semibold text-error";
const CLS_DISCOUNT_TEXT_BARE = "text-[10px] text-error";
const CLS_STAR_BARE = "text-warning";
const CLS_BID_TEXT = "text-[11px] text-error";

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
  /**
   * Owner-only pencil / clone / bin, for an admin or the seller who owns this
   * listing. Pass `<OwnerQuickActions>`; it renders nothing for anyone else.
   *
   * 🛑 Rendered OUTSIDE this card's `<Link>`, at `top-14 right-2` — below the
   * wishlist heart and clear of the checkbox, badge stack and IconOverlay. See
   * the return statement for why it cannot live inside the card body.
   *
   * Suppressed while a selection is active: a bulk-select gesture and a
   * per-record edit are different intents, and offering both at once invites
   * the wrong one.
   */
  renderOwnerActions?: () => React.ReactNode;
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
  renderOwnerActions,
}: ProductCardProps<T>) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : null;

  const listingPlugin = pluginFor(normalizeListingType(product));
  const typeBadge = listingPlugin.badge
    ? { label: listingPlugin.badge.label, cls: listingPlugin.badge.className }
    : null;

  /*
   * The badge corner, resolved once. Two candidates, ordered and capped by
   * `card-badges.ts` — see the stack below for what the other five badges were
   * and where they went.
   */
  const cardBadges = resolveCardBadges([
    discount
      ? {
          id: CARD_BADGE.DISCOUNT,
          label: `-${discount}%`,
          className: CLS_BADGE_NEW,
          title: `${discount}% off the original price`,
        }
      : null,
    typeBadge
      ? {
          id: CARD_BADGE.LISTING_TYPE,
          label: typeBadge.label,
          // The plugin's own class, plus the shared pill geometry the inline
          // version used to spell out at the call site.
          className: `rounded-full px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[10px] shadow-sm ${typeBadge.cls}`,
        }
      : null,
  ]);

  /*
   * The five demoted badges, as plain words on the metadata line.
   *
   * 🛑 DEMOTED, NOT DELETED. Each states something true that a buyer needs —
   * "Final Sale" is a refund-policy warning and dropping it silently would be
   * a worse defect than crowding the image. But a 10px pill over a photograph
   * is the wrong place to say it: a shopper scanning a grid cannot act on any
   * of them, and five of them hid the two they could act on.
   *
   * `isFinalSale(product)` rather than `product.finalSale` — absent MEANS
   * final sale, so reading the raw field would leave every listing created
   * before it existed unlabelled while still being final sale at the refund
   * gate.
   */
  const cardNotes = [
    product.partOfBundleIds && product.partOfBundleIds.length > 0
      ? product.partOfBundleTitles?.[0]
        ? `In bundle: ${product.partOfBundleTitles[0]}`
        : "In a bundle"
      : null,
    product.groupId
      ? product.isGroupParent
        ? "Set parent"
        : product.groupTitle
          ? `Part of set: ${product.groupTitle}`
          : "Part of a set"
      : null,
    product.allowOffers ? "Taking offers" : null,
    isFinalSale(product) ? "Final sale" : null,
    product.sublistingCategoryId ? "Has variants" : null,
  ].filter((n): n is string => n != null);

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
          ? (e) => (e.key === "Enter" || e.key === "") && onSelect?.(product.id)
          : onClick && !href
          ? (e) => (e.key === "Enter" || e.key === "") && onClick(product)
          : undefined
      }
      onClick={handleCardClick}
      {...(!selectionMode ? longPress : {})}
      className={[
        "group relative flex h-full flex-col overflow-hidden",
        "rounded-2xl border bg-[var(--appkit-color-surface)]",
        "shadow-sm transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-zinc-200/80 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        "bg-[var(--appkit-color-surface)]",
        isSelected ? "dark:border-primary dark:ring-primary/30" : "border-[var(--appkit-color-border)]/60",
        selectionMode || onClick || href ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Image area */}
      <Div className={`relative ${__O.hidden} aspect-square`} surface="subtle">
        {product.mainImage ? (
          <MediaImage
            src={product.mainImage}
            alt={product.title}
            size="card"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Row surface="muted" className="h-full w-full" align="center" justify="center">
            <Span className="opacity-30" size="4xl">🛍️</Span>
          </Row>
        )}

        {/* Checkbox — always rendered; hidden until hover or selection active */}
        {onSelect && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(e) => { e.preventDefault(); onSelect(product.id); }}
            label={isSelected ? "Deselect" : "Select"}
            position="top-2 left-2"
            className={selectionMode || isSelected ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"}
          />
        )}

        {/*
          ── Top-left: AT MOST TWO BADGES ───────────────────────────────────

          🛑 THIS WAS SEVEN. Discount, listing type, "Bundled", "In Set",
          "Taking Offers", "Final Sale" and "Has Variants" each rendered
          unconditionally when its own condition held, into one absolutely-
          positioned stack, with none of them aware of the others. A
          discounted auction that is a bundled set member with offers enabled,
          final sale and variants showed all seven — covering the product
          photograph the card exists to show.

          Nothing was wrong with any ONE of them. The defect was that nobody
          decided which mattered, so `card-badges.ts` does: a badge earns the
          corner only if it changes whether the shopper CLICKS. Type and
          discount do; the other five matter when deciding to BUY, so they
          move to the metadata line below and to the detail page, where there
          is room to state them in words instead of a 10px pill.

          See `resolveCardBadges` for the precedence and why the cap has to
          exist separately from it.
        */}
        <Stack className={`absolute top-2 ${onSelect ? "left-10" : "left-2"}`} gap="xs">
          {!selectionMode &&
            !isSelected &&
            cardBadges.map((b) => (
              <Span
                key={b.id}
                weight="bold"
                className={b.className}
                title={b.title}
              >
                {b.label}
              </Span>
            ))}
        </Stack>

        {/* W1-45 — group/sublisting icon overlay (bottom-right) */}
        <BaseListingCard.IconOverlay
          groupIcon={product.groupIcon}
          sublistingIcon={product.sublistingIcon}
          position="bottom-2 right-2"
        />


        {/* Wishlist button — always visible. Was a hand-rolled inline <svg>
            inside a `size="sm"` Button, which renders 32x36 (the --sm
            min-height beats the caller's h-8) — an ellipse under
            `rounded-full`. */}
        {onAddToWishlist && (
          <WishlistHeartButton
            size="card"
            variant="overlay"
            inWishlist={!!isWishlisted}
            addLabel="Add to wishlist"
            removeLabel="Remove from wishlist"
            className="absolute right-2 top-2"
            onToggle={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddToWishlist(product.id);
            }}
          />
        )}
      </Div>

      {/* Content area */}
      <Stack className={`flex-1 ${__P.p3} pt-[0.625rem]`}>
        <Text className={`leading-snug`} truncate={2} size="sm" weight="semibold" color="primary">
          {product.title}
        </Text>

        {/*
          ── Brand only. CATEGORY CHIPS ARE GONE. ─────────────────────────

          🛑 This was an IIFE computing up to three category chips plus a
          "+N" overflow chip plus a brand chip, each a pill carrying its own
          inline SVG — five elements and two hand-written icons on every card
          in every grid. The categories were the bulk of it and the least
          useful part: a shopper on a category page is already IN that
          category, so the chip repeats back the page they are standing on,
          and on a search grid three truncated taxonomy names crowd out the
          title.

          Brand survives as PLAIN TEXT because it is a real shopping signal
          and the one thing people filter by in this catalogue — but not as a
          pill, and not clickable: the whole card is already a Link, so the
          chip had to fake navigation with preventDefault + stopPropagation +
          router.push to avoid nesting an anchor inside an anchor. A control
          that has to fight its own container is a control in the wrong place;
          the brand page is one click away via the detail page.
        */}
        {product.brand && (
          <Text className="mt-1" size="xs" color="muted" truncate={1}>
            {product.brand}
          </Text>
        )}

        {/*
          The five badges demoted from the image corner, as words. See the
          `cardNotes` block above for why each one lost its pill.
        */}
        {cardNotes.length > 0 && (
          <Text className="mt-1" size="xs" color="muted" truncate={1} title={cardNotes.join(" · ")}>
            {cardNotes.join(" · ")}
          </Text>
        )}

        <CardStoreLine storeName={product.storeName} storeId={product.storeId} />

        {/*
          🛑 A REVIEW MUST EXIST. `rating !== undefined` passes for
          `rating: 0` — what a product nobody has reviewed stores — and then
          the card shows a star and "0.0", which reads as a product rated
          zero rather than one with no rating. Zero reviews is not zero stars,
          and on a grid of cards the difference is the whole impression.
        */}
        {product.rating !== undefined && (product.reviewCount ?? 0) > 0 && (
          <Row className="mt-1" gap="xs">
            <Span className={CLS_STAR}>★</Span>
            <Span className="text-[11px]" color="muted">
              {product.rating.toFixed(1)}
              {product.reviewCount ? ` (${product.reviewCount})` : ""}
            </Span>
          </Row>
        )}

        {/* Price row */}
        <Div className="mt-auto" padding="t-xs">
          <PriceDisplay
            amount={product.price}
            originalAmount={product.originalPrice}
            currency={getDefaultCurrency()}
            variant="compact"
          />

          {(() => {
            const stock =
              product.stockCount ?? product.stockQuantity ?? product.availableQuantity;
            if (stock === undefined || !listingPlugin.showsStockQuantity) return null;
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
                className={`mt-1 text-[11px] ${ low ? "text-warning" : "text-[var(--appkit-color-text-faint)]" }`} weight="medium"
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

          {/*
            ── Action buttons: TEXT ONLY ──────────────────────────────────────

            🛑 BOTH HAND-ROLLED INLINE SVGs ARE GONE — a lightning bolt on
            "Buy Now" and a trolley on "Cart". Not replaced with `<Icon>`,
            which is the usual fix (Root Cause #80, and the wishlist button a
            few lines up records doing exactly that): removed, because the goal
            here is FEWER atoms and an icon beside a two-word label inside a
            half-width button is decoration. "Buy Now" and "Cart" are already
            unambiguous; the glyph adds an element per button per card in every
            grid and tells the shopper nothing the word did not.

            It also removes the last two hand-written `<path d="…">` in this
            card — and the bolt had no registry entry, so keeping it would have
            meant either adding an icon to the catalogue for one decorative use
            or leaving a raw SVG behind.
          */}
          {(onAddToCart || onBuyNow) && (
            <Div layout="grid" gap="1" className={`mt-2 ${onBuyNow && onAddToCart ? "grid-cols-2" : "grid-cols-1"}`}>
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
                  className="justify-center text-[length:var(--appkit-text-xs)] btn-glow"
                >
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
                  className="justify-center text-[length:var(--appkit-text-xs)]"
                >
                  Cart
                </Button>
              )}
            </Div>
          )}
        </Div>
      </Stack>
    </Div>
  );

  const wrapped =
    href && !selectionMode ? (
      <Link href={href} className="block h-full">
        {cardBody}
      </Link>
    ) : (
      cardBody
    );

  /*
   * 🛑 Default, not opt-in — nothing in either repo ever passed
   * `renderOwnerActions`, so this toolbar was unreachable on every product
   * grid in the app despite the prop, the docstring and the positioning all
   * being present (Root Cause #8).
   *
   * `ProductOwnerQuickActions`, not the generic wrapper: a product is the one
   * collection a SELLER can also own, so its endpoints live under
   * `SELLER_ENDPOINTS` and its clone has a bespoke redirect to the copy's
   * editor. `storeId` is the store SLUG, which is what `SessionUser.storeId`
   * holds — the component renders nothing for anyone who owns neither.
   */
  const ownerActions = renderOwnerActions ? (
    renderOwnerActions()
  ) : product.id ? (
    <RecordOwnerQuickActions resource="PRODUCT" recordId={String(product.id)}
      storeId={product.storeId ? String(product.storeId) : undefined}
      recordLabel={product.title}
      placement="card"
    />
  ) : null;

  // Selection is still suppressed: a bulk-select gesture and a per-record edit
  // are different intents, and offering both at once invites the wrong one.
  if (!ownerActions || selectionMode || isSelected) return wrapped;

  /*
   * 🛑 STILL OUTSIDE THE ANCHOR, as a sibling — never inside `cardBody`.
   *
   * This card wraps its entire body in a `<Link>` whenever `href` is set, and
   * `InteractiveProductCard` wraps it in another one. A `<button>` inside an
   * `<a>` is invalid HTML that browsers resolve by closing the anchor early,
   * which breaks the CARD's navigation rather than just the button's —
   * stopPropagation stops the click but cannot fix the parse. That constraint
   * is unchanged and is why this sits here rather than next to the title.
   *
   * 🛑 BUT NO LONGER ABSOLUTE, AND NO LONGER ON THE PHOTO.
   *
   * It used to be `absolute right-2 top-14 z-20`, chosen by elimination — the
   * wishlist heart owns `top-2 right-2`, the checkbox and badges own top-left,
   * `IconOverlay` owns bottom-right — which left the middle of the product
   * photograph as the only free corner. So every seller-visible card had three
   * icons sitting on the artwork, and on the pre-order card the same logic put
   * them on top of the "Reserve now" button.
   *
   * In normal flow at the FOOT of the card it collides with nothing by
   * construction: no corner budget to reason about, no overlap with a CTA, and
   * the same position on every card type. The toolbar supplies its own box, so
   * it reads as a distinct owner strip rather than as part of the listing.
   *
   * `justify-end` keeps it on the side the eye already uses for card actions;
   * `pt-0` because the card body's own bottom padding is the gap.
   */
  return (
    <Div className="flex h-full flex-col">
      {wrapped}
      {/*
       * No `pt-0`: with no `pt-*` class the padding-top is already 0, so the
       * literal was redundant — and being a bare spacing utility with no token
       * behind it, it was the one thing here `audit-html-wrappers` could
       * legitimately refuse. The two remaining values resolve through
       * `--appkit-space-3`, which is the sanctioned form when no all-sides
       * preset fits (there is no `paddingX`/`paddingY` prop).
       */}
      <Div className="flex justify-end px-[var(--appkit-space-3)] pb-[var(--appkit-space-3)]">
        {ownerActions}
      </Div>
    </Div>
  );
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
          ? (e) => (e.key === "Enter" || e.key === "") && onClick(product)
          : undefined
      }
      onClick={onClick ? () => onClick(product) : undefined}
      className={[
        "flex items-center gap-[var(--appkit-space-3)] p-[var(--appkit-space-2)] sm:p-[var(--appkit-space-3)]",
        "hover:bg-[var(--appkit-color-surface)]/60 transition-colors",
        onClick ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Thumbnail */}
      <Div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 ${__O.hidden} bg-[var(--appkit-color-surface)]`} rounded="lg">
        {product.mainImage ? (
          <MediaImage
            src={product.mainImage}
            alt={product.title}
            size="thumbnail"
          />
        ) : (
          <Div className="w-full h-full bg-neutral-200" />
        )}
      </Div>

      {/* Content */}
      <Stack className="flex-1 min-w-0 gap-[2px]">
        <Text size="sm" weight="medium" color="primary" truncate={2}>
          {product.title}
        </Text>
        {(product.categoryName || product.brand) && (
          <Span className="text-[11px] truncate" color="faint">
            {[product.categoryName, product.brand].filter(Boolean).join(" · ")}
          </Span>
        )}
        <CardStoreLine storeName={product.storeName} storeId={product.storeId} className="text-[11px]" />
        <Row className="mt-0.5" align="center" gap="sm" wrap>
          <Span size="sm" weight="semibold" className="text-primary">
            <GatedPrice>{formatCurrency(product.price, getDefaultCurrency())}</GatedPrice>
          </Span>
          {discount && (
            // The discount % is derived from price vs originalPrice, so it is a
            // money disclosure even though it carries no currency symbol.
            <PricesOnly>
              <Span weight="bold" className={CLS_DISCOUNT_TEXT_BARE}>-{discount}%</Span>
            </PricesOnly>
          )}
          {/* Same gate as the card layout above — see its note. */}
          {product.rating !== undefined && (product.reviewCount ?? 0) > 0 && (
            <Span layout="flex" gap="2xs" className="text-[11px]" color="faint">
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
 : "text-[var(--appkit-color-text-faint)]"
 }`}
              >
                {low ? `Only ${stock} left` : `${stock} in stock`}
              </Span>
            );
          })()}
        </Row>
      </Stack>

      {/* Wishlist action. Was the text characters ♥/♡, which no width or
          height utility can size — they render at the platform font fallback. */}
      {onAddToWishlist && (
        <WishlistHeartButton
          size="inline"
          inWishlist={!!isWishlisted}
          addLabel="Add to wishlist"
          removeLabel="Remove from wishlist"
          onToggle={(e) => {
            e.stopPropagation();
            onAddToWishlist(product.id);
          }}
        />
      )}
    </Div>
  );
}

function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  // drop any href that would navigate to a literal "/undefined" segment
  /*
   * A SEGMENT that is literally "undefined"/"null" means an interpolation
   * produced one — `/products/${maybeUndefined}`.
   *
   * Tested with a regex rather than `.includes("/undefined")`, which kills two
   * birds: a regex literal is not a string Literal node, so the route-literal
   * rule has nothing to flag and the eslint-disable that used to sit here is
   * gone; and `.includes` matched any slug CONTAINING the word, so a real
   * listing at `/products/undefined-sequence-bey` was silently dropped from
   * the grid. The anchors make it a whole-segment test.
   */
  if (/\/(?:undefined|null)(?:\/|$)/.test(href)) return undefined;
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
        <Stack
          className={`divide-y divide-zinc-100 divide-[var(--appkit-color-border-subtle)] ${className}`} border="subtle" rounded="xl"
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
        </Stack>
      );
    }

    if (view === "fluid") {
      return (
        <Grid cols="cards" className={className}>
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

    return (
      <Grid cols="cards" gap="lg" className={className}>
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
  };

  return (
    <Div>
      {resolvedHeader}
      {isEmpty
        ? (resolvedEmpty ?? (
            <Text paddingY="3xl" color="muted" size="sm" align="start">
              {emptyLabel}
            </Text>
          ))
        : renderItems()}
      {resolvedFooter}
    </Div>
  );
}
