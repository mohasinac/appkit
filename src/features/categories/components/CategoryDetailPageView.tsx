import React from "react";
import Link from "next/link";
import { categoriesRepository, productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import {
  Container,
  Grid,
  Heading,
  Main,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";

export interface CategoryDetailPageViewProps {
  slug: string;
}

export async function CategoryDetailPageView({ slug }: CategoryDetailPageViewProps) {
  const [categoryResult, productsResult] = await Promise.all([
    categoriesRepository
      .findBy("slug", slug)
      .then((items: any[]) => items[0])
      .catch(() => undefined),
    productRepository
      .list({
        filters: `status==published,categorySlug==${slug}`,
        sorts: "-createdAt",
        page: 1,
        pageSize: 24,
      })
      .catch(() => null),
  ]);

  const category = categoryResult as Record<string, any> | undefined;
  const products = (productsResult?.items ?? []) as Array<Record<string, any>>;

  return (
    <Main>
      {/* Breadcrumb */}
      <Section className="bg-zinc-50 py-4 dark:bg-zinc-900">
        <Container size="xl">
          <Row align="center" gap="xs" className="text-sm text-zinc-500">
            <Link href="/" className="hover:text-primary-600">Home</Link>
            <Span>/</Span>
            <Link href={String(ROUTES.PUBLIC.CATEGORIES)} className="hover:text-primary-600">
              Categories
            </Link>
            <Span>/</Span>
            <Span className="text-zinc-900 dark:text-zinc-100">{category?.name ?? slug}</Span>
          </Row>
        </Container>
      </Section>

      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {category?.name ?? slug}
          </Heading>
          {category?.description && (
            <Text className="mb-8 text-zinc-500">{category.description}</Text>
          )}

          {products.length === 0 ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                No products in this category yet
              </Text>
              <Text className="text-sm text-zinc-500">
                Check back soon or browse other categories.
              </Text>
            </Stack>
          ) : (
            <>
              <Text className="mb-6 text-sm text-zinc-500">
                {products.length} {products.length === 1 ? "product" : "products"}
              </Text>
              <Grid cols="productCards" gap="md">
                {products.map((p) => (
                  <InteractiveProductCard
                    key={p.id}
                    product={p as any}
                    href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(p.slug ?? p.id))}
                  />
                ))}
              </Grid>
            </>
          )}
        </Container>
      </Section>
    </Main>
  );
}
