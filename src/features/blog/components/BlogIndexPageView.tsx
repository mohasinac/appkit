import React from "react";
import { blogRepository } from "../../../repositories";
import { Container } from "../../../ui/components/Layout";
import { Main, Section } from "../../../ui/components/Semantic";
import { PageHeroHeading } from "../../../ui/components/PageHeroHeading";
import type { PageHeroCopy } from "../../../ui/components/PageHeroHeading";
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
   * Base path article pages live under on THIS host — `""` for a host that
   * serves them at its own root, `"/blog"` on the shop. Omit it and the href
   * resolves through the section-route registry, which is the one place that
   * knows who owns `/blog`.
   *
   * 🛑 A STRING, and it must stay one. This is a SERVER component that
   * forwards the prop into a `"use client"` child, so anything
   * non-serializable here is an error row in the RSC flight payload: the
   * server still returns 200 with complete HTML and the BROWSER dies at
   * hydration with React #441, above every `<Suspense>` boundary. Its
   * predecessor was `buildHref?: (slugOrId: string) => string` and it took two
   * content hosts down for a week. See `joinHrefPrefix`.
   */
  hrefPrefix?: string;
  searchParams?: SearchParamsRecord;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
  /**
   * Hero copy. See `heroCopy` on `EventsListPageView` and `PageHeroCopy`.
   *
   * 🛑 This prop exists because the defaults below were once one client's
   * house voice naming one client's product line and trade — hardcoded inside
   * a library whose acceptance test is *no real brand or host in source*, and
   * shipped to every consumer's blog index. The replacements say what the page
   * IS, without naming what anyone sells.
   *
   * ⚠ The offending strings are deliberately NOT quoted here. A doc comment
   * compiles into the published `.d.ts`, so quoting them to explain the fix
   * puts the brand straight back into the dist that every consumer installs —
   * which is this exact defect, one layer out. Git history has the literals.
   */
  heroCopy?: PageHeroCopy;
}

/** Vertical-neutral default hero copy — see `heroCopy`. */
const BLOG_HERO_DEFAULTS = {
  pill: "Articles & updates",
  title: "Blog",
  description: "Guides, product notes and what the team has been working on.",
} as const;

export async function BlogIndexPageView({ searchParams = {}, pageRegionCards = [], hrefPrefix, heroCopy = {} }: BlogIndexPageViewProps) {
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
            pill={heroCopy.pill ?? BLOG_HERO_DEFAULTS.pill}
            title={heroCopy.title ?? BLOG_HERO_DEFAULTS.title}
            description={heroCopy.description ?? BLOG_HERO_DEFAULTS.description}
            meta={initialData?.meta?.total ? `${initialData.meta.total} articles` : undefined}
          />
          <AdminComposableRegion pageId="blog" initialCards={pageRegionCards} />
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <BlogIndexListing initialData={initialData} hrefPrefix={hrefPrefix} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
