import Link from "next/link";
import type { StoreListItem } from "../types";
import { Heading, Span, Row, Button, RichText, Div } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import { normalizeRichTextHtml } from "../../../utils";

export interface InteractiveStoreCardProps {
  store: StoreListItem;
  href: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  labels?: {
    products?: string;
    sold?: string;
    reviews?: string;
    visitStore?: string;
  };
  className?: string;
}

export function InteractiveStoreCard({
  store,
  href,
  selectable,
  selected,
  onSelect,
  labels = {},
  className = "",
}: InteractiveStoreCardProps) {
  const initial = store.storeName[0]?.toUpperCase() ?? "S";
  const hasLogo = Boolean(store.storeLogoURL);
  const hasBanner = Boolean(store.storeBannerURL);

  return (
    <div
      className={`group relative flex flex-col h-full overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-shadow hover:shadow-lg ${
        selected
          ? "border-primary outline outline-2 outline-primary"
          : "border-zinc-200 dark:border-zinc-700"
      } ${className}`}
    >
      {selectable && (
        <Button
          type="button"
          aria-label={selected ? "Deselect store" : "Select store"}
          onClick={(e) => {
            e.preventDefault();
            onSelect?.(store.id, !selected);
          }}
          className={`absolute top-2.5 left-2.5 z-10 h-5 w-5 rounded border-2 flex items-center justify-center bg-white/90 dark:bg-zinc-800/90 ${
            selected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"
          }`}
        >
          {selected && <Span className="text-white text-xs leading-none">✓</Span>}
        </Button>
      )}

      <Link href={href} className="flex flex-col flex-1 min-h-0">
        {/* ── Banner ──────────────────────────────────────────────────── */}
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-900 flex-shrink-0">
          {hasBanner ? (
            <div
              className="absolute inset-0 bg-center bg-cover transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${store.storeBannerURL})` }}
              role="img"
              aria-label={`${store.storeName} banner`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl opacity-20 select-none" aria-hidden="true">🏪</span>
            </div>
          )}
          {/* Dark gradient at bottom for logo legibility */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          {/* Rating badge — top right */}
          {store.averageRating != null && store.averageRating > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-yellow-300">
              ★ {store.averageRating.toFixed(1)}
            </div>
          )}
        </div>

        {/* ── Info section ────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 px-4 pb-4">
          {/* Logo — overlaps banner bottom edge */}
          <div className="-mt-5 mb-2 flex items-end justify-between">
            <div className="flex-shrink-0">
              {hasLogo ? (
                <div
                  className="h-10 w-10 rounded-lg border-2 border-white dark:border-zinc-800 bg-center bg-cover shadow-md"
                  style={{ backgroundImage: `url(${store.storeLogoURL})` }}
                  role="img"
                  aria-label={store.storeName}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white dark:border-zinc-800 bg-primary/10 dark:bg-primary/20 text-base font-bold text-primary shadow-md">
                  {initial}
                </div>
              )}
            </div>
          </div>

          {/* Store name */}
          <Heading
            level={3}
            className={`${THEME_CONSTANTS.utilities.textClamp1} text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors`}
          >
            {store.storeName}
          </Heading>

          {/* Description */}
          {store.storeDescription ? (
            <RichText
              html={normalizeRichTextHtml(store.storeDescription)}
              proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
              className={`mt-1 ${THEME_CONSTANTS.utilities.textClamp2} text-xs text-zinc-500 dark:text-zinc-400 flex-1`}
            />
          ) : (
            <div className="flex-1" />
          )}

          {/* Stats row */}
          <Row gap="sm" className="mt-2.5 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
            {store.totalProducts != null && store.totalProducts > 0 && (
              <Span className="flex items-center gap-0.5">
                <span aria-hidden="true">📦</span> {store.totalProducts} {labels.products ?? "products"}
              </Span>
            )}
            {store.itemsSold != null && store.itemsSold > 0 && (
              <Span className="flex items-center gap-0.5">
                <span aria-hidden="true">🛍️</span> {store.itemsSold} {labels.sold ?? "sold"}
              </Span>
            )}
          </Row>

          {/* CTA */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-primary group-hover:underline transition-colors">
              {labels.visitStore ?? "Visit store"} →
            </span>
            {store.totalReviews != null && store.totalReviews > 0 && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {store.totalReviews} {labels.reviews ?? "reviews"}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
