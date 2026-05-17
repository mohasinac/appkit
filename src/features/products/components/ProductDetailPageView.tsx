import Link from "next/link";
import { productRepository, reviewRepository } from "../../../repositories";

const CLS_BREADCRUMB_LINK = "hover:text-primary-600 transition-colors";
const ACTION_NOT_WIRED = "Action not wired";
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
import { formatCurrency } from "../../../utils/number.formatter";
import { safeDisplayName } from "../../../security";
import type { ProductItem } from "../types";
import type { Review } from "../../reviews/types";
import { ReviewsList } from "../../reviews/components/ReviewsList";
import { ProductDetailView } from "./ProductDetailView";
import { ProductGalleryClient } from "./ProductGalleryClient";
import { ProductTabsShell } from "./ProductTabsShell";
import { ProductFeatureBadges } from "./ProductFeatureBadges";
import { FeatureBadgeList } from "./FeatureBadge";
import type { ProductFeatureDocument } from "../schemas/product-features";
import { RelatedProductsCarousel } from "./RelatedProductsCarousel";
import { BuyBar } from "./BuyBar";
import { ShareButton } from "./ShareButton";
import { CustomSectionTabContent } from "./CustomSectionTabContent";
import { SublistingCarouselSection } from "./SublistingCarouselSection";
import { ShowGroupSection } from "./ShowGroupSection";
import type { CustomSection } from "../schemas/firestore";
import { HistoryTracker } from "../../history/components/HistoryTracker";

export interface ProductDetailPageViewProps {
  slug: string;
  /**
   * Pre-fetched product document from the page's server data layer.
   * When provided, the internal repository call is skipped — deduplicating
   * the fetch with generateMetadata() via React.cache().
   * When absent, the component falls back to fetching by slug (backward compat).
   */
  initialProduct?: import("../schemas/firestore").ProductDocument | null;
  /**
   * Render prop for offer UI. Receives the resolved product fields.
   * Only called when product.allowOffers is true and product.type is "simple".
   */
  renderOfferAction?: (opts: {
    productId: string;
    price: number;
    currency: string;
    minOfferPercent: number;
  }) => React.ReactNode;
  /**
   * Renders the primary action buttons (Buy Now / Add to Cart / Wishlist).
   * Receives variant so a single consumer can render desktop + mobile differently.
   * When omitted, disabled placeholder buttons render — a loud signal of drift.
   */
  renderPrimaryActions?: (opts: {
    productId: string;
    productSlug: string;
    productTitle: string;
    productImage?: string;
    price: number | null;
    currency: string;
    inStock: boolean;
    variant: "desktop" | "mobile";
  }) => React.ReactNode;
  /**
   * SSR-loaded productFeatures (platform + store-scope). When present, the
   * product.features[] IDs render as FeatureBadge pills; the legacy text
   * Highlights list is suppressed to avoid double-render. When absent, the
   * legacy bullets render unchanged.
   */
  productFeatures?: ProductFeatureDocument[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toProductItem(doc: Record<string, unknown>): ProductItem {
  return {
    id: String(doc.id ?? ""),
    title: String(doc.title ?? doc.name ?? ""),
    price: typeof doc.price === "number" ? doc.price : 0,
    originalPrice:
      typeof doc.originalPrice === "number" ? doc.originalPrice : undefined,
    mainImage: Array.isArray(doc.images)
      ? (doc.images[0] as string | undefined)
      : typeof doc.mainImage === "string"
        ? doc.mainImage
        : undefined,
    status: (doc.status as ProductItem["status"]) ?? "published",
    slug: typeof doc.slug === "string" ? doc.slug : undefined,
    storeName: typeof doc.storeName === "string" ? doc.storeName : undefined,
    rating: typeof doc.rating === "number" ? doc.rating : undefined,
    reviewCount:
      typeof doc.reviewCount === "number" ? doc.reviewCount : undefined,
  };
}

function toReview(doc: Record<string, unknown>): Review {
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
  const rating = Math.min(5, Math.max(1, Math.round(rawRating))) as
    | 1
    | 2
    | 3
    | 4
    | 5;

  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    userId: String(doc.userId ?? ""),
    userName: String(doc.userName ?? "Anonymous"),
    userAvatar:
      typeof doc.userAvatar === "string" ? doc.userAvatar : undefined,
    rating,
    title: typeof doc.title === "string" ? doc.title : undefined,
    comment: typeof doc.comment === "string" ? doc.comment : undefined,
    images,
    status: (doc.status as Review["status"]) ?? "approved",
    helpfulCount:
      typeof doc.helpfulCount === "number" ? doc.helpfulCount : undefined,
    verified: doc.verified === true,
    featured: doc.featured === true,
    createdAt,
  };
}

function toDescriptionHtml(raw: unknown): string {
  if (!raw) return "";
  const s =
    typeof raw === "string" ? raw : JSON.stringify(raw);
  return normalizeRichTextHtml(s);
}

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <Row align="center" gap="xs">
      {Array.from({ length: 5 }).map((_, i) => (
        <Span
          key={i}
          className={
            i < full
              ? "text-yellow-400 text-sm"
              : i === full && half
                ? "text-yellow-300 text-sm"
                : "text-zinc-300 dark:text-zinc-600 text-sm"
          }
        >
          ★
        </Span>
      ))}
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export async function ProductDetailPageView({
  slug,
  initialProduct,
  renderOfferAction,
  renderPrimaryActions,
  productFeatures,
}: ProductDetailPageViewProps) {
  // Use pre-fetched data when available to avoid a redundant repository call.
  // The page layer wraps getProductForDetail in React.cache(), so both
  // generateMetadata() and this component share the same in-flight promise.
  const product = initialProduct !== undefined
    ? (initialProduct ?? undefined)
    : await productRepository.findByIdOrSlug(slug).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading
                level={1}
                className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Product Not Found
              </Heading>
              <Text className="text-zinc-500">
                The product you are looking for may have been removed or the
                link is incorrect.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.PRODUCTS)}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Browse Products
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as Record<string, unknown>;
  const currency =
    (p.currency as string | undefined) || getDefaultCurrency();

  // -- Derived values ---------------------------------------------------------
  const title = String(p.title ?? p.name ?? "");
  const price =
    typeof p.price === "number" ? (p.price as number) : null;
  const originalPrice =
    typeof p.originalPrice === "number" ? (p.originalPrice as number) : null;
  const discount =
    price && originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const images: string[] = Array.isArray(p.images)
    ? (p.images as string[])
    : typeof p.mainImage === "string"
      ? [p.mainImage]
      : [];

  const stockQuantity =
    typeof p.stockQuantity === "number" ? (p.stockQuantity as number) : null;
  const availableQuantity =
    typeof p.availableQuantity === "number"
      ? (p.availableQuantity as number)
      : null;
  const effectiveStock = availableQuantity ?? stockQuantity;
  const inStock =
    effectiveStock !== null ? effectiveStock > 0 : p.status === "published";

  const avgRating =
    typeof p.avgRating === "number" ? (p.avgRating as number) : null;
  const reviewCount =
    typeof p.reviewCount === "number" ? (p.reviewCount as number) : null;

  const category =
    typeof p.category === "string" ? (p.category as string) : null;
  const categoryName = typeof p.categoryName === "string" ? (p.categoryName as string) : null;
  const subcategory =
    typeof p.subcategory === "string" ? (p.subcategory as string) : null;
  const brand = typeof p.brand === "string" ? (p.brand as string) : null;
  const brandSlug = typeof p.brandSlug === "string" ? (p.brandSlug as string) : null;
  const condition =
    typeof p.condition === "string" ? (p.condition as string) : null;

  // SB7-B — bundle reverse refs. partOfBundleIds + partOfBundleTitles are
  // parallel arrays maintained by the bundles repository's syncReverseRefs.
  const partOfBundleIds: string[] = Array.isArray(p.partOfBundleIds)
    ? (p.partOfBundleIds as string[])
    : [];
  const partOfBundleTitles: string[] = Array.isArray(p.partOfBundleTitles)
    ? (p.partOfBundleTitles as string[])
    : [];
  const bundleMemberships = partOfBundleIds.map((id, i) => ({
    id,
    title: partOfBundleTitles[i] ?? id,
  }));

  const tags: string[] = Array.isArray(p.tags) ? (p.tags as string[]) : [];
  const features: string[] = Array.isArray(p.features)
    ? (p.features as string[])
    : [];
  const ingredients: string[] = Array.isArray(p.ingredients)
    ? (p.ingredients as string[])
    : [];
  const howToUse: string[] = Array.isArray(p.howToUse)
    ? (p.howToUse as string[])
    : [];

  const specs: { name: string; value: string; unit?: string }[] =
    Array.isArray(p.specifications)
      ? (p.specifications as { name: string; value: string; unit?: string }[])
      : [];

  const customSections: CustomSection[] = Array.isArray(p.customSections)
    ? (p.customSections as CustomSection[])
    : [];

  const allowOffers = p.allowOffers === true;
  const productType =
    typeof p.type === "string" ? (p.type as string) : "simple";
  const minOfferPercent =
    typeof p.minOfferPercent === "number" ? (p.minOfferPercent as number) : 70;

  const shippingInfo =
    typeof p.shippingInfo === "string" ? (p.shippingInfo as string) : null;
  const returnPolicy =
    typeof p.returnPolicy === "string" ? (p.returnPolicy as string) : null;
  const shippingPaidBy = p.shippingPaidBy as "seller" | "buyer" | undefined;
  const freeShipping = shippingPaidBy === "seller";
  const featured = p.featured === true;
  const storeName = typeof p.storeName === "string" ? (p.storeName as string) : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug = (typeof p.storeSlug === "string" ? p.storeSlug : null) || (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug
    ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))
    : null;

  const descriptionHtml = toDescriptionHtml(p.description);
  const sublistingCategoryId = typeof p.sublistingCategoryId === "string" ? p.sublistingCategoryId : null;
  const groupId = typeof p.groupId === "string" ? p.groupId : null;
  const isGroupParent = p.isGroupParent === true;
  const groupTitle = typeof p.groupTitle === "string" ? p.groupTitle : undefined;

  // -- Fetch reviews + related in parallel ------------------------------------
  const [reviewDocs, relatedDocs] = await Promise.all([
    reviewRepository
      .findApprovedByProduct(product.id)
      .catch(() => [] as unknown[]),
    category
      ? productRepository.findByCategory(category).catch(() => [] as unknown[])
      : Promise.resolve([] as unknown[]),
  ]);

  const reviews: Review[] = (reviewDocs as Record<string, unknown>[]).map(
    toReview,
  );
  const _now = new Date();
  const relatedItems: ProductItem[] = (
    relatedDocs as Record<string, unknown>[]
  )
    .filter((r) => {
      if (r.id === product.id) return false;
      const s = r.status as string | undefined;
      if (s && ["sold", "out_of_stock", "archived", "discontinued", "draft"].includes(s)) return false;
      if (r.isSold === true) return false;
      if (r.availableQuantity === 0) return false;
      if (r.listingType === "auction" && r.auctionEndDate) {
        const end = r.auctionEndDate;
        const endDate = typeof (end as { toDate?: () => Date }).toDate === "function"
          ? (end as { toDate: () => Date }).toDate()
          : end instanceof Date ? end : new Date(String(end));
        if (endDate <= _now) return false;
      }
      if (r.listingType === "prize-draw" && r.prizeRevealStatus === "closed") return false;
      return true;
    })
    .slice(0, 8)
    .map(toProductItem);

  const formattedPrice = price !== null ? formatCurrency(price, currency) : null;
  const formattedOriginal =
    originalPrice !== null ? formatCurrency(originalPrice, currency) : null;

  return (
    <Main>
      <HistoryTracker
        productId={product.id}
        productType="product"
        snapshot={{
          title: product.title,
          thumb: product.mainImage ?? product.images?.[0],
          price: product.price,
          storeId: product.storeId,
          storeName: product.storeName,
        }}
      />
      <Container size="xl" className="px-4 py-6">
        <ProductDetailView
          renderBreadcrumb={() => (
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                <Link href={String(ROUTES.HOME)} className={CLS_BREADCRUMB_LINK}>
                  Home
                </Link>
                <Span aria-hidden>/</Span>
                <Link href={String(ROUTES.PUBLIC.PRODUCTS)} className={CLS_BREADCRUMB_LINK}>
                  Products
                </Link>
                {category && (
                  <>
                    <Span aria-hidden>/</Span>
                    <Link href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))} className={CLS_BREADCRUMB_LINK}>
                      {categoryName || category}
                    </Link>
                  </>
                )}
                {subcategory && (
                  <>
                    <Span aria-hidden>/</Span>
                    <Span className="capitalize">{subcategory}</Span>
                  </>
                )}
              </nav>
              <ShareButton title={title || undefined} />
            </div>
          )}
          renderGallery={() => (
            <ProductGalleryClient images={images} productName={title || undefined} />
          )}
          renderInfo={() => (
            <Stack gap="md">
              {/* Title + condition badge */}
              <Div>
                {condition && (
                  <Span className="mb-2 inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-600 dark:text-zinc-300">
                    {condition === "new"
                      ? "Brand New"
                      : condition === "like_new"
                        ? "Like New"
                        : condition === "refurbished"
                          ? "Refurbished"
                          : condition === "used"
                            ? "Used"
                            : condition}
                  </Span>
                )}
                <Heading
                  level={1}
                  className="text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-2xl"
                >
                  {title || "Untitled Product"}
                </Heading>
              </Div>

              {/* Rating + stock status */}
              {avgRating !== null ? (
                <Row align="center" gap="sm">
                  <StarRating value={avgRating} />
                  <Span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {avgRating.toFixed(1)}
                    {reviewCount ? ` (${reviewCount} reviews)` : ""}
                  </Span>
                  <Span
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      inStock
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {inStock ? "✓ In Stock" : "✗ Out of Stock"}
                    {inStock && effectiveStock !== null && effectiveStock <= 10
                      ? ` — only ${effectiveStock} left`
                      : ""}
                  </Span>
                </Row>
              ) : (
                <Span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    inStock
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {inStock ? "✓ In Stock" : "✗ Out of Stock"}
                  {inStock && effectiveStock !== null && effectiveStock <= 10
                    ? ` — only ${effectiveStock} left`
                    : ""}
                </Span>
              )}

              {/* Category / subcategory / brand pills */}
              {(categoryName || category || subcategory || brand) && (
                <Row gap="sm" wrap>
                  {category && (
                    <Link
                      href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))}
                      className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                    >
                      {categoryName || category}
                    </Link>
                  )}
                  {subcategory && (
                    <Span className="inline-flex items-center rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 capitalize">
                      {subcategory}
                    </Span>
                  )}
                  {brand && brandSlug && (
                    <Link
                      href={String(ROUTES.PUBLIC.BRAND_DETAIL(brandSlug))}
                      className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                    >
                      {brand}
                    </Link>
                  )}
                  {brand && !brandSlug && (
                    <Span className="inline-flex items-center rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {brand}
                    </Span>
                  )}
                </Row>
              )}

              {/* SB7-B — In-bundle pills. One Link per bundle membership;
                  clicking jumps to /bundles/{id}. Sits below category pills
                  so the buyer sees membership in the same visual band. */}
              {bundleMemberships.length > 0 && (
                <Row gap="sm" wrap>
                  {bundleMemberships.map((b) => (
                    <Link
                      key={b.id}
                      href={String(ROUTES.PUBLIC.BUNDLE_DETAIL(b.id))}
                      className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition-colors hover:border-teal-500 hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:border-teal-600 dark:hover:bg-teal-900/50"
                    >
                      <Span aria-hidden="true">📦</Span>
                      In bundle: {b.title}
                    </Link>
                  ))}
                </Row>
              )}

              {/* Feature badges */}
              <ProductFeatureBadges
                featured={featured}
                freeShipping={freeShipping}
                condition={condition ?? undefined}
                returnable={returnPolicy != null && returnPolicy.length > 0}
                labels={{
                  featured: "Featured",
                  fasterDelivery: "Faster Delivery",
                  ratedSeller: "Rated Seller",
                  condition: "Condition",
                  conditionNew: "New",
                  conditionUsed: "Used",
                  conditionBroken: "For Parts",
                  conditionRefurbished: "Refurbished",
                  returnable: "Returnable",
                  freeShipping: "Free Shipping",
                  codAvailable: "Cash on Delivery",
                  wishlistCount: (n) => `${n} wishlisted`,
                  categoryProductCount: (n, cat) => `${n} in ${cat}`,
                }}
              />

              {/* Feature badges (FI6) — when productFeatures prop is passed */}
              {productFeatures && features.length > 0 && (
                <FeatureBadgeList
                  productFeatureIds={features}
                  features={productFeatures}
                />
              )}

              {/* Highlights (legacy text fallback) — suppressed when productFeatures is provided */}
              {!productFeatures && features.length > 0 && (
                <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    About this product
                  </Text>
                  <ul className="space-y-1.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </Div>
              )}

              {/* Description preview — full content is in the Description tab */}
              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-4"
                />
              )}

              {/* Store card */}
              {safeSeller && (
                <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-0.5">
                        Sold by
                      </Text>
                      <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {safeSeller}
                      </Text>
                    </Div>
                    {storeHref && (
                      <Link
                        href={storeHref}
                        className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                      >
                        Visit Store →
                      </Link>
                    )}
                  </Row>
                </Div>
              )}
            </Stack>
          )}
          renderActions={() => (
            <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 space-y-4">
              {/* Price + discount */}
              {formattedPrice && (
                <Div>
                  <Row align="baseline" gap="sm" wrap>
                    <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {formattedPrice}
                    </Text>
                    {formattedOriginal && discount && (
                      <>
                        <Span className="text-sm text-zinc-400 line-through dark:text-zinc-500">
                          {formattedOriginal}
                        </Span>
                        <Span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          -{discount}%
                        </Span>
                      </>
                    )}
                  </Row>
                  {inStock && effectiveStock !== null && effectiveStock <= 10 && (
                    <Text className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Only {effectiveStock} left — order soon!
                    </Text>
                  )}
                </Div>
              )}

              {/* Actions */}
              <Stack gap="sm">
                {renderPrimaryActions ? (
                  renderPrimaryActions({
                    productId: product.id,
                    productSlug: product.slug ?? slug,
                    productTitle: product.title,
                    productImage: product.mainImage,
                    price,
                    currency,
                    inStock,
                    variant: "desktop",
                  })
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled
                      title={ACTION_NOT_WIRED}
                    >
                      {inStock ? "Buy Now" : "Out of Stock"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full"
                      disabled
                      title={ACTION_NOT_WIRED}
                    >
                      {inStock ? "Add to Cart" : "Out of Stock"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full"
                      disabled
                      title={ACTION_NOT_WIRED}
                    >
                      ♡ Add to Wishlist
                    </Button>
                  </>
                )}
                {allowOffers && productType === "simple" && price !== null && renderOfferAction?.({
                  productId: product.id,
                  price,
                  currency,
                  minOfferPercent,
                })}
              </Stack>

              {/* Delivery & Returns */}
              {(shippingInfo || returnPolicy || freeShipping) && (
                <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 space-y-2.5">
                  {freeShipping && (
                    <Row align="start" gap="sm">
                      <Span className="mt-0.5 flex-shrink-0 text-emerald-500">🚚</Span>
                      <Div>
                        <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Free Delivery
                        </Text>
                        {shippingInfo && (
                          <Text className="text-xs text-zinc-500">{shippingInfo}</Text>
                        )}
                      </Div>
                    </Row>
                  )}
                  {!freeShipping && shippingInfo && (
                    <Row align="start" gap="sm">
                      <Span className="mt-0.5 flex-shrink-0 text-zinc-400">📦</Span>
                      <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                        {shippingInfo}
                      </Text>
                    </Row>
                  )}
                  {returnPolicy && (
                    <Row align="start" gap="sm">
                      <Span className="mt-0.5 flex-shrink-0 text-zinc-400">↺</Span>
                      <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                        {returnPolicy}
                      </Text>
                    </Row>
                  )}
                </Div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                  <Text className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tags
                  </Text>
                  <Row wrap gap="xs">
                    {tags.map((tag) => (
                      <Span
                        key={tag}
                        className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        {tag}
                      </Span>
                    ))}
                  </Row>
                </Div>
              )}

              {/* Trust badges */}
              <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <Row wrap gap="sm" className="justify-center text-center">
                  {[
                    { icon: "🔒", label: "Secure\nPayment" },
                    { icon: "✓", label: "Verified\nSeller" },
                    { icon: "⭐", label: "Quality\nGuarantee" },
                  ].map(({ icon, label }) => (
                    <Div key={label} className="flex flex-col items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 min-w-[60px]">
                      <Span className="text-base">{icon}</Span>
                      <Span className="whitespace-pre-line leading-tight">{label}</Span>
                    </Div>
                  ))}
                </Row>
              </Div>
            </Div>
          )}
          renderSublistingSection={
            sublistingCategoryId
              ? () => (
                  <SublistingCarouselSection
                    sublistingCategoryId={sublistingCategoryId}
                    currentListingId={String(product.id)}
                  />
                )
              : undefined
          }
          renderGroupSection={
            groupId
              ? () => (
                  <ShowGroupSection
                    groupId={groupId}
                    currentSlug={String(p.slug ?? product.id)}
                    isParent={isGroupParent}
                    groupTitle={groupTitle}
                  />
                )
              : undefined
          }
          renderTabs={() => (
            <ProductTabsShell
              descriptionContent={
                descriptionHtml ? (
                  <RichText
                    html={descriptionHtml}
                    proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
                    className="text-zinc-700 dark:text-zinc-300"
                  />
                ) : undefined
              }
              specsContent={
                specs.length > 0 ? (
                  <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden text-sm">
                    {specs.map((s, i) => (
                      <div
                        key={i}
                        className="flex gap-4 px-4 py-3 bg-white dark:bg-zinc-900 even:bg-zinc-50 dark:even:bg-zinc-800/50"
                      >
                        <dt className="w-36 flex-shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                          {s.name}
                        </dt>
                        <dd className="flex-1 text-zinc-600 dark:text-zinc-400">
                          {s.value}
                          {s.unit ? ` ${s.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : undefined
              }
              ingredientsContent={
                ingredients.length > 0 ? (
                  <ul className="space-y-2">
                    {ingredients.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Span className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : undefined
              }
              howToUseContent={
                howToUse.length > 0 ? (
                  <ol className="space-y-3">
                    {howToUse.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <Span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-700 dark:text-primary-300">
                          {i + 1}
                        </Span>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : undefined
              }
              reviewsContent={
                <ReviewsList
                  reviews={reviews}
                  context="listing"
                  emptyLabel="No reviews yet — be the first to review this product."
                />
              }
              customTabs={customSections.map((s) => ({
                id: s.id,
                label: s.title,
                content: <CustomSectionTabContent section={s} />,
              }))}
            />
          )}
          renderBundleSection={
            bundleMemberships.length > 0
              ? () => (
                  <div className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/60 dark:bg-teal-900/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Span className="text-teal-600 dark:text-teal-400 text-base" aria-hidden="true">📦</Span>
                      <Text className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                        Part of {bundleMemberships.length === 1 ? "a bundle" : `${bundleMemberships.length} bundles`}
                      </Text>
                    </div>
                    <div className="flex flex-col gap-3">
                      {bundleMemberships.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-4 rounded-lg border border-teal-200 dark:border-teal-800/50 bg-white dark:bg-teal-900/30 px-4 py-3">
                          <div className="min-w-0">
                            <Text className="text-xs text-teal-600 dark:text-teal-400 font-medium uppercase tracking-wide mb-0.5">
                              Included in bundle
                            </Text>
                            <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                              {b.title}
                            </Text>
                          </div>
                          <Link
                            href={String(ROUTES.PUBLIC.BUNDLE_DETAIL(b.id))}
                            className="flex-shrink-0 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            View Bundle →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              : undefined
          }
          renderRelated={() =>
            relatedItems.length > 0 ? (
              <RelatedProductsCarousel items={relatedItems} />
            ) : null
          }
        />

        {/* Mobile sticky buy bar */}
        <BuyBar>
          {formattedPrice && (
            <Span className="mr-auto text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {formattedPrice}
            </Span>
          )}
          {renderPrimaryActions ? (
            renderPrimaryActions({
              productId: product.id,
              productSlug: product.slug ?? slug,
              productTitle: product.title,
              productImage: product.mainImage,
              price,
              currency,
              inStock,
              variant: "mobile",
            })
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                disabled
                title={ACTION_NOT_WIRED}
              >
                Add to Cart
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                disabled
                title={ACTION_NOT_WIRED}
              >
                {inStock ? "Buy Now" : "Out of Stock"}
              </Button>
            </>
          )}
        </BuyBar>
      </Container>
    </Main>
  );
}
