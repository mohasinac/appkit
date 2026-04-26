import React from "react";
import { categoriesRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CategoriesIndexListing } from "./CategoriesIndexListing";
import type { CategoryItem } from "../types";

export async function CategoriesIndexPageView() {
  const result = await categoriesRepository
    .list({ page: 1, pageSize: 200, sorts: "name" })
    .catch(() => null);

  const initialData = (result?.items ?? []) as unknown as CategoryItem[];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Categories
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <CategoriesIndexListing initialData={initialData} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
