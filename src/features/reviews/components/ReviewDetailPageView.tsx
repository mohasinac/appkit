import React from "react";
import Link from "next/link";
import { reviewRepository } from "../../../repositories";
import { safeRead } from "../../../errors/safe-read";
import { Container, Grid, Row } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Main, Nav, Section } from "../../../ui/components/Semantic";
import { ROUTES } from "../../../next/routing/route-map";
import type { Review } from "../types";
import { ReviewDetailShell } from "./ReviewDetailShell";
import { ReviewCard } from "./ReviewsList";
import { OwnerQuickActions } from "../../admin/components/OwnerQuickActions";

export interface ReviewDetailPageViewProps {
  id: string;
}

export async function ReviewDetailPageView({ id }: ReviewDetailPageViewProps) {
  // The review IS this page's subject — a read failure must surface rather than
  // become the same `null` a removed review produces, which the "Review not
  // found" branch below already handles.
  const doc = await reviewRepository.findById(id);
  /*
   * 🛑 MASKED, not the raw document.
   *
   * `findById` returns ciphertext since `mapDoc` stopped decrypting, and
   * `ReviewDetailShell` calls `maskName(review.userName)` — which refuses
   * ciphertext by design and answers "Anonymous". So this page rendered every
   * reviewer as "Anonymous". `maskedReview` decrypts and then masks, which is
   * what the shell was always assuming it had been handed.
   *
   * The `as Review` cast is what hid it: it erased the brand, so nothing in
   * the type system could object.
   */
  const review = (doc ? reviewRepository.maskedReview(doc) : null) as Review | null;

  // storeId === storeSlug for stores in this project (pure slug IDs)
  const storeSlug: string | null = doc?.storeId ?? null;

  if (!review || review.status !== "approved") {
    return (
      <Main>
        <Section padding="y-6xl" >
          <Container size="sm">
            <Div className="text-left">
              <Text className="mb-4" size="5xl" aria-hidden="true">🔍</Text>
              <Heading color="inverse" level={1} className="text-[var(--appkit-color-text)] dark: mb-2" size="2xl" weight="bold">
                Review not found
              </Heading>
              <Text className="text-[var(--appkit-color-text-muted)] mb-6" size="sm">
                This review may have been removed or is no longer available.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.REVIEWS)}
                className="inline-flex items-center gap-[var(--appkit-space-2)] rounded-lg bg-primary px-[var(--appkit-space-5)] py-[var(--appkit-space-2-5)] text-[length:var(--appkit-text-sm)] font-medium text-white hover:bg-primary-600 transition-colors"
              >
                ← Back to Reviews
              </Link>
            </Div>
          </Container>
        </Section>
      </Main>
    );
  }

  const [sameProductDocs, sameStoreDocs] = await Promise.all([
    // 12 = the 6 rendered below, with headroom for the current review + any filtered out.
    safeRead(() => reviewRepository.findApprovedByProduct(review.productId, 12), {
      route: "/reviews/[id]", key: "review.sameProduct", fallback: [],
    }),
    storeSlug
      ? safeRead(() => reviewRepository.findApprovedByStore(storeSlug), {
          route: "/reviews/[id]", key: "review.sameStore", fallback: [],
        })
      : Promise.resolve([]),
  ]);
  const sameProductReviews = (sameProductDocs as unknown as Review[]).filter((r) => r.id !== review.id).slice(0, 6);
  const sameStoreReviews = (sameStoreDocs as unknown as Review[]).filter((r) => r.id !== review.id).slice(0, 6);

  return (
    <Main>
      {/* Breadcrumb */}
      <Div paddingY="y-xs-tall" className="border-b border-neutral-100 bg-neutral-50" padding="x-md">
        <Nav layout="flex" gap="2xs" textSize="xs" color="faint" className="mx-auto max-w-3xl" aria-label="Breadcrumb">
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

      {/*
        🛑 The one resource here that is genuinely OWNER-visible rather than
        admin-only, because it is the one with a real non-admin editor:
        `/user/reviews/[id]/edit`, built in W3. So `ownerId` is passed and the
        review's author sees the pencil on their own review — which is exactly
        what "edit a review you have given without navigating to your reviews
        page" asked for. Admins see it too, via the component's own term.

        Every other resource in this sweep points at an `/admin/*` editor, so
        passing an owner id there would hand a non-admin a pencil to a route
        their role cannot open (Root Cause #37's dead-link shape).
      */}
      <Row justify="end" className="mb-2">
        <OwnerQuickActions
          resource="REVIEW"
          placement="detail"
          ownerId={review.userId}
          recordLabel={review.title ?? review.id}
          editHref={String(ROUTES.USER.REVIEW_EDIT(review.id))}
        />
      </Row>

      <ReviewDetailShell
        review={review}
        storeHref={storeSlug ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug)) : null}
      />

      {sameProductReviews.length > 0 && (
        <Section padding="y-lg" border="subtle" className="border-t">
          <Container size="sm">
            <Heading level={2} className="mb-4" size="lg" weight="semibold">
              More reviews for {review.productTitle ?? "this product"}
            </Heading>
            <Grid cols="cardsWide" gap="md">
              {sameProductReviews.map((r) => (
                <ReviewCard key={r.id} review={r} context="listing" />
              ))}
            </Grid>
          </Container>
        </Section>
      )}

      {sameStoreReviews.length > 0 && (
        <Section padding="y-lg" border="subtle" className="border-t">
          <Container size="sm">
            <Heading level={2} className="mb-4" size="lg" weight="semibold">
              More reviews for {review.storeName ?? "this store"}
            </Heading>
            <Grid cols="cardsWide" gap="md">
              {sameStoreReviews.map((r) => (
                <ReviewCard key={r.id} review={r} context="store" />
              ))}
            </Grid>
          </Container>
        </Section>
      )}
    </Main>
  );
}
