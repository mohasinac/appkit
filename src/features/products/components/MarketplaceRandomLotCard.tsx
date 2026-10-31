"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLongPress } from "../../../react/hooks/useLongPress";
import type { ProductItem } from "../types";
import { ROUTES } from "../../../next/routing/route-map";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { formatCurrency } from "../../../utils";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

const CLS_PRIZE_PILL = "inline-flex items-center rounded-full bg-fuchsia-600 px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-white";
import { BaseListingCard } from "../../../ui/components/BaseListingCard";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { GatedPrice } from "../../../ui/components/GatedPrice";
import { Row, Stack } from "../../../ui/components/Layout";
import { Span, Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { MediaImage } from "../../media/MediaImage";
import { CardStoreLine } from "./CardStoreLine";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

export type MarketplaceRandomLotCardData = ProductItem;

export interface MarketplaceRandomLotCardLabels {
  randomLotBadge?: string;
  pendingBadge?: string;
  openBadge?: string;
  closedBadge?: string;
  entriesRemainingLabel?: (remaining: number, max: number) => string;
  pricePerEntryLabel?: string;
  enterDraw?: string;
}

export interface MarketplaceRandomLotCardProps {
  product: MarketplaceRandomLotCardData;
  className?: string;
  variant?: "grid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  href?: string;
  hrefBuilder?: (product: MarketplaceRandomLotCardData) => string;
  onNavigate?: (href: string) => void;
  labels?: MarketplaceRandomLotCardLabels;
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

const DEFAULT_LABELS: Required<MarketplaceRandomLotCardLabels> = {
  randomLotBadge: "Random Lots",
  pendingBadge: "Reveal pending",
  openBadge: "Reveal open",
  closedBadge: "Lot closed",
  entriesRemainingLabel: (remaining, max) => `${remaining}/${max} entries left`,
  pricePerEntryLabel: "per entry",
  enterDraw: ACTIONS.RANDOM_LOTS["enter-draw"].label,
};

function statusVariant(status?: "pending" | "open" | "closed") {
  switch (status) {
    case "open":
      return "bg-success-solid text-success-on-solid";
    case "closed":
      return "bg-zinc-500 text-white";
    case "pending":
    default:
      return "bg-warning-solid text-warning-on-solid";
  }
}

function statusLabel(
  status: "pending" | "open" | "closed" | undefined,
  labels: Required<MarketplaceRandomLotCardLabels>,
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
  product: MarketplaceRandomLotCardData,
  href?: string,
  hrefBuilder?: (product: MarketplaceRandomLotCardData) => string,
) {
  if (href) return href;
  if (hrefBuilder) return hrefBuilder(product);
  return ROUTES.PUBLIC.RANDOM_LOTS_DETAIL(product.slug ?? product.id);
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

export function MarketplaceRandomLotCard({
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
  renderOwnerActions,
}: MarketplaceRandomLotCardProps) {
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
        <TextLink href={String(detailHref)} className="absolute inset-0 block">
          {thumbItems.length > 0 ? (
            <Div layout="grid" className="grid-cols-2 grid-rows-2 gap-[0.125rem] h-full w-full bg-[var(--appkit-color-bg)]">
              {Array.from({ length: 4 }).map((_, i) => {
                const it = thumbItems[i];
                const img = it?.images?.[0];
                return (
                  <Div
                    key={`thumb-${i}`}
                    className="relative overflow-hidden bg-[var(--appkit-color-bg)]"
                  >
                    {img ? (
                      <MediaImage src={img} alt={it?.title ?? `Prize ${i + 1}`} size="card" />
                    ) : null}
                  </Div>
                );
              })}
            </Div>
          ) : (
            <Row className="absolute inset-0 bg-[var(--appkit-color-bg)]" align="center" justify="center">
              <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
                No prizes
              </Text>
            </Row>
          )}
        </TextLink>

        <Stack className="absolute right-2 top-2" align="end" gap="xs">
          <Span size="xs" weight="medium" className={CLS_PRIZE_PILL}>
            {mergedLabels.randomLotBadge}
          </Span>
          <Span layout="inline-flex" 
            size="xs"
            weight="medium"
            className={`${statusVariant(status)}`} rounded="full" padding="pill-xs"
          >
            {statusLabel(status, mergedLabels)}
          </Span>
        </Stack>

        {status === "closed" ? (
          <Row surface="overlay-xs" className="absolute inset-0" align="center" justify="center">
            <Span color="inverse" size="xs" weight="bold" className="bg-neutral-900/80 tracking-wider" rounded="default" padding="pill-md" transform="uppercase">
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
                : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
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
        <CardStoreLine storeName={product.storeName} storeId={product.storeId} />
        <Row justify="between" className="mt-1" gap="sm">
          <Text size="sm" weight="semibold" color="primary">
            <GatedPrice label="Sign in to see the entry price">
              {formatCurrency(pricePerEntry, getDefaultCurrency())}{" "}
              <Span size="xs" weight="normal" className="text-[var(--appkit-color-text-muted)]">
                {mergedLabels.pricePerEntryLabel}
              </Span>
            </GatedPrice>
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
          textSize="xs"
          className="mt-2 w-full"
          onClick={handleNavigate}
          disabled={status === "closed" || remaining === 0}
        >
          {mergedLabels.enterDraw}
        </Button>
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
    <Div layout="flex-col" className="h-full">
      {card}
    {/*
      🛑 NORMAL FLOW AT THE FOOT, not an absolute corner.

      Across the five card types this toolbar appeared in FIVE different
      places — `top-14` on the product grid (on the photograph), `top-2`
      here and on the prize draw (on the badges), `bottom-2` on the pre-order
      and collector drop (on top of their own CTA button). Each was chosen by
      elimination against that one card's overlays, so each landed somewhere
      different and none of them read as a toolbar.

      At the foot in normal flow there is no corner budget to reason about and
      no overlay to dodge, so it is the same position on every card. It stays
      a SIBLING of the card body because that body is wrapped in a `<Link>`
      and a button inside an anchor is invalid HTML.
    */}
    <Div layout="flex" justify="end" className="px-[var(--appkit-space-3)] pb-[var(--appkit-space-3)]">{ownerActions}</Div>
    </Div>
  );
}
