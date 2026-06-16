"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "../../../react/hooks/useLongPress";
import type { ProductItem } from "../types";
import { ROUTES } from "../../../next";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

const CLS_PRIZE_PILL = "inline-flex items-center rounded-full bg-fuchsia-600 px-2 py-0.5 text-white";
import { BaseListingCard, Button, Div, Row, Span, Stack, Text, TextLink } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";

export type MarketplacePrizeDrawCardData = ProductItem;

export interface MarketplacePrizeDrawCardLabels {
  prizeDrawBadge?: string;
  pendingBadge?: string;
  openBadge?: string;
  closedBadge?: string;
  entriesRemainingLabel?: (remaining: number, max: number) => string;
  pricePerEntryLabel?: string;
  enterDraw?: string;
}

export interface MarketplacePrizeDrawCardProps {
  product: MarketplacePrizeDrawCardData;
  className?: string;
  variant?: "grid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  href?: string;
  hrefBuilder?: (product: MarketplacePrizeDrawCardData) => string;
  onNavigate?: (href: string) => void;
  labels?: MarketplacePrizeDrawCardLabels;
}

const DEFAULT_LABELS: Required<MarketplacePrizeDrawCardLabels> = {
  prizeDrawBadge: "Prize draw",
  pendingBadge: "Reveal pending",
  openBadge: "Reveal open",
  closedBadge: "Draw closed",
  entriesRemainingLabel: (remaining, max) => `${remaining}/${max} entries left`,
  pricePerEntryLabel: "per entry",
  enterDraw: ACTIONS.PRIZE_DRAW["enter-draw"].label,
};

function statusVariant(status?: "pending" | "open" | "closed") {
  switch (status) {
    case "open":
      return "bg-success-surface text-white";
    case "closed":
      return "bg-zinc-500 text-white";
    case "pending":
    default:
      return "bg-warning-surface text-white";
  }
}

function statusLabel(
  status: "pending" | "open" | "closed" | undefined,
  labels: Required<MarketplacePrizeDrawCardLabels>,
) {
  switch (status) {
    case "open":
      return labels.openBadge;
    case "closed":
      return labels.closedBadge;
    case "pending":
    default:
      return labels.pendingBadge;
  }
}

function resolveHref(
  product: MarketplacePrizeDrawCardData,
  href?: string,
  hrefBuilder?: (product: MarketplacePrizeDrawCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(product);
  return ROUTES.PUBLIC.PRIZE_DRAW_DETAIL(product.slug ?? product.id);
}

function formatCountdown(target: string | Date | undefined): string | null {
  if (!target) return null;
  const t = target instanceof Date ? target.getTime() : new Date(target).getTime();
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export function MarketplacePrizeDrawCard({
  product,
  className = "",
  variant = "grid",
  selectable = false,
  isSelected = false,
  onSelect,
  href,
  hrefBuilder,
  onNavigate,
  labels,
}: MarketplacePrizeDrawCardProps) {
  const router = useRouter();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const detailHref = resolveHref(product, href, hrefBuilder);
  const longPress = useLongPress(() => onSelect?.(product.id, !isSelected));

  const items = product.prizeDrawItems ?? [];
  const thumbItems = items.slice(0, 4);
  const status = product.prizeRevealStatus;
  const max = product.prizeMaxEntries ?? 0;
  const current = product.prizeCurrentEntries ?? 0;
  const remaining = Math.max(0, max - current);
  const pricePerEntry = product.pricePerEntry ?? product.price;
  const countdownTarget =
    status === "pending"
      ? product.prizeRevealWindowStart
      : status === "open"
        ? product.prizeRevealWindowEnd
        : undefined;
  const countdown = formatCountdown(countdownTarget);

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
          {thumbItems.length > 0 ? (
            <Div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full w-full bg-[var(--appkit-color-surface-muted)]">
              {Array.from({ length: 4 }).map((_, i) => {
                const it = thumbItems[i];
                const img = it?.images?.[0];
                return (
                  <Div
                    key={`thumb-${i}`}
                    className="relative overflow-hidden bg-[var(--appkit-color-surface-muted)]"
                  >
                    {img ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={img}
                        alt={it?.title ?? `Prize ${i + 1}`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                  </Div>
                );
              })}
            </Div>
          ) : (
            <Row className="absolute inset-0 bg-[var(--appkit-color-surface-muted)]" align="center" justify="center">
              <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
                No prizes
              </Text>
            </Row>
          )}
        </TextLink>

        <Stack className="absolute right-2 top-2" align="end" gap="xs">
          <Span size="xs" weight="medium" className={CLS_PRIZE_PILL}>
            {mergedLabels.prizeDrawBadge}
          </Span>
          <Span
            size="xs"
            weight="medium"
            className={`inline-flex items-center py-0.5 ${statusVariant(status)}`} rounded="full" padding="x-xs"
          >
            {statusLabel(status, mergedLabels)}
          </Span>
        </Stack>

        {status === "closed" ? (
          <Row className="absolute inset-0 bg-black/40" align="center" justify="center">
            <Span size="xs" weight="bold" className="bg-zinc-900/80 py-1 tracking-wider text-white" rounded="default" padding="x-sm" transform="uppercase">
              {mergedLabels.closedBadge}
            </Span>
          </Row>
        ) : null}

        {onSelect && (
          <BaseListingCard.Checkbox
            selected={isSelected}
            onSelect={(event) => {
              event.stopPropagation();
              onSelect(product.id, !isSelected);
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
          <Text size="sm" weight="medium" color="primary" truncate={2}>
            {product.title}
          </Text>
        </TextLink>
        <Row justify="between" className="mt-1" gap="sm">
          <Text size="sm" weight="semibold" color="primary">
            {formatCurrency(pricePerEntry, getDefaultCurrency())}{" "}
            <Span size="xs" weight="normal" className="text-[var(--appkit-color-text-muted)]">
              {mergedLabels.pricePerEntryLabel}
            </Span>
          </Text>
          {max > 0 ? (
            <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
              {mergedLabels.entriesRemainingLabel(remaining, max)}
            </Text>
          ) : null}
        </Row>
        {countdown ? (
          <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
            {status === "pending" ? "Opens in" : "Closes in"} {countdown}
          </Text>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-2 w-full text-xs"
          onClick={handleNavigate}
          disabled={status === "closed" || remaining === 0}
        >
          {mergedLabels.enterDraw}
        </Button>
      </BaseListingCard.Info>
    </BaseListingCard>
  );
}
