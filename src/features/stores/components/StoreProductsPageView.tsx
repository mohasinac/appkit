import React from "react";
import { productRepository, storeRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Grid, Section, Stack, Text } from "../../../ui";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";

export interface StoreProductsPageViewProps {
  storeSlug: string;
}

export async function StoreProductsPageView({ storeSlug }: StoreProductsPageViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);
  const ownerId = (store as Record<string, any>)?.ownerId;

  const result = ownerId
    ? await productRepository
        .list({
          filters: `sellerId==${ownerId},status==published,isAuction==false`,
          sorts: "-createdAt",
          page: 1,
          pageSize: 24,
        })
        .catch(() => null)
    : null;

  const products = (result?.items ?? []) as Array<Record<string, any>>;

  if (products.length === 0) {
    return (
      <Stack align="center" gap="3" className="justify-center py-24 text-center">
        <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">No products yet</Text>
        <Text className="text-sm text-zinc-500">
          This store has not listed any products yet.
        </Text>
      </Stack>
    );
  }

  return (
    <Section>
      <Container size="xl">
        <Grid cols="productCards" gap="md">
          {products.map((p) => (
            <InteractiveProductCard
              key={p.id}
              product={p as any}
              href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(p.slug ?? p.id))}
            />
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
