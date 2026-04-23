import React from "react";
import { productRepository, storeRepository } from "../../../repositories";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { Container, Grid, Section, Stack, Text } from "../../../ui";
import { MarketplaceAuctionCard } from "../../auctions/components/MarketplaceAuctionCard";

export interface StoreAuctionsPageViewProps {
  storeSlug: string;
}

export async function StoreAuctionsPageView({ storeSlug }: StoreAuctionsPageViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);
  const ownerId = (store as Record<string, any>)?.ownerId;

  const result = ownerId
    ? await productRepository
        .list({
          filters: `sellerId==${ownerId},status==published,isAuction==true`,
          sorts: "auctionEndDate",
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  const items = (result?.items ?? []).map((p: any) => ({
    id: p.id,
    title: p.title ?? p.name ?? "",
    description: p.description,
    price: p.price ?? 0,
    currency: p.currency || getDefaultCurrency(),
    mainImage: p.mainImage ?? p.images?.[0],
    images: p.images,
    isAuction: true,
    auctionEndDate: p.auctionEndDate,
    startingBid: p.startingBid ?? p.price,
    currentBid: p.currentBid,
    bidCount: p.bidCount,
    featured: p.featured,
    status: p.status,
    slug: p.slug,
    buyNowPrice: p.buyNowPrice,
  }));

  if (items.length === 0) {
    return (
      <Stack align="center" gap="3" className="justify-center py-24 text-center">
        <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">No auctions yet</Text>
        <Text className="text-sm text-zinc-500">
          This store has no active auctions.
        </Text>
      </Stack>
    );
  }

  return (
    <Section>
      <Container size="xl">
        <Grid cols="productCards" gap="md">
          {items.map((item) => (
            <MarketplaceAuctionCard key={item.id} product={item as any} />
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
