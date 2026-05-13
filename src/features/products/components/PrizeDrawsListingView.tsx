import { productRepository } from "../../../repositories";
import { Container, Main, Heading, Section, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { PrizeDrawsIndexListing } from "./PrizeDrawsIndexListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildPrizeDrawFilters(params: SearchParams): string {
  const parts: string[] = ["status==published", "listingType==prize-draw"];
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(`pricePerEntry>=${minPrice}`);
  if (maxPrice) parts.push(`pricePerEntry<=${maxPrice}`);
  const store = sp(params, "storeId");
  if (store) parts.push(`storeId==${store}`);
  const status = sp(params, "prizeRevealStatus");
  if (status) parts.push(`prizeRevealStatus==${status}`);
  return parts.join(",");
}

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
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildPrizeDrawFilters(searchParams);

  const result = await productRepository
    .list({ filters, sorts: sort, page, pageSize })
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading
            level={1}
            className="mb-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Prize Draws
          </Heading>
          <Text className="mb-6 text-sm text-[var(--appkit-color-text-muted)]">
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
