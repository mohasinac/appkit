import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";

export async function AuctionsListView() {
  const result = await productRepository
    .list({
      filters: "status==published,isAuction==true",
      sorts: "auctionEndDate",
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  const initial = result ?? null;

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900">
            Live Auctions
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <AuctionsIndexListing initialData={initial} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
