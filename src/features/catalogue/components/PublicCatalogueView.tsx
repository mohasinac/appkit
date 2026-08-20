"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Div, Grid, Heading, Skeleton, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { formatCurrency } from "../../../utils/number.formatter";
import type { CatalogueItemDocument } from "../schemas/firestore";

export interface PublicCatalogueViewProps {
  ownerSlug: string;
}

export function PublicCatalogueView({ ownerSlug }: PublicCatalogueViewProps) {
  const { data, isLoading } = useQuery<{ owner: { displayName: string | null; photoURL: string | null }; items: CatalogueItemDocument[] }>({
    queryKey: ["catalogue", "public", ownerSlug],
    queryFn: () => apiClient.get(ACCOUNT_ENDPOINTS.PUBLIC_CATALOGUE(ownerSlug)),
  });

  if (isLoading) {
    return (
      <Grid cols={4} gap="md">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} variant="rectangular" height={200} />
        ))}
      </Grid>
    );
  }
  const items = data?.items ?? [];

  if (items.length === 0) {
    return <Text variant="secondary">Nothing public here yet.</Text>;
  }

  return (
    <Grid cols={4} gap="md">
      {items.map((item) => (
        <Link key={item.id} href={`/catalogue/${ownerSlug}/${item.id}`} className="block transition-opacity hover:opacity-90">
          <Div rounded="xl" border="default" padding="md" surface="card">
            <MediaImage src={item.mainImage || item.images[0] || ""} alt={item.title} size="card" />
            <Div padding="t-sm">
              <Heading level={4} size="sm">{item.title}</Heading>
            </Div>
            {typeof item.price === "number" && item.price > 0 && (
              <Text size="sm" color="muted">{formatCurrency(item.price)}</Text>
            )}
          </Div>
        </Link>
      ))}
    </Grid>
  );
}
