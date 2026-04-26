"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import {
  Div,
  Grid,
  Input,
  Pagination,
  SlottedListingView,
  SortDropdown,
} from "../../../ui";
import { ROUTES } from "../../../next";
import { MarketplacePreorderCard } from "./MarketplacePreorderCard";

export interface PreOrdersIndexListingProps {
  initialData?: any;
}

export function PreOrdersIndexListing({ initialData }: PreOrdersIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });

  const params = {
    q: table.get("q") || undefined,
    category: table.get("category") || undefined,
    sort: table.get("sort") || undefined,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    isPreOrder: true,
  };

  const { products: preOrders, total, totalPages, page, isLoading } = useProducts(
    params as any,
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
            placeholder="Search pre-orders..."
            className="max-w-sm"
          />
        )}
        renderSort={(value, onChange) => (
          <SortDropdown
            value={value}
            onChange={onChange}
            options={[
              { value: "-createdAt", label: "Newest First" },
              { value: "preOrderDeliveryDate", label: "Delivery Soon" },
              { value: "-price", label: "Price: High to Low" },
              { value: "price", label: "Price: Low to High" },
            ]}
          />
        )}
        renderTable={() => (
          <Grid cols={4} gap="md">
            {preOrders.map((product: any) => (
              <MarketplacePreorderCard
                key={product.id}
                product={product}
                hrefBuilder={(p) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id))}
              />
            ))}
          </Grid>
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
