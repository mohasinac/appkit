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
import type { ViewMode } from "../../../ui";
import { ROUTES } from "../../../next";
import { ProductGrid, ProductFilters } from ".";

export interface ProductsIndexListingProps {
  initialData?: any;
}

export function ProductsIndexListing({ initialData }: ProductsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    condition: table.get("condition") || undefined,
    sort: table.get("sort") || undefined,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isAuction: false,
  };

  const { products, total, totalPages, page, isLoading } = useProducts(params as any, { initialData });

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
            placeholder="Search products..."
            className="max-w-sm"
          />
        )}
        renderSort={(value, onChange) => (
          <SortDropdown
            value={value}
            onChange={onChange}
            options={[
              { value: "-createdAt", label: "Newest First" },
              { value: "-price", label: "Price: High to Low" },
              { value: "price", label: "Price: Low to High" },
            ]}
          />
        )}
        renderFilters={() => <ProductFilters table={table as any} />}
        renderTable={() => (
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) => String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))}
            view={(table.get("view") as ViewMode) || "card"}
          />
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
