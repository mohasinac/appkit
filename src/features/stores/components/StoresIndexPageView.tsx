import React from "react";
import { storeRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { StoresIndexListing } from "./StoresIndexListing";

export async function StoresIndexPageView() {
  const result = await storeRepository
    .listStores({ page: 1, pageSize: 24, sorts: "-createdAt" }, true)
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
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
