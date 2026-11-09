import React from "react";
import { blogRepository } from "../../../repositories";
import { Container } from "../../../ui/components/Layout";
import { Main, Section } from "../../../ui/components/Semantic";
import { PageHeroHeading } from "../../../ui/components/PageHeroHeading";
import { AdSlot } from "../../homepage/components/AdSlot";
import { BlogIndexListing } from "./BlogIndexListing";
import { BLOG_DEFAULT_PUBLIC_SORT } from "../schemas/firestore";
import type { BlogPostCategory, BlogListResponse } from "../types";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { firstParam } from "../../../utils/search-params";
import type { SearchParamsRecord } from "../../../utils/search-params";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface BlogIndexPageViewProps {
  /**
   * Build the detail URL for one item. Omit for the SHOP's path.
   *
   * 🛑 A host that OWNS this section serves it at its own root, so the
   * shop's `/section/<slug>` form 404s there. Measured 2026-11-09 on
   * events.letitrip.in: every card linked to `/events/<slug>` and every one
   * returned 404, leaving the event unreachable from its own card.
   *
   * A prop rather than changing ROUTES — www still serves those paths and
   * still 301s to the subdomain, so the shop's map is right for its owner.
   */
  buildHref?: (slugOrId: string) => string;
  searchParams?: SearchParamsRecord;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export async function BlogIndexPageView({ searchParams = {}, pageRegionCards = [], buildHref }: BlogIndexPageViewProps) {
  const sort = firstParam(searchParams, "sort") || BLOG_DEFAULT_PUBLIC_SORT;
  const page = Number(firstParam(searchParams, "page")) || 1;
  const pageSize = Number(firstParam(searchParams, "pageSize")) || 24;
  const category = firstParam(searchParams, "category") as BlogPostCategory | undefined;
  /*
   * 🛑 `q` MUST be read and forwarded. Without it /blog?q=anything rendered the
   * FULL published list — the same failure the API route's own header records
   * having already fixed on its side, never back-ported here (Root Cause #59).
   * It cannot self-correct on the client either: this result becomes
   * `initialData`, and the listing hook sets `staleTime: Infinity` when given
   * SSR data, so the unfiltered first paint is frozen for that query key.
   */
  const q = firstParam(searchParams, "q").trim();

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
            meta={initialData?.meta?.total ? `${initialData.meta.total} articles` : undefined}
          />
          <AdminComposableRegion pageId="blog" initialCards={pageRegionCards} />
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <BlogIndexListing initialData={initialData} buildHref={buildHref} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
