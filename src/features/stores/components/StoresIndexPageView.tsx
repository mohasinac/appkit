import React from "react";
import { storeRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { StoresIndexListing } from "./StoresIndexListing";

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

  const result = await storeRepository
    .listStores({ page, pageSize, sorts: sort }, true)
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-zinc-900 dark:text-zinc-50" size="3xl" weight="semibold">
            Stores
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <StoresIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
