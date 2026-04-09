import React from "react";
import Link from "next/link";
import type { LayoutSlots } from "@mohasinac/contracts";
import { Div, Heading, Span, Text } from "@mohasinac/ui";
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
      className={`block rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {store.storeBannerURL ? (
        <Div className="h-24 overflow-hidden bg-gray-100">
          <Div
            role="img"
            aria-label={`${store.storeName} banner`}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${store.storeBannerURL})` }}
          />
        </Div>
      ) : (
        <Div className="h-24 bg-gradient-to-br from-orange-50 to-orange-100" />
      )}
      <Div className="px-4 pb-4">
        <Div className="-mt-6 mb-3">
          {store.storeLogoURL ? (
            <Div
              role="img"
              aria-label={store.storeName}
              className="h-12 w-12 rounded-lg border-2 border-white bg-center bg-cover shadow-sm"
              style={{ backgroundImage: `url(${store.storeLogoURL})` }}
            />
          ) : (
            <Div className="h-12 w-12 rounded-lg border-2 border-white bg-orange-100 flex items-center justify-center text-orange-600 font-bold shadow-sm">
              {store.storeName[0]?.toUpperCase()}
            </Div>
          )}
        </Div>
        <Heading
          level={3}
          className="font-semibold text-gray-900 text-sm truncate"
        >
          {store.storeName}
        </Heading>
        {store.storeDescription && (
          <Text className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {store.storeDescription}
          </Text>
        )}
        <Div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
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
        </Div>
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
      <Text className="text-center text-gray-500 py-12">
        {labels.empty ?? "No stores found."}
      </Text>
    );
  }

  return (
    <Div className="space-y-4">
      {slots?.renderHeader
        ? (slots.renderHeader({ total }) as React.ReactNode)
        : null}
      <Div
        className={`grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 ${className}`}
      >
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
      </Div>
      {slots?.renderFooter
        ? (slots.renderFooter({
            page: currentPage,
            totalPages,
          }) as React.ReactNode)
        : null}
    </Div>
  );
}
