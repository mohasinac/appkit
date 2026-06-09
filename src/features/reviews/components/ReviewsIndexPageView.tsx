import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import React from "react";
import { reviewRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import type { ReviewListResponse } from "../types";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ReviewsIndexListing } from "./ReviewsIndexListing";

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
  const q = sp(params, "q");
  if (q) parts.push(`productTitle@=*${q}`);
  return parts.join(",");
}

export interface ReviewsIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function ReviewsIndexPageView({ searchParams = {} }: ReviewsIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || "-createdAt";
  const page = Number(sp(searchParams, "page")) || 1;
  const filters = buildReviewFilters(searchParams);

  const result = await reviewRepository
    .listAll({ filters, sorts: sort, page, pageSize: 12 })
    .catch(() => null);

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
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
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
