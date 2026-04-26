import React from "react";
import Link from "next/link";
import { categoriesRepository, productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import {
  Container,
  Div,
  Heading,
  Main,
  Row,
  RichText,
  Section,
  Span,
} from "../../../ui";
import { CategoryProductsListing } from "./CategoryProductsListing";

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

  return (
    <Main>
      {/* Breadcrumb */}
      <Section className="bg-zinc-50 py-4 dark:bg-zinc-900">
        <Container size="xl">
          <Row align="center" gap="xs" className="text-sm text-zinc-500">
            <Link href={String(ROUTES.HOME)} className="hover:text-primary-600">Home</Link>
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
            <Div className="mb-8 text-zinc-600 dark:text-zinc-400">
              <RichText html={normalizeRichTextHtml(category.description)} />
            </Div>
          )}

          <CategoryProductsListing
            categorySlug={slug}
            initialData={productsResult ?? undefined}
          />
        </Container>
      </Section>
    </Main>
  );
}
