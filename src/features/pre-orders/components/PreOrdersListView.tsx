import { Container, Main, Heading, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { PreOrdersIndexListing } from "./PreOrdersIndexListing";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const PRE_ORDER_LISTING_TYPES = ["pre-order"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

export interface PreOrdersListViewProps {
  searchParams?: SearchParams;
}

export async function PreOrdersListView({ searchParams = {} }: PreOrdersListViewProps) {
  // Shared with /api/products, and derived rather than hardcoded. This view
  // carried a literal `hideSoldByDefault: true` until 2026-08-24 even though
  // pre-order's registered hide-default is "closed" — so /pre-orders and
  // /products disagreed about what "closed" meant for the same rows.
  const result = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: PRE_ORDER_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      ...defaultAvailabilityForListingTypes(PRE_ORDER_LISTING_TYPES),
    }),
  );

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Pre-Orders
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <PreOrdersIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
