"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useProducts } from "../../products/hooks/useProducts";
import {
  Container,
  Grid,
  Input,
  Pagination,
  Section,
  SlottedListingView,
  SortDropdown,
  Stack,
  Text,
} from "../../../ui";
import { MarketplaceAuctionCard } from "../../auctions/components/MarketplaceAuctionCard";
import { getDefaultCurrency } from "../../../core/baseline-resolver";

export interface StoreAuctionsListingProps {
  sellerId: string;
  initialData?: any;
}

export function StoreAuctionsListing({ sellerId, initialData }: StoreAuctionsListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "24", sort: "auctionEndDate" } });

  const params = {
    sort: table.get("sort") || undefined,
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", 24),
    sellerId,
    isAuction: true,
  };

  const { products: rawAuctions, total, totalPages, page, isLoading } = useProducts(
    params as any,
    { initialData },
  );

  const auctions = rawAuctions.map((p: any) => ({
    id: p.id,
    title: p.title ?? p.name ?? "",
    description: p.description,
    price: p.price ?? 0,
    currency: p.currency || getDefaultCurrency(),
    mainImage: p.mainImage ?? p.images?.[0],
    images: p.images,
    isAuction: true as const,
    auctionEndDate: p.auctionEndDate,
    startingBid: p.startingBid ?? p.price,
    currentBid: p.currentBid,
    bidCount: p.bidCount,
    featured: p.featured,
    status: p.status,
    slug: p.slug,
    buyNowPrice: p.buyNowPrice,
  }));

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
                { value: "-currentBid", label: "Highest Bid" },
              ]}
            />
          )}
          renderTable={() =>
            auctions.length === 0 && !isLoading ? (
              <Stack align="center" gap="3" className="justify-center py-24 text-center">
                <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                  No auctions yet
                </Text>
                <Text className="text-sm text-zinc-500">
                  This store has no active auctions.
                </Text>
              </Stack>
            ) : (
              <Grid cols="productCards" gap="md">
                {auctions.map((item) => (
                  <MarketplaceAuctionCard key={item.id} product={item as any} />
                ))}
              </Grid>
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
