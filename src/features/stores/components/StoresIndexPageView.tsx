import React from "react";
import { storeRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { StoresIndexListing } from "./StoresIndexListing";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export interface StoresIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function StoresIndexPageView({ searchParams = {} }: StoresIndexPageViewProps) {
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

  const result = await safeRead(
    () => storeRepository.listStores({ page, pageSize, sorts: sort }, true, q ? { search: q } : undefined),
    { route: "/stores", key: "stores.listStores", fallback: null },
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
            Stores
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <StoresIndexListing initialData={publicResult ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
