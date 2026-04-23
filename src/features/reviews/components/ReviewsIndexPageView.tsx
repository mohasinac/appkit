import React from "react";
import { reviewRepository } from "../../../repositories";
import { Container, Grid, Heading, Main, Section, Stack, Text } from "../../../ui";
import { ReviewCard } from "./ReviewsList";
import type { Review } from "../types";
import { AdSlot } from "../../homepage/components/AdSlot";

export async function ReviewsIndexPageView() {
  const reviews = await reviewRepository.findByStatus("approved").catch(() => [] as Review[]);

  // Sort newest first (findByStatus returns an array)
  const sorted = (reviews as Review[]).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Reviews
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          {sorted.length > 0 && (
            <Text className="mb-8 text-zinc-500">
              {sorted.length.toLocaleString()} verified {sorted.length === 1 ? "review" : "reviews"}
            </Text>
          )}
          {sorted.length === 0 ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">No reviews yet</Text>
              <Text className="text-sm text-zinc-500">
                Reviews will appear here after customers purchase and rate products.
              </Text>
            </Stack>
          ) : (
            <Grid cols={3} gap="md">
              {sorted.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </Grid>
          )}
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
