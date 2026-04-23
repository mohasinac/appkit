import React from "react";
import { reviewRepository, storeRepository } from "../../../repositories";
import { Container, Grid, Section, Stack, Text } from "../../../ui";
import { ReviewCard } from "../../reviews/components/ReviewsList";
import type { Review } from "../../reviews/types";

export interface StoreReviewsPageViewProps {
  storeSlug: string;
}

export async function StoreReviewsPageView({ storeSlug }: StoreReviewsPageViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);
  const sellerId = (store as Record<string, any>)?.ownerId;

  const reviews = sellerId
    ? await reviewRepository
        .getApprovedRatingAggregateBySeller(sellerId)
        .then(() => reviewRepository.findByStatus("approved"))
        .catch(() => [] as Review[])
    : ([] as Review[]);

  // Filter to seller's reviews
  const storeReviews = (reviews as Review[]).filter(
    (r) => (r as any).sellerId === sellerId,
  );

  if (storeReviews.length === 0) {
    return (
      <Stack align="center" gap="3" className="justify-center py-24 text-center">
        <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">No reviews yet</Text>
        <Text className="text-sm text-zinc-500">
          Be the first to review this store by purchasing a product.
        </Text>
      </Stack>
    );
  }

  return (
    <Section>
      <Container size="xl">
        <Grid cols={3} gap="md">
          {storeReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
