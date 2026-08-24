import { Container, Main, Heading, Section, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
} from "../../../_internal/server/features/products/list-public";
import { PrizeDrawsIndexListing } from "./PrizeDrawsIndexListing";

type SearchParams = Record<string, string | string[]>;

const LISTING_TYPES = ["prize-draw"] as const;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface PrizeDrawsListingViewProps {
  searchParams?: SearchParams;
}

/**
 * Public listing page (SB4-F). Server-fetches published prize-draw products,
 * hydrates the client `PrizeDrawsIndexListing` which renders the filter
 * toolbar + collage-thumb grid. URL params: `?storeId=…&prizeRevealStatus=…`.
 *
 * Per the public-buyer contract, the product adapter strips `isWon` from
 * `prizeDrawItems[]` server-side; the cards never reveal which prizes are
 * already gone (matches `PrizeDrawCollage`'s `hideWonState` prop).
 */
export async function PrizeDrawsListingView({
  searchParams = {},
}: PrizeDrawsListingViewProps) {
  // Routed through the shared query (2026-08-21). The hand-rolled builder this
  // replaces had its own Root Cause #30 divergence: it applied the price range
  // to `pricePerEntry`, while the client's refetch sends minPrice/maxPrice,
  // which the shared query applies to `price`. Both fields carry the same
  // value today, so the split was invisible — until one of them drifted.
  // `price` wins because it is also what PRIZE_DRAW_SORT_OPTIONS sorts by for
  // "Entry: Low to High".
  const result = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      ...defaultAvailabilityForListingTypes(LISTING_TYPES),
    }),
  );

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading
            level={1}
            className="mb-2" color="primary" size="3xl" weight="semibold"
          >
            Prize Draws
          </Heading>
          <Text className="mb-6 text-[var(--appkit-color-text-muted)]" size="sm">
            Fair-RNG draws for sealed Pokémon, Hot Wheels Super Treasure Hunts,
            Gundam kits and more. Every winner picked by crypto.randomInt —
            proof on GitHub.
          </Text>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <PrizeDrawsIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
