import React from "react";
import { reviewRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import type { Review } from "../types";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ReviewsIndexListing } from "./ReviewsIndexListing";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildReviewFilters(params: SearchParams): string {
  // Always scope to approved reviews on the public page
  const parts: string[] = ["status==approved"];
  const rating = sp(params, "rating");
  if (rating) {
    const values = rating.split("|").filter(Boolean);
    if (values.length === 1) parts.push(`rating==${values[0]}`);
    else if (values.length > 1) parts.push(`rating==${values.join("|")}`);
  }
  const minVotes = sp(params, "minVotes");
  if (minVotes) parts.push(`helpfulCount>=${minVotes}`);
  const dateFrom = sp(params, "dateFrom");
  const dateTo = sp(params, "dateTo");
  if (dateFrom) parts.push(`createdAt>=${dateFrom}`);
  if (dateTo) parts.push(`createdAt<=${dateTo}`);
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
    .listAll({ filters, sorts: sort, page, pageSize: 48 })
    .catch(() => null);

  const reviews = (result?.items ?? []) as unknown as Review[];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Reviews
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <ReviewsIndexListing reviews={reviews as Review[]} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
