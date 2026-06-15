import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { productRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { ClassifiedIndexListing } from "./ClassifiedIndexListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildClassifiedFilters(params: SearchParams): string {
  const parts: string[] = ["status==published", "listingType==classified"];
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(sieveFilter("price", SIEVE_OP.GTE, minPrice));
  if (maxPrice) parts.push(sieveFilter("price", SIEVE_OP.LTE, maxPrice));
  const city = sp(params, "city");
  if (city) parts.push(sieveFilter("classifiedCity", SIEVE_OP.EQ, city));
  const negotiable = sp(params, "negotiable");
  if (negotiable === "true") parts.push(sieveFilter("classifiedNegotiable", SIEVE_OP.EQ, "true"));
  const acceptsShipping = sp(params, "acceptsShipping");
  if (acceptsShipping === "true") parts.push(sieveFilter("classifiedAcceptsShipping", SIEVE_OP.EQ, "true"));
  return parts.join(",");
}

export interface ClassifiedListViewProps {
  searchParams?: SearchParams;
}

export async function ClassifiedListView({ searchParams = {} }: ClassifiedListViewProps) {
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildClassifiedFilters(searchParams);

  const result = await productRepository
    .list({ filters, sorts: sort, page, pageSize })
    .catch(() => null);

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Classifieds
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <ClassifiedIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
