"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Container, Div, Grid, Heading, Main, Row, Section, Skeleton, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { formatCurrency } from "../../../utils/number.formatter";
import { ROUTES } from "../../../next/routing/route-map";
import type { CatalogueItemDocument } from "../schemas/firestore";

export interface PublicCatalogueItemDetailViewProps {
  ownerSlug: string;
  itemId: string;
}

const __O = {
  hidden: "overflow-hidden",
} as const;

/**
 * Public detail page for a single personal-catalogue item — previously had
 * no route or view at all; the public catalogue grid rendered bare, unlinked
 * cards (see Recurrent Root Cause sweep, 2026-08-20 session).
 */
export function PublicCatalogueItemDetailView({ ownerSlug, itemId }: PublicCatalogueItemDetailViewProps) {
  const { data, isLoading, isError } = useQuery<{
    owner: { displayName: string | null; photoURL: string | null };
    item: CatalogueItemDocument;
    linkedProductHref: string | null;
  }>({
    queryKey: ["catalogue", "public-item", ownerSlug, itemId],
    queryFn: () => apiClient.get(ACCOUNT_ENDPOINTS.PUBLIC_CATALOGUE_ITEM(ownerSlug, itemId)),
  });

  if (isLoading) {
    return (
      <Main>
        <Section padding="y-xl">
          <Container size="md">
            <Skeleton variant="rectangular" height={400} />
          </Container>
        </Section>
      </Main>
    );
  }

  if (isError || !data?.item) {
    return (
      <Main>
        <Section padding="y-5xl">
          <Container size="md">
            <Stack align="start" gap="md" className="text-left">
              <Heading level={1} size="2xl" weight="semibold" color="primary">
                Item Not Found
              </Heading>
              <Text color="muted">This catalogue item may have been made private or removed.</Text>
              <Link href={`${ROUTES.PUBLIC.PROFILE(ownerSlug)}/catalogue`} className="text-[length:var(--appkit-text-sm)] font-medium text-primary-600 hover:underline">
                Back to catalogue
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const { owner, item, linkedProductHref } = data;
  const images = item.images.length > 0 ? item.images : item.mainImage ? [item.mainImage] : [];

  return (
    <Main>
      <Container size="lg" padding="y-lg">
        <Row className="mb-4" align="center" gap="xs" textSize="xs" color="muted">
          <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <Span aria-hidden>/</Span>
          <Link href={`${ROUTES.PUBLIC.PROFILE(ownerSlug)}/catalogue`} className="hover:text-primary-600 transition-colors">
            {owner.displayName ?? "Catalogue"}
          </Link>
          <Span aria-hidden>/</Span>
          <Span className="truncate max-w-[200px]" color="muted">{item.title}</Span>
        </Row>

        <Grid cols={2} gap="lg">
          {images.length > 0 ? (
            <Div className={`relative aspect-square w-full ${__O.hidden}`} rounded="xl" surface="muted">
              <MediaImage src={images[0]} alt={item.title} size="hero" objectFit="contain" />
            </Div>
          ) : (
            <Div className="relative aspect-square w-full" rounded="xl" surface="muted" />
          )}
          {images.length > 1 && (
            <Row gap="sm" wrap className="col-span-2">
              {images.slice(1).map((src, i) => (
                <Div key={i} className={`relative h-20 w-20 ${__O.hidden}`} rounded="lg" surface="muted">
                  <MediaImage src={src} alt={`${item.title} photo ${i + 2}`} size="thumbnail" objectFit="cover" />
                </Div>
              ))}
            </Row>
          )}

          <Stack gap="md">
            <Heading level={1} size="2xl" weight="bold" color="primary">
              {item.title}
            </Heading>

            {typeof item.price === "number" && item.price > 0 && (
              <Stack gap="xs">
                <Text size="2xl" weight="bold" color="primary">{formatCurrency(item.price)}</Text>
                <Text size="xs" color="muted">Estimated value — not for direct sale from this page.</Text>
              </Stack>
            )}

            <Row gap="sm" wrap>
              {item.condition && (
                <Span size="xs" weight="medium" padding="pill-sm" rounded="full" surface="subtle" color="muted">
                  {item.condition}
                </Span>
              )}
              {typeof item.quantity === "number" && (
                <Span size="xs" weight="medium" padding="pill-sm" rounded="full" surface="subtle" color="muted">
                  Qty: {item.quantity}
                </Span>
              )}
            </Row>

            {item.description && (
              <Text color="muted" className="whitespace-pre-line">{item.description}</Text>
            )}

            {owner.displayName && (
              <Div border="subtle" rounded="xl" surface="muted" padding="md">
                <Text className="text-[10px] tracking-wide mb-0.5" color="faint" transform="uppercase">
                  Owned by
                </Text>
                <Text size="sm" weight="semibold" color="primary">{owner.displayName}</Text>
              </Div>
            )}

            {linkedProductHref && (
              <Link
                href={linkedProductHref}
                className="inline-flex w-fit items-center rounded-lg bg-primary px-[var(--appkit-space-4)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-semibold text-white transition-colors hover:opacity-90"
              >
                View live listing →
              </Link>
            )}
          </Stack>
        </Grid>
      </Container>
    </Main>
  );
}
