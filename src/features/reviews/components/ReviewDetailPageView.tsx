import React from "react";
import Link from "next/link";
import { reviewRepository } from "../../../repositories";
import { Container, Div, Heading, Main, Nav, Section, Span, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import type { Review } from "../types";
import { ReviewDetailShell } from "./ReviewDetailShell";

export interface ReviewDetailPageViewProps {
  id: string;
}

export async function ReviewDetailPageView({ id }: ReviewDetailPageViewProps) {
  const doc = await reviewRepository.findById(id).catch(() => null);
  const review = doc as Review | null;

  // storeId === storeSlug for stores in this project (pure slug IDs)
  const storeSlug: string | null = doc?.storeId ?? null;

  if (!review || review.status !== "approved") {
    return (
      <Main>
        <Section className="py-24">
          <Container size="sm">
            <Div className="text-center">
              <Text className="mb-4" size="5xl" aria-hidden="true">🔍</Text>
              <Heading color="inverse" level={1} className="text-neutral-900 dark: mb-2" size="2xl" weight="bold">
                Review not found
              </Heading>
              <Text className="text-neutral-500 mb-6" size="sm">
                This review may have been removed or is no longer available.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.REVIEWS)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
              >
                ← Back to Reviews
              </Link>
            </Div>
          </Container>
        </Section>
      </Main>
    );
  }

  return (
    <Main>
      {/* Breadcrumb */}
      <Div className="border-b border-neutral-100 bg-neutral-50 py-2.5" padding="x-md">
        <Nav className="mx-auto max-w-3xl flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-400" aria-label="Breadcrumb">
          <Link href={String(ROUTES.HOME)} className="hover:text-primary transition-colors">
            Home
          </Link>
          <Span>/</Span>
          <Link href={String(ROUTES.PUBLIC.REVIEWS)} className="hover:text-primary transition-colors">
            Reviews
          </Link>
          <Span>/</Span>
          <Span className="text-neutral-700 truncate max-w-[200px]">
            {review.title ?? review.id}
          </Span>
        </Nav>
      </Div>

      <ReviewDetailShell
        review={review}
        storeHref={storeSlug ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug)) : null}
      />
    </Main>
  );
}
