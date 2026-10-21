"use client"
import { normalizeError } from "../../../errors/normalize";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "../../../react/hooks/useLongPress";
import type { ProductItem } from "../../products/types";
import { MediaImage } from "../../media";
import { useWishlistToggle, type WishlistToggleActions } from "../../wishlist";
import { ROUTES } from "../../../next/routing/route-map";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

const CLS_PREORDER_BADGE = "inline-flex items-center rounded-full bg-warning-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-warning-on-solid";
const CLS_SALE_BADGE = "rounded-full bg-success-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-bold text-success-on-solid";
const CLS_TRENDING_BADGE = "rounded-full bg-indigo-600 px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-bold text-white";
const CLS_LIMITED_BADGE = "rounded-full bg-info-solid px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-bold text-info-on-solid";
import { Div, BaseListingCard, Button, GatedPrice, RichText, Row, Span, Stack, Text, TextLink } from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { PreorderBadge } from "./PreorderCard";
import { WishlistHeartButton } from "../../wishlist/components/WishlistHeartButton";
import { CardStoreLine } from "../../products/components/CardStoreLine";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

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
  renderOwnerActions,
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
      } catch (_err) {
        // useWishlistToggle rolls back its optimistic state and raises its own
        // toast on failure, so the heart returns to its true value on screen.
        // Reporting again here would double-notify for one user action.
        void normalizeError(_err);
      }
    },
    [toggle],
  );

  const card = (
    <BaseListingCard
      isSelected={isSelected}
      variant={variant}
      className={className}
      onMouseDown={!isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={!isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={!isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={!isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={!isSelected ? longPress.onTouchEnd : undefined}
      onTouchCancel={!isSelected ? longPress.onTouchCancel : undefined}
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

        <Stack className="absolute right-2 top-2" align="end" gap="xs">
          <Span layout="inline-flex" color="inverse" size="xs" weight="medium" className="bg-cobalt" rounded="full" padding="pill-xs">
            {mergedLabels.preOrderBadge}
          </Span>
          {product.featured && (
            <Span size="xs" weight="medium" className={CLS_PREORDER_BADGE}>
              {mergedLabels.featuredBadge}
            </Span>
          )}
        </Stack>

        <Stack className="absolute left-2 top-2 pointer-events-none" gap="xs">
          {product.partOfBundleIds && product.partOfBundleIds.length > 0 && (
            <Span
              className={CLS_SALE_BADGE}
              title={product.partOfBundleTitles?.[0] ? `In bundle: ${product.partOfBundleTitles[0]}` : "In a bundle"}
            >
              Bundled
            </Span>
          )}
          {product.groupId && (
            <Span
              className={CLS_TRENDING_BADGE}
              title={product.groupTitle ? `Part of set: ${product.groupTitle}` : "Part of a set"}
            >
              {product.isGroupParent ? "Set Parent" : "In Set"}
            </Span>
          )}
          {product.sublistingCategoryId && (
            <Span
              className={CLS_LIMITED_BADGE}
              title="Has variants or sub-listings"
            >
              Has Variants
            </Span>
          )}
        </Stack>

        {onSelect && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(event) => {
              event.stopPropagation();
              onSelect(product.id, !isSelected);
            }}
            className={
              selectable || isSelected ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
            }
          />
        )}
      </BaseListingCard.Hero>

      <BaseListingCard.Info variant={variant}>
        {variant === "list" ? (
          /* ── Compact list layout ── */
          <>
            <Row className="min-w-0" align="start" justify="between" gap="sm">
              <TextLink href={detailHref} className="min-w-0 flex-1">
                <Text size="sm" weight="medium" color="primary" truncate={2}>
                  {product.title}
                </Text>
              </TextLink>
              {wishlistActions && (
                <WishlistHeartButton
                  size="inline"
                  inWishlist={inWishlist}
                  addLabel={mergedLabels.addToWishlist}
                  removeLabel={mergedLabels.removeFromWishlist}
                  onToggle={handleWishlist}
                />
              )}
            </Row>
            <CardStoreLine storeName={product.storeName} storeId={product.storeId} />
            <Row align="center" gap="sm" wrap>
              <Text className="text-primary" size="sm" weight="bold">
                <GatedPrice>{formatCurrency(product.price, getDefaultCurrency())}</GatedPrice>
              </Text>
              {shipDate && <PreorderBadge shipDate={shipDate} />}
            </Row>
            <Button
              type="button"
              variant="primary"
              size="sm"
              textSize="xs"
              className="self-start mt-0.5"
              onClick={handleNavigate}
            >
              {mergedLabels.reserveNow}
            </Button>
          </>
        ) : (
          /* ── Full grid layout ── */
          <>
            <TextLink href={detailHref}>
              <Text size="sm" weight="medium" color="primary" truncate={2}>
                {product.title}
              </Text>
            </TextLink>
            <CardStoreLine storeName={product.storeName} storeId={product.storeId} />
            {product.description ? (
              <RichText
                html={normalizeRichTextHtml(product.description)}
                proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                className="line-clamp-2 text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)]"
              />
            ) : null}
            <Row justify="between" className="mt-1" gap="sm">
              <Text size="sm" weight="semibold" color="primary">
                <GatedPrice>{formatCurrency(product.price, getDefaultCurrency())}</GatedPrice>
              </Text>
              {shipDate && <PreorderBadge shipDate={shipDate} />}
            </Row>
            <Row justify="between" className="mt-auto pt-[var(--appkit-space-2)]" gap="sm">
              <Button type="button" variant="primary" size="sm" textSize="xs" className="flex-1" onClick={handleNavigate}>
                {mergedLabels.reserveNow}
              </Button>
              {onAddToCart ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  textSize="xs" className="flex-1"
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                >
                  {mergedLabels.addToCart}
                </Button>
              ) : null}
              {wishlistActions ? (
                <WishlistHeartButton
                  size="inline"
                  inWishlist={inWishlist}
                  addLabel={mergedLabels.addToWishlist}
                  removeLabel={mergedLabels.removeFromWishlist}
                  onToggle={handleWishlist}
                />
              ) : null}
            </Row>
          </>
        )}
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
    <Div className="flex h-full flex-col">
      {card}
    {/*
      🛑 NORMAL FLOW AT THE FOOT, not an absolute corner.

      Across the five card types this toolbar appeared in FIVE different
      places — `top-14` on the product grid (on the photograph), `top-2`
      here and on the prize draw (on the badges), `bottom-2` on the pre-order
      and auction (on top of their own CTA button). Each was chosen by
      elimination against that one card's overlays, so each landed somewhere
      different and none of them read as a toolbar.

      At the foot in normal flow there is no corner budget to reason about and
      no overlay to dodge, so it is the same position on every card. It stays
      a SIBLING of the card body because that body is wrapped in a `<Link>`
      and a button inside an anchor is invalid HTML.
    */}
    <Div className="flex justify-end px-[var(--appkit-space-3)] pb-[var(--appkit-space-3)]">{ownerActions}</Div>
    </Div>
  );
}
