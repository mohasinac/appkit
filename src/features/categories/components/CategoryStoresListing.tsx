"use client";
import React from "react";
import { InteractiveStoreCard } from "../../stores/components/InteractiveStoreCard";
import { ROUTES } from "../../../next";
import { Div, Text } from "../../../ui";
import type { StoreListItem } from "../../stores/types";

export interface CategoryStoresListingProps {
  stores: StoreListItem[];
}

export function CategoryStoresListing({ stores }: CategoryStoresListingProps) {
  if (stores.length === 0) {
    return (
      <Div className="flex flex-col items-center justify-center py-16 text-center">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm">
          No stores found in this category.
        </Text>
      </Div>
    );
  }

  return (
    <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {stores.map((store) => (
        <InteractiveStoreCard
          key={store.id}
          store={store}
          href={String(ROUTES.PUBLIC.STORE_DETAIL(store.storeSlug))}
        />
      ))}
    </Div>
  );
}
