"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import {
  Container,
  Div,
  Grid,
  Input,
  Pagination,
  Section,
  SlottedListingView,
  SortDropdown,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";
import { ProductFilters } from "../../products/components/ProductFilters";

export interface StoreProductsListingProps {
  sellerId: string;
  initialData?: any;
}

export function StoreProductsListing({ sellerId, initialData }: StoreProductsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "-createdAt" } });

  const params = {
    q: table.get("q") || undefined,
    condition: table.get("condition") || undefined,
    minPrice: table.get("minPrice") ? Number(table.get("minPrice")) : undefined,
    maxPrice: table.get("maxPrice") ? Number(table.get("maxPrice")) : undefined,
    sort: table.get("sort") || undefined,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    sellerId,
    isAuction: false,
  };

  const { products, total, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  return (
    <Section>
      <Container size="xl">
        <SlottedListingView
          portal="public"
          manageSearch
          manageSort
          inlineToolbar
          renderSearch={(search, setSearch) => (
            <Input
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              placeholder="Search store products..."
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
                { value: "title", label: "Title A-Z" },
              ]}
            />
          )}
          renderFilters={() => <ProductFilters table={table as any} />}
          renderTable={() =>
            products.length === 0 && !isLoading ? (
              <Stack align="center" gap="3" className="justify-center py-24 text-center">
                <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                  No products yet
                </Text>
                <Text className="text-sm text-zinc-500">
                  This store has not listed any products yet.
                </Text>
              </Stack>
            ) : (
              <Div>
                <Grid cols="productCards" gap="md">
                  {products.map((p: any) => (
                    <InteractiveProductCard
                      key={p.id}
                      product={p as any}
                      href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(p.slug ?? p.id))}
                    />
                  ))}
                </Grid>
              </Div>
            )
          }
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
      </Container>
    </Section>
  );
}
