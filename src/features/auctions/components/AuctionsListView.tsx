import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Heading, Main, Section } from "../../../ui";
import { MarketplaceAuctionGrid } from "./MarketplaceAuctionGrid";
import { AdSlot } from "../../homepage/components/AdSlot";

export async function AuctionsListView() {
  const result = await productRepository
    .list({
      filters: "status==published,isAuction==true",
      sorts: "auctionEndDate",
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  const auctions = (result?.items ?? []).map((p: any) => ({
    id: p.id,
    title: p.title ?? p.name ?? "",
    description: p.description,
    price: p.price ?? 0,
    currency: p.currency,
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

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900">
            Live Auctions
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <MarketplaceAuctionGrid
            auctions={auctions}
            labels={{
              emptyTitle: "No live auctions right now",
              emptyDescription: "Check back soon for new listings.",
            }}
          />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
