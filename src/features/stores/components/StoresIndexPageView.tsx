import React from "react";
import Link from "next/link";
import { storeRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Grid, Heading, Main, Section, Stack, Text } from "../../../ui";
import { InteractiveStoreCard } from "./InteractiveStoreCard";
import { AdSlot } from "../../homepage/components/AdSlot";

export async function StoresIndexPageView() {
  const result = await storeRepository
    .listStores({ page: 1, pageSize: 24, sorts: "-createdAt" }, true)
    .catch(() => null);

  const stores = result?.items ?? [];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Stores
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          {stores.length === 0 ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">No stores yet</Text>
              <Text className="text-sm text-zinc-500">
                Stores will appear here once sellers join the marketplace.
              </Text>
              <Link
                href={String(ROUTES.SELLER?.DASHBOARD ?? "/seller")}
                className="mt-2 inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Become a Seller →
              </Link>
            </Stack>
          ) : (
            <Grid cols={3} gap="md">
              {stores.map((store: any) => (
                <InteractiveStoreCard
                  key={store.storeSlug ?? store.id}
                  store={store}
                  href={String(ROUTES.PUBLIC.STORE_DETAIL(store.storeSlug ?? store.id))}
                />
              ))}
            </Grid>
          )}
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
