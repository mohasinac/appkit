import Link from "next/link";
import { productRepository, reviewRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  Button,
  Container,
  Div,
  Heading,
  Main,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { ProductItem } from "../types";
import type { Review } from "../../reviews/types";
import { ReviewsList } from "../../reviews/components/ReviewsList";
import { ProductGrid } from "./ProductGrid";
import { RelatedProducts } from "./RelatedProducts";
import { BuyBar } from "./BuyBar";
import { ProductDetailView } from "./ProductDetailView";
import { ProductGalleryClient } from "./ProductGalleryClient";
import { ProductTabsShell } from "./ProductTabsShell";

export interface ProductDetailPageViewProps {
  slug: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapToProductItem(doc: Record<string, unknown>): ProductItem {
  return {
    id: String(doc.id ?? ""),
    title: String(doc.name ?? doc.title ?? "Product"),
    price: typeof doc.price === "number" ? doc.price : 0,
    mainImage: Array.isArray(doc.images)
      ? (doc.images[0] as string | undefined)
      : typeof doc.imageUrl === "string"
        ? doc.imageUrl
        : undefined,
    status: (doc.status as ProductItem["status"]) ?? "published",
    slug: typeof doc.slug === "string" ? doc.slug : undefined,
    sellerName: typeof doc.sellerName === "string" ? doc.sellerName : undefined,
    rating: typeof doc.rating === "number" ? doc.rating : undefined,
    reviewCount: typeof doc.reviewCount === "number" ? doc.reviewCount : undefined,
  };
}

function mapToReview(doc: Record<string, unknown>): Review {
  const images = Array.isArray(doc.images)
    ? (doc.images as string[]).map((url) => ({ url }))
    : undefined;

  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : typeof doc.createdAt === "string"
        ? doc.createdAt
        : undefined;

  const rawRating = typeof doc.rating === "number" ? doc.rating : 3;
  const rating = (Math.min(5, Math.max(1, Math.round(rawRating))) as 1 | 2 | 3 | 4 | 5);

  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    userId: String(doc.userId ?? ""),
    userName: String(doc.userName ?? "Anonymous"),
    userAvatar: typeof doc.userAvatar === "string" ? doc.userAvatar : undefined,
    rating,
    title: typeof doc.title === "string" ? doc.title : undefined,
    comment: typeof doc.comment === "string" ? doc.comment : undefined,
    images,
    status: (doc.status as Review["status"]) ?? "approved",
    helpfulCount: typeof doc.helpfulCount === "number" ? doc.helpfulCount : undefined,
    verified: doc.verified === true,
    featured: doc.featured === true,
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  const p = product as unknown as Record<string, unknown>;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();
  const price =
    typeof p.price === "number"
      ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(p.price)
      : null;

  const images: string[] = Array.isArray(p.images)
    ? (p.images as string[])
    : typeof p.imageUrl === "string"
      ? [p.imageUrl]
      : [];
  const inStock =
    typeof p.stockQuantity === "number" ? p.stockQuantity > 0 : p.status === "published";

  const specs: { name: string; value: string; unit?: string }[] = Array.isArray(p.specifications)
    ? (p.specifications as { name: string; value: string; unit?: string }[])
    : [];

  // Fetch reviews and related products in parallel
  const [reviewDocs, relatedDocs] = await Promise.all([
    reviewRepository.findApprovedByProduct(product.id).catch(() => []),
    typeof p.category === "string" && p.category
      ? productRepository.findByCategory(p.category).catch(() => [])
      : Promise.resolve([]),
  ]);

  const reviews: Review[] = reviewDocs.map((doc) =>
    mapToReview(doc as unknown as Record<string, unknown>),
  );

  const relatedItems: ProductItem[] = (relatedDocs as unknown as Record<string, unknown>[])
    .filter((r) => r.id !== product.id)
    .slice(0, 4)
    .map(mapToProductItem);

  return (
    <>
      <ProductDetailView
        renderGallery={() => (
          <ProductGalleryClient
            images={images}
            productName={typeof p.name === "string" ? p.name : undefined}
          />
        )}
        renderInfo={() => (
          <Stack gap="md">
            <Heading level={1} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {typeof p.name === "string" ? p.name : "Product"}
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
            {typeof p.description === "string" && p.description && (
              <RichText
                html={normalizeRichTextHtml(p.description)}
                className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
              />
            )}
            {typeof p.sellerName === "string" && p.sellerName && (
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
        renderTabs={() => (
          <ProductTabsShell
            descriptionContent={
              typeof p.description === "string" && p.description ? (
                <RichText
                  html={normalizeRichTextHtml(p.description)}
                  className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                />
              ) : undefined
            }
            specsContent={
              specs.length > 0 ? (
                <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden text-sm">
                  {specs.map((s, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3 bg-white dark:bg-zinc-900 even:bg-zinc-50 dark:even:bg-zinc-800/50">
                      <dt className="w-40 flex-shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                        {s.name}
                      </dt>
                      <dd className="flex-1 text-zinc-600 dark:text-zinc-400">
                        {s.value}{s.unit ? ` ${s.unit}` : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : undefined
            }
            reviewsContent={
              <ReviewsList
                reviews={reviews}
                emptyLabel="No reviews yet — be the first to review this product."
              />
            }
          />
        )}
        renderRelated={() =>
          relatedItems.length > 0 ? (
            <RelatedProducts
              labels={{ title: "You might also like" }}
              renderGrid={() => (
                <ProductGrid
                  products={relatedItems}
                  getProductHref={(item) =>
                    String(
                      ROUTES.PUBLIC.PRODUCT_DETAIL(
                        (item as unknown as Record<string, unknown>).slug
                          ? String((item as unknown as Record<string, unknown>).slug)
                          : item.id,
                      ),
                    )
                  }
                />
              )}
            />
          ) : null
        }
      />

      {/* Mobile sticky buy bar — hidden on lg+ (desktop uses inline action rail) */}
      <BuyBar>
        {price && (
          <Span className="mr-auto text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {price}
          </Span>
        )}
        <Button variant="primary" size="sm" className="flex-1" disabled={!inStock}>
          {inStock ? "Add to Cart" : "Out of Stock"}
        </Button>
      </BuyBar>
    </>
  );
}
