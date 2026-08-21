import { Container, Main, Heading, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { PreOrdersIndexListing } from "./PreOrdersIndexListing";
import {
  listPublicProducts,
  parsePublicProductParams,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const PRE_ORDER_LISTING_TYPES = ["pre-order"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

export interface PreOrdersListViewProps {
  searchParams?: SearchParams;
}

export async function PreOrdersListView({ searchParams = {} }: PreOrdersListViewProps) {
  // Shared with /api/products. `hideSoldByDefault` covers this page's
  // "Show closed" toggle — the stockQuantity predicate runs in memory over a
  // bounded fetch because the default sort is createdAt, not stockQuantity.
  const result = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: PRE_ORDER_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      hideSoldByDefault: true,
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
