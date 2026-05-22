import { productRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { DigitalCodesIndexListing } from "./DigitalCodesIndexListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = "-createdAt";

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildDigitalCodeFilters(params: SearchParams): string {
  const parts: string[] = ["status==published", "listingType==digital-code"];
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(`price>=${minPrice}`);
  if (maxPrice) parts.push(`price<=${maxPrice}`);
  const deliveryMethod = sp(params, "deliveryMethod");
  if (deliveryMethod) parts.push(`digitalCodeDelivery==${deliveryMethod}`);
  return parts.join(",");
}

export interface DigitalCodesListViewProps {
  searchParams?: SearchParams;
}

export async function DigitalCodesListView({ searchParams = {} }: DigitalCodesListViewProps) {
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildDigitalCodeFilters(searchParams);

  const result = await productRepository
    .list({ filters, sorts: sort, page, pageSize })
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Digital Codes
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <DigitalCodesIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
