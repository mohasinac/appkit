import React from "react";
import Link from "next/link";
import { reviewRepository } from "../../../repositories";
import { Container, Main, Section } from "../../../ui";
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
            <div className="text-center">
              <p className="text-5xl mb-4" aria-hidden="true">🔍</p>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                Review not found
              </h1>
              <p className="text-sm text-neutral-500 dark:text-zinc-400 mb-6">
                This review may have been removed or is no longer available.
              </p>
              <Link
                href={String(ROUTES.PUBLIC.REVIEWS)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
              >
                ← Back to Reviews
              </Link>
            </div>
          </Container>
        </Section>
      </Main>
    );
  }

  return (
    <Main>
      {/* Breadcrumb */}
      <div className="border-b border-neutral-100 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 py-2.5 px-4">
        <nav className="mx-auto max-w-3xl flex items-center gap-1.5 text-xs text-neutral-400 dark:text-zinc-500" aria-label="Breadcrumb">
          <Link href={String(ROUTES.HOME)} className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href={String(ROUTES.PUBLIC.REVIEWS)} className="hover:text-primary transition-colors">
            Reviews
          </Link>
          <span>/</span>
          <span className="text-neutral-700 dark:text-zinc-300 truncate max-w-[200px]">
            {review.title ?? review.id}
          </span>
        </nav>
      </div>

      <ReviewDetailShell
        review={review}
        storeHref={storeSlug ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug)) : null}
      />
    </Main>
  );
}
