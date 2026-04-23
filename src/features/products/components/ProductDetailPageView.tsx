import React from "react";
import Link from "next/link";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  Button,
  Container,
  Div,
  Heading,
  Main,
  Row,
  Section,
  Skeleton,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { ProductDetailView } from "./ProductDetailView";

export interface ProductDetailPageViewProps {
  slug: string;
}

export async function ProductDetailPageView({ slug }: ProductDetailPageViewProps) {
  const product = await productRepository.findByIdOrSlug(slug).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading level={1} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Product Not Found
              </Heading>
              <Text className="text-zinc-500">
                The product you are looking for may have been removed or the link is incorrect.
              </Text>
              <Link href={String(ROUTES.PUBLIC.PRODUCTS)} className="text-sm font-medium text-primary-600 hover:underline">
                Browse Products
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as Record<string, any>;
  const currency = p.currency || getDefaultCurrency();
  const price =
    typeof p.price === "number"
      ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(p.price)
      : null;

  const images: string[] = Array.isArray(p.images) ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const primaryImage = images[0];
  const inStock =
    typeof p.stockQuantity === "number" ? p.stockQuantity > 0 : p.status === "published";

  return (
    <ProductDetailView
      renderGallery={() =>
        primaryImage ? (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
            <Div
              role="img"
              aria-label={p.name ?? "Product image"}
              className="aspect-square w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${primaryImage})` }}
            />
          </Div>
        ) : (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <Div className="flex aspect-square items-center justify-center text-zinc-300 dark:text-zinc-700">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </Div>
          </Div>
        )
      }
      renderInfo={() => (
        <Stack gap="md">
          <Heading level={1} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {p.name ?? "Product"}
          </Heading>
          {price && (
            <Row align="center" gap="sm">
              <Span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                {price}
              </Span>
              {!inStock && (
                <Span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Out of stock
                </Span>
              )}
            </Row>
          )}
          {p.description && (
            <Text className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {typeof p.description === "string" ? p.description : ""}
            </Text>
          )}
          {p.sellerName && (
            <Row align="center" gap="xs">
              <Span className="text-xs text-zinc-500">Sold by</Span>
              <Span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {p.sellerName}
              </Span>
            </Row>
          )}
        </Stack>
      )}
      renderActions={() => (
        <Div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Stack gap="sm">
            {price && (
              <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{price}</Text>
            )}
            <Button variant="primary" size="md" className="w-full" disabled={!inStock}>
              {inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button variant="secondary" size="md" className="w-full">
              Add to Wishlist
            </Button>
          </Stack>
        </Div>
      )}
    />
  );
}
