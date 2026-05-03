import React from "react";
import { blogRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { BlogIndexListing } from "./BlogIndexListing";
import type { BlogPostCategory } from "../types";

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

  const result = await blogRepository
    .listPublished(
      { ...(category ? { category } : {}) },
      { sorts: sort, page, pageSize },
    )
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Blog
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <BlogIndexListing initialData={result as any} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
