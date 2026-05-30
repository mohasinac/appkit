"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "../../../react/hooks/useLongPress";
import type { CategoryDocument } from "../../categories/schemas/firestore";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  BaseListingCard,
  Div,
  Row,
  Span,
  Text,
  TextLink,
} from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";

export type MarketplaceBundleCardData = Pick<
  CategoryDocument,
  | "id"
  | "name"
  | "slug"
  | "bundleItemDetails"
  | "bundleProductIds"
  | "bundlePriceInPaise"
  | "bundleStockStatus"
  | "display"
>;

export interface MarketplaceBundleCardLabels {
  bundleBadge?: string;
  inStockBadge?: string;
  outOfStockBadge?: string;
  itemsLabel?: (count: number) => string;
}

export interface MarketplaceBundleCardProps {
  bundle: MarketplaceBundleCardData;
  className?: string;
  variant?: "grid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  href?: string;
  hrefBuilder?: (bundle: MarketplaceBundleCardData) => string;
  onNavigate?: (href: string) => void;
  labels?: MarketplaceBundleCardLabels;
}

const DEFAULT_LABELS: Required<MarketplaceBundleCardLabels> = {
  bundleBadge: "Bundle",
  inStockBadge: "In stock",
  outOfStockBadge: "Out of stock",
  itemsLabel: (count) => `${count} item${count !== 1 ? "s" : ""}`,
};

function resolveHref(
  bundle: MarketplaceBundleCardData,
  href?: string,
  hrefBuilder?: (bundle: MarketplaceBundleCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(bundle);
  return ROUTES.PUBLIC.BUNDLE_DETAIL(bundle.slug);
}

export function MarketplaceBundleCard({
  bundle,
  className = "",
  variant = "grid",
  selectable = false,
  isSelected = false,
  onSelect,
  href,
  hrefBuilder,
  onNavigate,
  labels,
}: MarketplaceBundleCardProps) {
  const router = useRouter();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const detailHref = resolveHref(bundle, href, hrefBuilder);
  const longPress = useLongPress(() => onSelect?.(bundle.id, !isSelected));

  const memberCount = bundle.bundleProductIds?.length ?? 0;
  const stock = bundle.bundleStockStatus ?? "in_stock";
  const cover = bundle.display?.coverImage;
  const price = bundle.bundlePriceInPaise;

  const collageTiles = (bundle.bundleItemDetails ?? [])
    .filter((d) => Boolean(d.imageURL))
    .slice(0, 4);
  const showCollage = collageTiles.length >= 2;
  const overflow = memberCount - collageTiles.length;

  const handleNavigate = useCallback(() => {
    if (onNavigate) {
      onNavigate(String(detailHref));
      return;
    }
    router.push(String(detailHref));
  }, [detailHref, onNavigate, router]);

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
        <TextLink href={String(detailHref)} className="absolute inset-0 block">
          {showCollage ? (
            <Div
              className={`grid h-full w-full gap-0.5 bg-[var(--appkit-color-surface-muted)] ${
                collageTiles.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"
              }`}
            >
              {collageTiles.map((tile, i) => (
                <Div
                  key={`${tile.productId}-${i}`}
                  className="relative overflow-hidden bg-[var(--appkit-color-surface-muted)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tile.imageURL}
                    alt={tile.title ?? `${bundle.name} item ${i + 1}`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {i === collageTiles.length - 1 && overflow > 0 && (
                    <Div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                      +{overflow}
                    </Div>
                  )}
                </Div>
              ))}
            </Div>
          ) : cover ? (
            <Div className="absolute inset-0 bg-[var(--appkit-color-surface-muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={bundle.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </Div>
          ) : (
            <Div className="absolute inset-0 flex items-center justify-center bg-[var(--appkit-color-surface-muted)]">
              <Text className="text-xs text-[var(--appkit-color-text-muted)]">No image</Text>
            </Div>
          )}
        </TextLink>

        <Div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <Span size="xs" weight="medium" className="inline-flex items-center rounded-full bg-violet-600 px-2 py-0.5 text-white">
            {mergedLabels.bundleBadge}
          </Span>
          <Span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              stock === "out_of_stock"
                ? "bg-zinc-500 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {stock === "out_of_stock" ? mergedLabels.outOfStockBadge : mergedLabels.inStockBadge}
          </Span>
        </Div>

        {stock === "out_of_stock" && (
          <Div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Span size="xs" weight="bold" className="rounded bg-zinc-900/80 px-3 py-1 uppercase tracking-wider text-white">
              {mergedLabels.outOfStockBadge}
            </Span>
          </Div>
        )}

        {onSelect && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(event) => {
              event.stopPropagation();
              onSelect(bundle.id, !isSelected);
            }}
            className={
              selectable || isSelected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 transition-opacity"
            }
          />
        )}
      </BaseListingCard.Hero>

      <BaseListingCard.Info variant={variant}>
        <TextLink href={String(detailHref)}>
          <Text
            className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-medium text-zinc-900 dark:text-zinc-100`}
          >
            {bundle.name}
          </Text>
        </TextLink>
        <Row justify="between" className="mt-1 gap-2">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {price
              ? formatCurrency(price / 100, getDefaultCurrency())
              : "—"}
          </Text>
          <Text className="text-xs text-[var(--appkit-color-text-muted)]">
            {mergedLabels.itemsLabel(memberCount)}
          </Text>
        </Row>
        <div
          className="mt-2 w-full cursor-pointer rounded-md bg-violet-600 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-violet-700 active:scale-[0.98]"
          role="button"
          tabIndex={0}
          onClick={handleNavigate}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNavigate(); }}
        >
          View Bundle
        </div>
      </BaseListingCard.Info>
    </BaseListingCard>
  );
}
