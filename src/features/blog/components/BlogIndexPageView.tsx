import React from "react";
import { blogRepository } from "../../../repositories";
import { Container, Main, Section, PageHeroHeading } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { BlogIndexListing } from "./BlogIndexListing";
import { BLOG_DEFAULT_PUBLIC_SORT } from "../schemas/firestore";
import type { BlogPostCategory, BlogListResponse } from "../types";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export interface BlogIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function BlogIndexPageView({ searchParams = {} }: BlogIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || BLOG_DEFAULT_PUBLIC_SORT;
  const page = Number(sp(searchParams, "page")) || 1;
  const pageSize = Number(sp(searchParams, "pageSize")) || 24;
  const category = sp(searchParams, "category") as BlogPostCategory | undefined;
  /*
   * 🛑 `q` MUST be read and forwarded. Without it /blog?q=anything rendered the
   * FULL published list — the same failure the API route's own header records
   * having already fixed on its side, never back-ported here (Root Cause #59).
   * It cannot self-correct on the client either: this result becomes
   * `initialData`, and the listing hook sets `staleTime: Infinity` when given
   * SSR data, so the unfiltered first paint is frozen for that query key.
   */
  const q = sp(searchParams, "q").trim();

  const sieveResult = await safeRead(
    () =>
      blogRepository.listPublished(
        { ...(category ? { category } : {}), ...(q ? { search: q } : {}) },
        { sorts: sort, page, pageSize },
      ),
    { route: "/blog", key: "blogPosts.listPublished", fallback: null },
  );
  // Sandbox posts are public rows by design — not on someone else's first paint.
  const publicSieve = sieveResult
    ? { ...sieveResult, items: hidePublicTestData(sieveResult.items) }
    : sieveResult;

  const initialData: BlogListResponse | undefined = publicSieve
    ? {
        posts: publicSieve.items as any,
        meta: {
          total: publicSieve.total,
          page: publicSieve.page,
          pageSize: publicSieve.pageSize,
          totalPages: publicSieve.totalPages,
          hasMore: publicSieve.hasMore,
        },
      }
    : undefined;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          {/*
            * Was a bare one-word <Heading> — no description, no count, no
            * rule. The editorial treatment already existed but was inlined
            * inside SectionCarousel and gated on headingVariant, so the two
            * pages it was designed for could not reach it.
            */}
          <PageHeroHeading
            className="mb-8"
            pill="From the shop floor"
            title="Blog"
            description="Buying guides, release notes and what we have learned importing and grading Beyblades."
            meta={initialData?.total ? `${initialData.total} articles` : undefined}
          />
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <BlogIndexListing initialData={initialData} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
