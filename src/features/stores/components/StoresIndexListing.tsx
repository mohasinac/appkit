"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useStores } from "../hooks/useStores";
import {
  Div,
  Grid,
  Input,
  Pagination,
  SlottedListingView,
  SortDropdown,
} from "../../../ui";
import { ROUTES } from "../../../next";
import { InteractiveStoreCard } from "./InteractiveStoreCard";

export interface StoresIndexListingProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
}

export function StoresIndexListing({ initialData }: StoresIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });

  const { stores, total, totalPages, isLoading } = useStores(
    {
      page: table.getNumber("page", 1),
      pageSize: table.getNumber("pageSize", 24),
      sort: table.get("sort") || undefined,
      category: table.get("category") || undefined,
    },
    { initialData },
  );

  return (
    <Div className="min-h-screen">
      <SlottedListingView
        portal="public"
        manageSearch
        manageSort
        inlineToolbar
        renderSearch={(search, setSearch) => (
          <Input
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search stores..."
            className="max-w-sm"
          />
        )}
        renderSort={(value, onChange) => (
          <SortDropdown
            value={value}
            onChange={onChange}
            options={[
              { value: "-createdAt", label: "Newest First" },
              { value: "storeName", label: "A-Z" },
              { value: "-itemsSold", label: "Most Sales" },
              { value: "-averageRating", label: "Top Rated" },
            ]}
          />
        )}
        renderTable={() => (
          <Grid cols={3} gap="md">
            {stores.map((store) => (
              <InteractiveStoreCard
                key={store.storeSlug ?? store.id}
                store={store}
                href={String(ROUTES.PUBLIC.STORE_DETAIL(store.storeSlug ?? store.id))}
              />
            ))}
          </Grid>
        )}
        renderPagination={() => (
          <Pagination
            currentPage={table.getNumber("page", 1)}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        )}
        total={total}
        isLoading={isLoading}
      />
    </Div>
  );
}
