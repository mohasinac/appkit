import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { productRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "auctionEndDate";

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildAuctionFilters(params: SearchParams): string {
  const parts: string[] = ["status==published", "listingType==auction"];
  const minBid = sp(params, "minBid");
  const maxBid = sp(params, "maxBid");
  if (minBid) parts.push(sieveFilter("currentBid", SIEVE_OP.GTE, minBid));
  if (maxBid) parts.push(sieveFilter("currentBid", SIEVE_OP.LTE, maxBid));
  const store = sp(params, "store");
  if (store) {
    const values = store.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter("storeId", SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveFilter("storeId", SIEVE_OP.EQ, values.join("|")));
  }
  const dateFrom = sp(params, "dateFrom");
  const dateTo = sp(params, "dateTo");
  if (dateFrom) parts.push(sieveFilter("auctionEndDate", SIEVE_OP.GTE, dateFrom));
  if (dateTo) parts.push(sieveFilter("auctionEndDate", SIEVE_OP.LTE, dateTo));
  return parts.join(",");
}

export interface AuctionsListViewProps {
  searchParams?: SearchParams;
}

export async function AuctionsListView({ searchParams = {} }: AuctionsListViewProps) {
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildAuctionFilters(searchParams);

  const result = await productRepository
    .list({
      filters,
      sorts: sort,
      page,
      pageSize,
    })
    .catch(() => null);

  const initial = result ?? null;

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-zinc-900 dark:text-zinc-50" size="3xl" weight="semibold">
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
