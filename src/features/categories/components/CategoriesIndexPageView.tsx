import React from "react";
import { categoriesRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Grid, Heading, Main, Section, Stack, Text } from "../../../ui";
import { CategoryCard } from "./CategoryGrid";
import type { CategoryItem } from "../types";
import { AdSlot } from "../../homepage/components/AdSlot";

export async function CategoriesIndexPageView() {
  const result = await categoriesRepository
    .list({ page: 1, pageSize: 60, sorts: "name" })
    .catch(() => null);

  const categories = (result?.items ?? []) as unknown as CategoryItem[];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Categories
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          {categories.length === 0 ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                No categories yet
              </Text>
              <Text className="text-sm text-zinc-500">
                Categories will appear here once products are listed.
              </Text>
            </Stack>
          ) : (
            <Grid cols={4} gap="md">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))}
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
