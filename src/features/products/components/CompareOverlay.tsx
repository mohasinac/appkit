"use client";
/**
 * CompareOverlay â€" BK3
 *
 * Fullscreen comparison overlay triggered by the Compare bulk action on
 * Products / Auctions / Pre-orders listings.
 *
 * Layout:
 *  - Desktop (md+): up to COMPARE_MAX_ITEMS columns side-by-side. Left rail
 *    holds field labels, columns hold values.
 *  - Mobile (< md): single-card swipeable view with dot pagination. The
 *    `useSwipe` hook detects left/right swipes on the card area.
 *
 * Data: parent passes either pre-loaded `items` or a list of `productIds`.
 * When ids are passed, this component does a single fetch to
 * `GET /api/products?ids=<csv>` (BK3 listByIds endpoint).
 */
import type { ListingType } from "../types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  auto: "overflow-auto",
  hidden: "overflow-hidden",
} as const;

const REL_NOOPENER = "noopener noreferrer";
const CLS_REMOVE_BTN = "shrink-0 text-zinc-400 hover:bg-[var(--appkit-color-surface)] hover:text-error hover:bg-[var(--appkit-color-surface-elevated)]";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, Div, Heading, IconButton, Row, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { useSwipe } from "../../../react/hooks/useSwipe";
import { formatCurrency } from "../../../utils/number.formatter";
import { COMPARE_MAX_ITEMS } from "../constants/action-defs";
import { normalizeListingType } from "../utils/listing-type";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";

/** Subset of ProductDocument the overlay needs. Kept loose so it can be fed
 * sanitized public payloads directly. */
export interface CompareProductLike {
  id: string;
  title?: string;
  slug?: string;
  price?: number;
  currency?: string;
  mainImage?: string;
  images?: string[];
  condition?: string;
  brand?: string;
  category?: string;
  categoryName?: string;
  categorySlugs?: string[];
  categoryNames?: string[];
  storeName?: string;
  storeSlug?: string;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
  features?: string[];
}

interface CompareFieldLabels {
  image: string;
  price: string;
  condition: string;
  brand: string;
  category: string;
  store: string;
}

export interface CompareOverlayLabels {
  title?: string;
  empty?: string;
  close?: string;
  remove?: string;
  view?: string;
  field?: Partial<CompareFieldLabels>;
}

interface ResolvedLabels {
  title: string;
  empty: string;
  close: string;
  remove: string;
  view: string;
  field: CompareFieldLabels;
}

const DEFAULT_LABELS: ResolvedLabels = {
  title: "Compare items",
  empty: "Select up to 4 items from the listing to compare.",
  close: "Close",
  remove: "Remove",
  view: "View",
  field: {
    image: "Photo",
    price: "Price",
    condition: "Condition",
    brand: "Brand",
    category: "Category",
    store: "Store",
  },
};

export interface CompareOverlayProps {
  isOpen: boolean;
  /** Pre-loaded items. Takes precedence over `productIds`. */
  items?: CompareProductLike[];
  /** When provided, the overlay fetches /api/products?ids=â€¦ on open. */
  productIds?: string[];
  /** Discriminates which detail-page ROUTE to link to. */
  productType?: "product" | "auction" | "preorder";
  onClose: () => void;
  /** Called when a column's Remove button is clicked. */
  onRemove?: (id: string) => void;
  labels?: CompareOverlayLabels;
}

const OVERLAY_CLASS =
  "fixed inset-0 flex flex-col bg-[var(--appkit-color-bg)] overflow-hidden z-[var(--appkit-z-modal,60)]";
const HEADER_CLASS =
  "flex items-center justify-between gap-[var(--appkit-space-3)] border-b border-[var(--appkit-color-border-subtle)] px-[var(--appkit-space-4)] py-[var(--appkit-space-3)]";
const FIELD_LABEL_CLASS =
  "text-[length:var(--appkit-text-xs)] font-medium uppercase tracking-wider text-[var(--appkit-color-text-muted)]";
const CHIP_CLASS =
  "inline-flex items-center rounded-full bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text-muted)] px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)]";
const COLUMN_CARD_CLASS =
  "flex flex-col gap-[var(--appkit-space-3)] rounded-xl border border-[var(--appkit-color-border-subtle)] bg-[var(--appkit-color-surface)] p-[var(--appkit-space-3)]";

function detailHref(item: CompareProductLike, type: CompareOverlayProps["productType"]): string {
  const id = item.slug ?? item.id;
  // The caller-supplied `type` hint takes precedence — some compare contexts
  // (e.g. an auction comparison page) feed items that don't carry their own
  // `listingType` field, so the hint is the only signal available.
  const listingType =
    type === "auction" ? "auction" : type === "preorder" ? "pre-order" : normalizeListingType(item);
  return pluginFor(listingType).detailRoute(id);
}

function priceLabel(item: CompareProductLike): string {
  if (typeof item.price !== "number") return "—";
  return formatCurrency(item.price, item.currency ?? "INR");
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <Stack gap="xs">
      <Text className={FIELD_LABEL_CLASS}>{label}</Text>
      <Div>{children}</Div>
    </Stack>
  );
}

interface ColumnProps {
  item: CompareProductLike;
  productType: CompareOverlayProps["productType"];
  labels: ResolvedLabels;
  onRemove?: (id: string) => void;
  onClose: () => void;
}

function CompareColumn({ item, productType, labels, onRemove, onClose }: ColumnProps) {
  const href = detailHref(item, productType);
  const img = item.mainImage ?? item.images?.[0];
  return (
    <Stack gap="md" className={COLUMN_CARD_CLASS}>
      <Row justify="between" align="start" gap="sm">
        <Link
          href={href}
          target="_blank"
          rel={REL_NOOPENER}
          className="text-[length:var(--appkit-text-sm)] font-semibold text-[var(--appkit-color-text)] hover:underline line-clamp-2"
        >
          {item.title ?? item.id}
        </Link>
        {onRemove && (
          <IconButton
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`${labels.remove} ${item.title ?? item.id}`}
            variant="ghost"
            rounded="full"
            className={CLS_REMOVE_BTN}
          >
            <X className="h-4 w-4" />
          </IconButton>
        )}
      </Row>

      <FieldRow label={labels.field.image}>
        <Link href={href} target="_blank" rel={REL_NOOPENER}>
          <Div className={`relative aspect-square ${__O.hidden}`} rounded="lg" surface="subtle">
            {img ? (
              <MediaImage src={img} alt={item.title ?? item.id} size="card" />
            ) : null}
          </Div>
        </Link>
      </FieldRow>

      <FieldRow label={labels.field.price}>
        <Text size="base" weight="semibold" color="primary">
          {priceLabel(item)}
        </Text>
      </FieldRow>

      <FieldRow label={labels.field.condition}>
        <Text>{item.condition ? <Span className={CHIP_CLASS}>{item.condition}</Span> : "—"}</Text>
      </FieldRow>

      <FieldRow label={labels.field.brand}>
        <Text>{item.brand ? <Span className={CHIP_CLASS}>{item.brand}</Span> : "—"}</Text>
      </FieldRow>

      <FieldRow label={labels.field.category}>
        <Text>
          {(Array.isArray(item.categoryNames) ? item.categoryNames[0] : item.categoryName) || (Array.isArray(item.categorySlugs) ? item.categorySlugs[0] : item.category) ? (
            <Span className={CHIP_CLASS}>{(Array.isArray(item.categoryNames) ? item.categoryNames[0] : item.categoryName) ?? (Array.isArray(item.categorySlugs) ? item.categorySlugs[0] : item.category)}</Span>
          ) : (
            "—"
          )}
        </Text>
      </FieldRow>

      <FieldRow label={labels.field.store}>
        <Text size="sm" color="muted">
          {item.storeName ?? "—"}
        </Text>
      </FieldRow>

      <Button asChild variant="primary" size="sm" className="mt-auto">
        <Link href={href} target="_blank" rel={REL_NOOPENER} onClick={onClose}>
          {labels.view}
        </Link>
      </Button>
    </Stack>
  );
}

function useFetchedProducts(
  productIds: string[] | undefined,
  passedItems: CompareProductLike[] | undefined,
  isOpen: boolean,
): { items: CompareProductLike[]; isLoading: boolean } {
  const [fetched, setFetched] = useState<CompareProductLike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!isOpen || passedItems) return;
    const ids = (productIds ?? []).slice(0, COMPARE_MAX_ITEMS);
    const key = ids.join(",");
    if (!key || key === lastKey.current) return;
    lastKey.current = key;
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/products?ids=${encodeURIComponent(key)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const items = (json?.data?.items ?? []) as CompareProductLike[];
        setFetched(items);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, productIds, passedItems]);

  return {
    items: passedItems ?? fetched,
    isLoading: !passedItems && isLoading,
  };
}

export function CompareOverlay({
  isOpen,
  items: passedItems,
  productIds,
  productType = "product",
  onClose,
  onRemove,
  labels: labelOverrides,
}: CompareOverlayProps) {
  const labels = useMemo<ResolvedLabels>(
    () => ({
      ...DEFAULT_LABELS,
      ...labelOverrides,
      field: { ...DEFAULT_LABELS.field, ...(labelOverrides?.field ?? {}) },
    }),
    [labelOverrides],
  );

  const { items, isLoading } = useFetchedProducts(productIds, passedItems, isOpen);
  const trimmed = useMemo(() => items.slice(0, COMPARE_MAX_ITEMS), [items]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep activeIndex in range as items shrink (e.g. user removes a column).
  useEffect(() => {
    if (activeIndex >= trimmed.length && trimmed.length > 0) {
      setActiveIndex(trimmed.length - 1);
    }
  }, [trimmed.length, activeIndex]);

  // Esc closes overlay.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const swipeRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.style.gridTemplateColumns = `repeat(${trimmed.length}, minmax(0, 1fr))`;
    }
  }, [trimmed.length]);
  useSwipe(swipeRef as React.RefObject<HTMLElement>, {
    onSwipeLeft: () =>
      setActiveIndex((i) => Math.min(trimmed.length - 1, i + 1)),
    onSwipeRight: () => setActiveIndex((i) => Math.max(0, i - 1)),
  });

  const handleRemove = useCallback(
    (id: string) => {
      onRemove?.(id);
    },
    [onRemove],
  );

  if (!isOpen) return null;

  return (
    <Div className={OVERLAY_CLASS} role="dialog" aria-modal="true" aria-label={labels.title}>
      <Row justify="between" align="center" className={HEADER_CLASS}>
        <Heading level={2} size="base" weight="semibold">
          {labels.title}
        </Heading>
        <IconButton
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          variant="ghost"
          rounded="full"
          className="text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface-elevated)]"
        >
          <X className="h-5 w-5" />
        </IconButton>
      </Row>

      <Div className={`flex-1 ${__O.auto} ${__P.p4}`}>
        {isLoading ? (
          // audit-content-alignment-ok: loading-state text inside a transient overlay panel, not marketing content
          <Text paddingY="3xl" variant="secondary" align="center">
            Loadingâ€¦
          </Text>
        ) : trimmed.length === 0 ? (
          // audit-content-alignment-ok: empty-state inside a transient overlay panel, not marketing content
          <Text paddingY="3xl" variant="secondary" align="center">
            {labels.empty}
          </Text>
        ) : (
          <>
            {/* Desktop / tablet — grid of columns */}
            <Div ref={gridRef} gap="4" className="hidden md:grid">
              {trimmed.map((item) => (
                <CompareColumn
                  key={item.id}
                  item={item}
                  productType={productType}
                  labels={labels}
                  onRemove={onRemove ? handleRemove : undefined}
                  onClose={onClose}
                />
              ))}
            </Div>

            {/* Mobile — swipeable single card + dots */}
            <Div className="md:hidden">
              <Div ref={swipeRef} className="touch-pan-y">
                {trimmed[activeIndex] && (
                  <CompareColumn
                    item={trimmed[activeIndex]}
                    productType={productType}
                    labels={labels}
                    onRemove={onRemove ? handleRemove : undefined}
                    onClose={onClose}
                  />
                )}
              </Div>
              {trimmed.length > 1 && (
                <Row justify="center" gap="xs" className="mt-4">
                  {trimmed.map((it, idx) => (
                    <Button
                      variant="ghost"
                      key={it.id}
                      type="button"
                      aria-label={`Show item ${idx + 1}`}
                      onClick={() => setActiveIndex(idx)}
                      rounded="full"
                      paddingX="none"
                      paddingY="none"
                      className={`h-2 w-2 min-w-0 transition-colors ${
 idx === activeIndex
 ? "bg-primary"
 : "bg-[var(--appkit-color-border)]"
 }`}
                    />
                  ))}
                </Row>
              )}
            </Div>
          </>
        )}
      </Div>
    </Div>
  );
}
