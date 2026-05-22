"use client";
/**
 * CompareOverlay â€” BK3
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const REL_NOOPENER = "noopener noreferrer";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, Div, Heading, Row, Stack, Text } from "../../../ui";
import { useSwipe } from "../../../react/hooks/useSwipe";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils/number.formatter";
import { COMPARE_MAX_ITEMS } from "../constants/action-defs";
import { isAuctionListing, isPreOrderListing } from "../utils/listing-type";

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
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live";
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
  "fixed inset-0 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden";
const OVERLAY_STYLE: React.CSSProperties = { zIndex: "var(--appkit-z-modal, 60)" as unknown as number };
const HEADER_CLASS =
  "flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3";
const FIELD_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
const CHIP_CLASS =
  "inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 text-xs";
const COLUMN_CARD_CLASS =
  "flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3";

function detailHref(item: CompareProductLike, type: CompareOverlayProps["productType"]): string {
  const id = item.slug ?? item.id;
  if (type === "auction" || isAuctionListing(item)) {
    return String(ROUTES.PUBLIC.AUCTION_DETAIL(id));
  }
  if (type === "preorder" || isPreOrderListing(item)) {
    return String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(id));
  }
  return String(ROUTES.PUBLIC.PRODUCT_DETAIL(id));
}

function priceLabel(item: CompareProductLike): string {
  if (typeof item.price !== "number") return "â€”";
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
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline line-clamp-2"
        >
          {item.title ?? item.id}
        </Link>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`${labels.remove} ${item.title ?? item.id}`}
            className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-500 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </Row>

      <FieldRow label={labels.field.image}>
        <Link href={href} target="_blank" rel={REL_NOOPENER}>
          <Div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={item.title ?? item.id}
                className="h-full w-full object-cover"
              />
            ) : null}
          </Div>
        </Link>
      </FieldRow>

      <FieldRow label={labels.field.price}>
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {priceLabel(item)}
        </Text>
      </FieldRow>

      <FieldRow label={labels.field.condition}>
        <Text>{item.condition ? <span className={CHIP_CLASS}>{item.condition}</span> : "â€”"}</Text>
      </FieldRow>

      <FieldRow label={labels.field.brand}>
        <Text>{item.brand ? <span className={CHIP_CLASS}>{item.brand}</span> : "â€”"}</Text>
      </FieldRow>

      <FieldRow label={labels.field.category}>
        <Text>
          {(Array.isArray(item.categoryNames) ? item.categoryNames[0] : item.categoryName) || (Array.isArray(item.categorySlugs) ? item.categorySlugs[0] : item.category) ? (
            <span className={CHIP_CLASS}>{(Array.isArray(item.categoryNames) ? item.categoryNames[0] : item.categoryName) ?? (Array.isArray(item.categorySlugs) ? item.categorySlugs[0] : item.category)}</span>
          ) : (
            "â€”"
          )}
        </Text>
      </FieldRow>

      <FieldRow label={labels.field.store}>
        <Text className="text-sm text-zinc-700 dark:text-zinc-300">
          {item.storeName ?? "â€”"}
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
    <Div className={OVERLAY_CLASS} style={OVERLAY_STYLE} role="dialog" aria-modal="true" aria-label={labels.title}>
      <Row justify="between" align="center" className={HEADER_CLASS}>
        <Heading level={2} className="text-base font-semibold">
          {labels.title}
        </Heading>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="rounded-full p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>
      </Row>

      <Div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <Text variant="secondary" className="text-center py-12">
            Loadingâ€¦
          </Text>
        ) : trimmed.length === 0 ? (
          <Text variant="secondary" className="text-center py-12">
            {labels.empty}
          </Text>
        ) : (
          <>
            {/* Desktop / tablet â€” grid of columns */}
            <Div
              className="hidden md:grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${trimmed.length}, minmax(0, 1fr))`,
              }}
            >
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

            {/* Mobile â€” swipeable single card + dots */}
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
                    <button
                      key={it.id}
                      type="button"
                      aria-label={`Show item ${idx + 1}`}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        idx === activeIndex
                          ? "bg-primary"
                          : "bg-zinc-300 dark:bg-zinc-700"
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
