import { Container } from "../../../ui/components/Layout";
import { Heading } from "../../../ui/components/Typography";
import { Main, Section } from "../../../ui/components/Semantic";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CollectorDropsIndexListing } from "../../products/components/CollectorDropsIndexListing";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const COLLECTOR_DROP_LISTING_TYPES = ["collector-drop"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "collectorDropEndDate";

export interface CollectorDropsListViewProps {
  searchParams?: SearchParams;
}

export async function CollectorDropsListView({ searchParams = {} }: CollectorDropsListViewProps) {
  // Shared with /api/products, and derived rather than hardcoded — this view
  // carried a literal `hideEndedByDefault: true` until 2026-08-24, which is
  // exactly the mirrored-literal shape Root Cause #30 is written as.
  const initial = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: COLLECTOR_DROP_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      ...defaultAvailabilityForListingTypes(COLLECTOR_DROP_LISTING_TYPES),
    }),
  );

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Live Collector Drops
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <CollectorDropsIndexListing initialData={initial} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
