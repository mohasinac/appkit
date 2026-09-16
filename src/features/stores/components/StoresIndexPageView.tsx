import React from "react";
import { storeRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { StoresIndexListing } from "./StoresIndexListing";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { STORE_FIELDS } from "../../../constants/field-names";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export interface StoresIndexPageViewProps {
  searchParams?: SearchParams;
  /**
   * Restrict to verified stores and retitle the page. This is what /sellers is.
   *
   * /sellers rendered `<SellersListView />` with ZERO render props — and every
   * slot on `SlottedListingView` is optional, so it produced a correct header,
   * a correct breadcrumb and then a blank region: Root Cause #8 exactly. That
   * shell had one consumer, this page, and it was empty in it.
   *
   * Reusing this view rather than filling in the shell means /sellers inherits
   * what /stores already got right — the SSR `q` push-down, sandbox hiding,
   * the ad slots and the shared listing — instead of growing a second copy that
   * has to be fixed twice.
   */
  verifiedOnly?: boolean;
  heading?: string;
}

export async function StoresIndexPageView({
  searchParams = {},
  verifiedOnly = false,
  heading = "Stores",
}: StoresIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || "-createdAt";
  const page = Number(sp(searchParams, "page")) || 1;
  const pageSize = Number(sp(searchParams, "pageSize")) || 24;
  /*
   * 🛑 `q` MUST be read here, and passed as the third argument exactly as
   * /api/stores does — `listStores(model, true, { search })`.
   *
   * It was not, so /stores?q=anything rendered the FULL store list: measured
   * live, `?q=zzzznope` returned two real store cards and no empty state. The
   * search box looked like it worked because a real term also returns rows —
   * only a nonsense term exposes a filter that is not filtering.
   *
   * And it could not self-correct on the client: this result is handed to
   * <StoresIndexListing initialData=...>, and every public listing hook sets
   * `staleTime: Infinity` when given SSR data, so the unfiltered first paint is
   * frozen for that query key. Root Cause #30 — the SSR builder has to compute
   * the same filters the client would, because it never gets a second chance.
   */
  const q = sp(searchParams, "q").trim();
  /*
   * The rating facet must be applied HERE too, not only by the client. This
   * result is handed to <StoresIndexListing initialData=…>, and public listing
   * hooks set staleTime: Infinity when given SSR data — so an unfiltered first
   * paint is frozen for that query key and never self-corrects (Root Cause #30).
   */
  const ratingRaw = sp(searchParams, "rating");
  const minRating = ratingRaw
    ? Math.max(...ratingRaw.split("|").map(Number).filter((n) => Number.isFinite(n)))
    : undefined;

  const result = await safeRead(
    () =>
      storeRepository.listStores(
        {
          page,
          pageSize,
          sorts: sort,
          ...(verifiedOnly ? { filters: `${STORE_FIELDS.IS_VERIFIED}==true` } : {}),
        },
        true,
        q || minRating !== undefined
          ? { ...(q ? { search: q } : {}), ...(minRating !== undefined ? { minRating } : {}) }
          : undefined,
      ),
    {
      route: verifiedOnly ? "/sellers" : "/stores",
      key: "stores.listStores",
      fallback: null,
    },
  );
  /*
   * The API already filters this; the SSR page called the repository directly
   * and did not, so the first paint rendered a card for `store-tester-sandbox`
   * while the client refetch dropped it.
   */
  const publicResult = result
    ? { ...result, items: hidePublicTestData(result.items) }
    : result;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            {heading}
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <StoresIndexListing initialData={publicResult ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
