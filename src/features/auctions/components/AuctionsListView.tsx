import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import {
  listPublicProducts,
  parsePublicProductParams,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const AUCTION_LISTING_TYPES = ["auction"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "auctionEndDate";

export interface AuctionsListViewProps {
  searchParams?: SearchParams;
}

export async function AuctionsListView({ searchParams = {} }: AuctionsListViewProps) {
  // Shared with /api/products. `hideEndedByDefault` mirrors
  // AuctionsIndexListing's `showEnded ? … : dateFrom=now` default; because the
  // default sort IS auctionEndDate, listPublicProducts pushes that range into
  // Firestore rather than filtering in memory.
  const initial = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: AUCTION_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      hideEndedByDefault: true,
    }),
  );

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
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
