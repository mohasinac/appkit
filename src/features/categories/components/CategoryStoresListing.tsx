"use client";
import React from "react";
import { InteractiveStoreCard } from "../../stores/components/InteractiveStoreCard";
import { ROUTES } from "../../../next/routing/route-map";
import { Grid, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import type { StoreListItem } from "../../stores/types";

export interface CategoryStoresListingProps {
  stores: StoreListItem[];
}

export function CategoryStoresListing({ stores }: CategoryStoresListingProps) {
  if (stores.length === 0) {
    return (
      <Stack justify="center" className="text-left" padding="y-4xl" align="start">
        <Text size="sm" color="muted">
          No stores found in this category.
        </Text>
      </Stack>
    );
  }

  return (
    <Grid cols="cards" gap="lg">
      {stores.map((store) => (
        <InteractiveStoreCard
          key={store.id}
          store={store}
          href={String(ROUTES.PUBLIC.STORE_DETAIL(store.storeSlug))}
        />
      ))}
    </Grid>
  );
}
