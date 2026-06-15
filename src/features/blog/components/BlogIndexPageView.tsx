import React from "react";
import { blogRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { BlogIndexListing } from "./BlogIndexListing";
import type { BlogPostCategory, BlogListResponse } from "../types";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export interface BlogIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function BlogIndexPageView({ searchParams = {} }: BlogIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || "-publishedAt";
  const page = Number(sp(searchParams, "page")) || 1;
  const pageSize = Number(sp(searchParams, "pageSize")) || 24;
  const category = sp(searchParams, "category") as BlogPostCategory | undefined;

  const sieveResult = await blogRepository
    .listPublished(
      { ...(category ? { category } : {}) },
      { sorts: sort, page, pageSize },
    )
    .catch(() => null);

  const initialData: BlogListResponse | undefined = sieveResult
    ? {
        posts: sieveResult.items as any,
        meta: {
          total: sieveResult.total,
          page: sieveResult.page,
          pageSize: sieveResult.pageSize,
          totalPages: sieveResult.totalPages,
          hasMore: sieveResult.hasMore,
        },
      }
    : undefined;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Blog
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <BlogIndexListing initialData={initialData} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
