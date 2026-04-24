import Link from "next/link";
import type { StoreListItem } from "../types";
import { Heading, Text, Span, Row, Button, RichText, Div } from "../../../ui";
import { THEME_CONSTANTS, LAYOUT } from "../../../tokens";
import { MediaImage } from "../../media/MediaImage";
import { normalizeRichTextHtml } from "../../../utils";

export interface InteractiveStoreCardProps {
  store: StoreListItem;
  /** Resolved href for the store detail page. */
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

/**
 * Generic store card with optional selection.
 * Callers compute `href` using their locale-aware routing helper.
 */
export function InteractiveStoreCard({
  store,
  href,
  selectable,
  selected,
  onSelect,
  labels = {},
  className = "",
}: InteractiveStoreCardProps) {
  return (
    <Div
      className={`relative flex ${LAYOUT.cardHeight.store} min-w-[190px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {selectable && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={selected ? "Deselect store" : "Select store"}
          onClick={(e) => {
            e.preventDefault();
            onSelect?.(store.id, !selected);
          }}
          className={`absolute top-2 left-2 z-10 h-5 w-5 rounded border-2 ${selected ? "bg-primary-500 border-primary-500" : "bg-white border-gray-300"} flex items-center justify-center`}
        >
          {selected && (
            <Span className="text-white text-xs leading-none">✓</Span>
          )}
        </Button>
      )}

      <Link href={href} className="block">
        {store.storeBannerURL ? (
          <Div className="aspect-video overflow-hidden bg-zinc-100 dark:bg-slate-800">
            <MediaImage
              src={store.storeBannerURL}
              alt={`${store.storeName} banner`}
              size="banner"
              className="h-full w-full object-cover"
            />
          </Div>
        ) : (
          <Div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-slate-800 dark:to-slate-700" />
        )}

        <Div className="flex flex-1 flex-col px-4 pb-4">
          <Div className="-mt-6 mb-3">
            {store.storeLogoURL ? (
              <MediaImage
                src={store.storeLogoURL}
                alt={store.storeName}
                size="avatar"
                className="h-12 w-12 rounded-lg border-2 border-white object-cover shadow-sm"
              />
            ) : (
              <Div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-primary-100 text-lg font-bold text-primary-700 shadow-sm dark:bg-primary-900/40 dark:text-primary-300">
                {store.storeName[0]?.toUpperCase()}
              </Div>
            )}
          </Div>
          <Heading
            level={3}
            className={`${THEME_CONSTANTS.utilities.textClamp2} text-sm font-semibold text-zinc-900 dark:text-zinc-100`}
          >
            {store.storeName}
          </Heading>
          <RichText
            html={normalizeRichTextHtml(store.storeDescription ?? "")}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className={`mt-1 ${THEME_CONSTANTS.utilities.textClamp2} min-h-9 text-xs text-zinc-500 dark:text-zinc-400`}
          />
          <Row gap="sm" className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            {store.totalProducts != null && store.totalProducts > 0 && (
              <Span>
                {store.totalProducts} {labels.products ?? "products"}
              </Span>
            )}
            {store.itemsSold != null && store.itemsSold > 0 && (
              <Span>
                {store.itemsSold} {labels.sold ?? "sold"}
              </Span>
            )}
            {store.averageRating != null && store.averageRating > 0 && (
              <Span>★ {store.averageRating.toFixed(1)}</Span>
            )}
          </Row>
          <Text className="mt-auto pt-3 text-xs font-medium text-primary dark:text-primary-400">
            {labels.visitStore ?? "Visit store"} →
          </Text>
        </Div>
      </Link>
    </Div>
  );
}
