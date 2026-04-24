import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "../../../contracts";
import { Div, Grid, Heading, RichText, Row, Span, Text } from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { THEME_CONSTANTS } from "../../../tokens";
import type { StoreListItem } from "../types";

interface StoreCardProps {
  store: StoreListItem;
  labels?: { products?: string; reviews?: string; sold?: string };
  className?: string;
}

function StoreCard({ store, labels = {}, className = "" }: StoreCardProps) {
  return (
    <Link
      href={`/stores/${store.storeSlug}`}
      className={`block rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {store.storeBannerURL ? (
        <Div className="h-24 overflow-hidden bg-gray-100 dark:bg-slate-800">
          <Div
            role="img"
            aria-label={`${store.storeName} banner`}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${store.storeBannerURL})` }}
          />
        </Div>
      ) : (
        <Div className="h-24 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20" />
      )}
      <Div className="px-4 pb-4">
        <Div className="-mt-6 mb-3">
          {store.storeLogoURL ? (
            <Div
              role="img"
              aria-label={store.storeName}
              className="h-12 w-12 rounded-lg border-2 border-white dark:border-slate-800 bg-center bg-cover shadow-sm"
              style={{ backgroundImage: `url(${store.storeLogoURL})` }}
            />
          ) : (
            <Div className="h-12 w-12 rounded-lg border-2 border-white dark:border-slate-800 bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold shadow-sm">
              {store.storeName[0]?.toUpperCase()}
            </Div>
          )}
        </Div>
        <Heading
          level={3}
          className="font-semibold text-gray-900 dark:text-zinc-100 text-sm truncate"
        >
          {store.storeName}
        </Heading>
        {store.storeDescription && (
          <RichText
            html={normalizeRichTextHtml(store.storeDescription)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className={`mt-0.5 text-xs text-gray-500 dark:text-zinc-400 ${THEME_CONSTANTS.utilities.textClamp2}`}
          />
        )}
        <Row className="gap-3 mt-2 text-xs text-gray-400 dark:text-zinc-500">
          {store.totalProducts != null && (
            <Span>
              {store.totalProducts} {labels.products ?? "products"}
            </Span>
          )}
          {store.itemsSold != null && (
            <Span>
              {store.itemsSold} {labels.sold ?? "sold"}
            </Span>
          )}
          {store.averageRating != null && (
            <Span>★ {store.averageRating.toFixed(1)}</Span>
          )}
        </Row>
      </Div>
    </Link>
  );
}

interface StoresListViewProps<T extends StoreListItem = StoreListItem> {
  stores: T[];
  labels?: {
    products?: string;
    reviews?: string;
    sold?: string;
    empty?: string;
  };
  total?: number;
  currentPage?: number;
  totalPages?: number;
  className?: string;
  /** Render-prop slot overrides — pass via `FeatureExtension.slots`. */
  slots?: LayoutSlots<T>;
}

export function StoresListView<T extends StoreListItem = StoreListItem>({
  stores,
  labels = {},
  total = 0,
  currentPage = 1,
  totalPages = 1,
  className = "",
  slots,
}: StoresListViewProps<T>) {
  if (stores.length === 0) {
    if (slots?.renderEmptyState) {
      return <>{slots.renderEmptyState() as React.ReactNode}</>;
    }
    return (
      <Text className="text-center text-gray-500 dark:text-zinc-400 py-12">
        {labels.empty ?? "No stores found."}
      </Text>
    );
  }

  return (
    <Div className="space-y-4">
      {slots?.renderHeader
        ? (slots.renderHeader({ total }) as React.ReactNode)
        : null}
      <Grid cols="storeCards" gap="md" className={className}>
        {stores.map((store, i) =>
          slots?.renderCard ? (
            <React.Fragment key={store.id}>
              {slots.renderCard(store, i) as React.ReactNode}
            </React.Fragment>
          ) : (
            <StoreCard
              key={store.id}
              store={store as StoreListItem}
              labels={labels}
            />
          ),
        )}
      </Grid>
      {slots?.renderFooter
        ? (slots.renderFooter({
            page: currentPage,
            totalPages,
          }) as React.ReactNode)
        : null}
    </Div>
  );
}
