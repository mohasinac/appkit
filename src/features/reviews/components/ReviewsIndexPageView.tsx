import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import React from "react";
import { reviewRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import type { ReviewListResponse } from "../types";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ReviewsIndexListing } from "./ReviewsIndexListing";
import { safeRead } from "../../../errors/safe-read";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildReviewFilters(params: SearchParams): string {
  const parts: string[] = ["status==approved"];
  const rating = sp(params, "rating");
  if (rating) {
    const values = rating.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter("rating", SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveFilter("rating", SIEVE_OP.EQ, values.join("|")));
  }
  const minVotes = sp(params, "minVotes");
  if (minVotes) parts.push(sieveFilter("helpfulCount", SIEVE_OP.GTE, minVotes));
  const maxVotes = sp(params, "maxVotes");
  if (maxVotes) parts.push(sieveFilter("helpfulCount", SIEVE_OP.LTE, maxVotes));
  const dateFrom = sp(params, "dateFrom");
  const dateTo = sp(params, "dateTo");
  if (dateFrom) parts.push(sieveFilter("createdAt", SIEVE_OP.GTE, dateFrom));
  if (dateTo) parts.push(sieveFilter("createdAt", SIEVE_OP.LTE, dateTo));
  /*
   * 🛑 `q` is deliberately NOT a filter clause, and emitting it as one was a
   * live defect rather than an untidy spelling.
   *
   * `productTitle@=*` is a case-insensitive operator the Firebase adapter
   * THROWS on, and the Sieve processor runs `throwExceptions: false` — so the
   * throw became silence and **every clause and the sort were discarded with
   * it**. `/reviews?q=anything` therefore returned the whole table, newest-ish,
   * ignoring rating, verified, date range and vote filters too.
   *
   * `/api/reviews` fixed exactly this and passes `q` to `listAll` as a
   * `{ search }` OPT (array-contains over `searchTxt`, which Sieve cannot
   * express). This SSR view queries the same collection and never got the
   * back-port — Root Cause #99, which says in as many words: when fixing a
   * filter in an API route, grep for the SSR view that queries the same
   * collection. It is also why the view could not self-correct: it hands its
   * result down as `initialData`, and `staleTime: Infinity` freezes an
   * unfiltered first paint for that query key forever (Root Cause #30).
   */
  return parts.join(",");
}

export interface ReviewsIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function ReviewsIndexPageView({ searchParams = {} }: ReviewsIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || "-createdAt";
  const page = Number(sp(searchParams, "page")) || 1;
  const filters = buildReviewFilters(searchParams);
  const q = sp(searchParams, "q");

  // audit-public-test-data-ok: `ReviewDocument` carries no `isTestData` field —
  // tsc rejects the filter outright, which is the honest signal that reviews
  // have no sandbox concept to strip. A review OF a sandbox product is not
  // flagged today; that is a seed-schema gap, not something a cast should hide.
  const result = await safeRead(
    () =>
      reviewRepository.listAll(
        { filters, sorts: sort, page, pageSize: 12 },
        q ? { search: q } : undefined,
      ),
    { route: "/reviews", key: "reviews.listAll", fallback: null },
  );

  const initialData: ReviewListResponse | undefined = result
    ? {
        items: result.items as any[],
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
      }
    : undefined;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Reviews
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <ReviewsIndexListing initialData={initialData} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
