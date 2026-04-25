"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../hooks/useProducts";
import {
  Div,
  Input,
  Pagination,
  SortDropdown,
  SlottedListingView,
} from "../../../ui";
import { MarketplaceAuctionGrid } from "../../auctions/components/MarketplaceAuctionGrid";
import { ProductFilters } from ".";

export interface AuctionsIndexListingProps {
  initialData?: any;
}

export function AuctionsIndexListing({ initialData }: AuctionsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "auctionEndDate" } });

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    sort: table.get("sort") || undefined,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isAuction: true,
  };

  const { products: auctions, total, totalPages, page, isLoading } = useProducts(params as any, { initialData });

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
            placeholder="Search auctions..."
            className="max-w-sm"
          />
        )}
        renderSort={(value, onChange) => (
          <SortDropdown
            value={value}
            onChange={onChange}
            options={[
              { value: "auctionEndDate", label: "Ending Soonest" },
              { value: "-createdAt", label: "Newest" },
            ]}
          />
        )}
        renderFilters={() => <ProductFilters table={table as any} />}
        renderTable={() => (
          <MarketplaceAuctionGrid auctions={auctions as any[]} />
        )}
        renderPagination={() => (
          <Pagination
            currentPage={page}
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
