import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const AUCTION_LISTING_TYPES = ["auction"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "auctionEndDate";

export interface AuctionsListViewProps {
  searchParams?: SearchParams;
}

export async function AuctionsListView({ searchParams = {} }: AuctionsListViewProps) {
  // Shared with /api/products, and derived rather than hardcoded — this view
  // carried a literal `hideEndedByDefault: true` until 2026-08-24, which is
  // exactly the mirrored-literal shape Root Cause #30 is written as.
  const initial = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: AUCTION_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      ...defaultAvailabilityForListingTypes(AUCTION_LISTING_TYPES),
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
