import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { productRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { LiveItemsIndexListing } from "./LiveItemsIndexListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildLiveFilters(params: SearchParams): string {
  const parts: string[] = ["status==published", "listingType==live"];
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(sieveFilter("price", SIEVE_OP.GTE, minPrice));
  if (maxPrice) parts.push(sieveFilter("price", SIEVE_OP.LTE, maxPrice));
  const species = sp(params, "species");
  if (species) parts.push(sieveFilter("liveSpecies", SIEVE_OP.EQ, species));
  const liveSex = sp(params, "liveSex");
  if (liveSex) parts.push(sieveFilter("liveSex", SIEVE_OP.EQ, liveSex));
  const transport = sp(params, "liveTransportMethod");
  if (transport) parts.push(sieveFilter("liveTransportMethod", SIEVE_OP.EQ, transport));
  return parts.join(",");
}

export interface LiveItemsListViewProps {
  searchParams?: SearchParams;
}

export async function LiveItemsListView({ searchParams = {} }: LiveItemsListViewProps) {
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildLiveFilters(searchParams);

  const result = await productRepository
    .list({ filters, sorts: sort, page, pageSize })
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-zinc-900 dark:text-zinc-50" size="3xl" weight="semibold">
            Live Items
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <LiveItemsIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
