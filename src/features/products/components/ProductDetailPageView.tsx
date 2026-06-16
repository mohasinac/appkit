import Link from "next/link";
import { productRepository, reviewRepository } from "../../../repositories";

const __P = {
  p3: "p-3",
  p5: "p-5",
} as const;

const CLS_BREADCRUMB_LINK = "hover:text-primary-600 transition-colors";
const ACTION_NOT_WIRED = "Action not wired";

const CLS_STAR_FULL = "text-warning text-sm";
const CLS_STAR_HALF = "text-warning text-sm";
const CLS_STAR_EMPTY = "text-zinc-300 dark:text-zinc-600 text-sm";
const CLS_STOCK_IN = "bg-success-surface text-success dark:bg-success-surface dark:text-success";
const CLS_STOCK_OUT = "bg-error-surface text-error dark:bg-error-surface dark:text-error";
const CLS_BUNDLE_PILL = "inline-flex items-center gap-1 rounded-full border border-success bg-success-surface px-2.5 py-1 text-xs font-semibold text-success transition-colors hover:border-success hover:bg-success-surface dark:border-success/60 dark:bg-success-surface dark:text-success dark:hover:border-success dark:hover:bg-success-surface";
const CLS_DISCOUNT_BADGE = "rounded-full bg-error-surface px-2 py-0.5 text-white";
const CLS_FREE_SHIPPING_ICON = "mt-0.5 flex-shrink-0 text-success";
const CLS_BUNDLE_BOX = "rounded-xl border border-success dark:border-success/60 bg-success-surface dark:bg-success-surface p-5";
const CLS_BUNDLE_ICON = "text-success dark:text-success";
const CLS_BUNDLE_TITLE = "text-sm font-semibold text-success dark:text-success";
const CLS_BUNDLE_ROW = "flex items-center justify-between gap-4 rounded-lg border border-success dark:border-success/50 bg-white dark:bg-success-surface px-4 py-3";
const CLS_BUNDLE_LABEL = "text-xs text-success dark:text-success font-medium uppercase tracking-wide mb-0.5";
const CLS_BUNDLE_CTA = "flex-shrink-0 rounded-lg bg-success-surface hover:bg-success-surface px-3 py-1.5 text-xs font-semibold text-white transition-colors";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  Button,
  Container,
  Div,
  Heading,
  Main,
  Nav,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
  Ul,
  Ol,
  Li,
  Dl,
  Dt,
  Dd,
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
    storeId?: string;
    storeName?: string;
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
              ? CLS_STAR_FULL
              : i === full && half
                ? CLS_STAR_HALF
                : CLS_STAR_EMPTY
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
        <Section padding="y-5xl" >
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading
                level={1} size="2xl" weight="semibold" color="primary">
                Product Not Found
              </Heading>
              <Text color="muted">
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
  // categorySlugs/categoryNames: multi-category support (S-uni-formshell-prep)
  const categorySlugs: string[] = Array.isArray(p.categorySlugs)
    ? (p.categorySlugs as string[])
    : category ? [category] : [];
  const categoryNames: string[] = Array.isArray(p.categoryNames)
    ? (p.categoryNames as string[])
    : categoryName ? [categoryName] : [];
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

  const customFields: { name: string; value: string; unit?: string }[] =
    Array.isArray(p.customFields)
      ? (p.customFields as import("../schemas/firestore").CustomField[]).map((f) => ({
          name: f.key,
          value: String(f.value),
          unit: f.unit,
        }))
      : [];

  const allSpecs = [...specs, ...customFields];

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
      <Container size="xl" padding="y-lg">
        <ProductDetailView
          renderBreadcrumb={() => (
            <Row className="mb-4" align="center" justify="between" gap="sm" wrap>
              <Nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs flex-wrap" color="muted">
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
                    <Span transform="capitalize">{subcategory}</Span>
                  </>
                )}
              </Nav>
              <ShareButton title={title || undefined} />
            </Row>
          )}
          renderGallery={() => (
            <ProductGalleryClient images={images} productName={title || undefined} />
          )}
          renderInfo={() => (
            <Stack gap="md">
              {/* Title + condition badge */}
              <Div>
                {condition && (
                  <Span size="xs" weight="medium" className="mb-2 inline-block" padding="pill-sm" rounded="full" surface="subtle" color="muted" transform="capitalize">
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
                  className="leading-snug" smSize="2xl" color="primary" size="xl" weight="bold"
                >
                  {title || "Untitled Product"}
                </Heading>
              </Div>

              {/* Rating + stock status */}
              {avgRating !== null ? (
                <Row align="center" gap="sm">
                  <StarRating value={avgRating} />
                  <Span size="sm" color="muted">
                    {avgRating.toFixed(1)}
                    {reviewCount ? ` (${reviewCount} reviews)` : ""}
                  </Span>
                  <Span
                    size="xs"
                    weight="medium"
                    className={`ml-auto ${ inStock ? "bg-success-surface text-success" : "bg-error-surface text-error" }`} padding="pill-sm" rounded="full"
                  >
                    {inStock ? "✓ In Stock" : "✗ Out of Stock"}
                    {inStock && effectiveStock !== null && effectiveStock <= 10
                      ? ` — only ${effectiveStock} left`
                      : ""}
                  </Span>
                </Row>
              ) : (
                <Span
                  className={`inline-flex w-fit items-center gap-1.5 ${ inStock ? CLS_STOCK_IN : CLS_STOCK_OUT }`} rounded="full" padding="pill-md" size="xs" weight="medium"
                >
                  {inStock ? "✓ In Stock" : "✗ Out of Stock"}
                  {inStock && effectiveStock !== null && effectiveStock <= 10
                    ? ` — only ${effectiveStock} left`
                    : ""}
                </Span>
              )}

              {/* Category / subcategory / brand pills */}
              {(categorySlugs.length > 0 || subcategory || brand) && (
                <Row gap="sm" wrap>
                  {categorySlugs.map((slug, i) => (
                    <Link
                      key={slug}
                      href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(slug))}
                      className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                    >
                      {categoryNames[i] ?? slug}
                    </Link>
                  ))}
                  {subcategory && (
                    <Span size="xs" weight="medium" className="inline-flex items-center border border-zinc-100 dark:border-zinc-800 px-2.5" rounded="full" padding="y-2xs" surface="muted" color="muted" transform="capitalize">
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
                    <Span size="xs" weight="medium" className="inline-flex items-center border border-zinc-100 dark:border-zinc-800 px-2.5" rounded="full" padding="y-2xs" surface="muted" color="muted">
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
                      className={CLS_BUNDLE_PILL}
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
                <Div className="px-4" border="subtle" surface="muted" padding="y-sm" rounded="xl">
                  <Text className="mb-2 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
                    About this product
                  </Text>
                  <Ul spacing="comfortable" size="sm" color="primary">
                    {features.map((f, i) => (
                      <Li key={i} className="flex items-start gap-2">
                        <Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>
                        {f}
                      </Li>
                    ))}
                  </Ul>
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

              {/* Store card — W1-34 adds optional seller rating + review count */}
              {safeSeller && (
                <Div className={`${__P.p3}`} border="subtle" rounded="xl" surface="muted">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] tracking-wide mb-0.5" color="faint" transform="uppercase">
                        Sold by
                      </Text>
                      <Text size="sm" weight="semibold" color="primary">
                        {safeSeller}
                      </Text>
                      {typeof p.storeRating === "number" && p.storeRating > 0 && (
                        <Row gap="xs" align="center" className="mt-0.5">
                          <Text size="xs" color="muted">
                            <Span className="text-warning" aria-hidden="true">★</Span>{" "}
                            {(p.storeRating as number).toFixed(1)}
                            {typeof p.storeReviewCount === "number" &&
                              p.storeReviewCount > 0 &&
                              ` · ${p.storeReviewCount} reviews`}
                          </Text>
                        </Row>
                      )}
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
            <Stack className={`${__P.p5}`} border="subtle" gap="md" rounded="xl" surface="muted">
              {/* Price + discount */}
              {formattedPrice && (
                <Div>
                  <Row align="baseline" gap="sm" wrap>
                    <Text size="2xl" weight="bold" color="primary">
                      {formattedPrice}
                    </Text>
                    {formattedOriginal && discount && (
                      <>
                        <Span size="sm" className="line-through" color="faint">
                          {formattedOriginal}
                        </Span>
                        <Span size="xs" weight="bold" className={CLS_DISCOUNT_BADGE}>
                          -{discount}%
                        </Span>
                      </>
                    )}
                  </Row>
                  {inStock && effectiveStock !== null && effectiveStock <= 10 && (
                    <Text className="mt-1 text-warning" size="xs">
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
                    storeId: typeof p.storeId === "string" ? (p.storeId as string) : undefined,
                    storeName: typeof p.storeName === "string" ? (p.storeName as string) : undefined,
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
                <Div border="default" className="border-t space-y-2.5" padding="t-md">
                  {freeShipping && (
                    <Row align="start" gap="sm">
                      <Span className={CLS_FREE_SHIPPING_ICON}>🚚</Span>
                      <Div>
                        <Text size="xs" weight="medium" color="muted">
                          Free Delivery
                        </Text>
                        {shippingInfo && (
                          <Text size="xs" color="muted">{shippingInfo}</Text>
                        )}
                      </Div>
                    </Row>
                  )}
                  {!freeShipping && shippingInfo && (
                    <Row align="start" gap="sm">
                      <Span className="mt-0.5 flex-shrink-0" color="faint">📦</Span>
                      <Text size="xs" color="muted">
                        {shippingInfo}
                      </Text>
                    </Row>
                  )}
                  {returnPolicy && (
                    <Row align="start" gap="sm">
                      <Span className="mt-0.5 flex-shrink-0" color="faint">↺</Span>
                      <Text size="xs" color="muted">
                        {returnPolicy}
                      </Text>
                    </Row>
                  )}
                </Div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <Div border="default" className="border-t" padding="t-md">
                  <Text className="mb-2" color="muted" size="xs" weight="medium">
                    Tags
                  </Text>
                  <Row wrap gap="xs">
                    {tags.map((tag) => (
                      <Span
                        key={tag}
                        className="px-2.5" rounded="full" padding="y-2xs" surface="subtle" color="muted" size="xs"
                      >
                        {tag}
                      </Span>
                    ))}
                  </Row>
                </Div>
              )}

              {/* Trust badges */}
              <Div border="default" className="border-t" padding="t-md">
                <Row wrap gap="sm" justify="center" className="text-center">
                  {[
                    { icon: "🔒", label: "Secure\nPayment" },
                    { icon: "✓", label: "Verified\nSeller" },
                    { icon: "⭐", label: "Quality\nGuarantee" },
                  ].map(({ icon, label }) => (
                    <Stack key={label} className="text-xs text-zinc-500 dark:text-zinc-400 min-w-[60px]" align="center" gap="xs">
                      <Span size="base">{icon}</Span>
                      <Span className="whitespace-pre-line leading-tight">{label}</Span>
                    </Stack>
                  ))}
                </Row>
              </Div>
            </Stack>
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
                allSpecs.length > 0 ? (
                  <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden">
                    {allSpecs.map((s, i) => (
                      <Div
                        key={i}
                        className="flex gap-4 px-4 even:bg-zinc-50 dark:even:bg-zinc-800/50" surface="default" padding="y-sm"
                      >
                        <Dt className="w-36 flex-shrink-0" color="primary" weight="medium">
                          {s.name}
                        </Dt>
                        <Dd className="flex-1" color="muted">
                          {s.value}
                          {s.unit ? ` ${s.unit}` : ""}
                        </Dd>
                      </Div>
                    ))}
                  </Dl>
                ) : undefined
              }
              ingredientsContent={
                ingredients.length > 0 ? (
                  <Ul spacing="comfortable">
                    {ingredients.map((item, i) => (
                      <Li key={i} className="flex items-start gap-2">
                        <Span className="mt-1 flex-shrink-0 h-1.5 w-1.5 bg-primary-400" rounded="full" />
                        {item}
                      </Li>
                    ))}
                  </Ul>
                ) : undefined
              }
              howToUseContent={
                howToUse.length > 0 ? (
                  <Ol spacing="loose">
                    {howToUse.map((step, i) => (
                      <Li key={i} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <Span size="xs" weight="bold" className="flex-shrink-0 flex h-6 w-6 items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" rounded="full">
                          {i + 1}
                        </Span>
                        {step}
                      </Li>
                    ))}
                  </Ol>
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
                  <Div className={CLS_BUNDLE_BOX}>
                    <Row className="mb-3" align="center" gap="sm">
                      <Span size="base" className={CLS_BUNDLE_ICON} aria-hidden="true">📦</Span>
                      <Text className={CLS_BUNDLE_TITLE}>
                        Part of {bundleMemberships.length === 1 ? "a bundle" : `${bundleMemberships.length} bundles`}
                      </Text>
                    </Row>
                    <Stack gap="3">
                      {bundleMemberships.map((b) => (
                        <Div key={b.id} className={CLS_BUNDLE_ROW}>
                          <Div className="min-w-0">
                            <Text className={CLS_BUNDLE_LABEL}>
                              Included in bundle
                            </Text>
                            <Text className="truncate" color="primary" size="sm" weight="semibold">
                              {b.title}
                            </Text>
                          </Div>
                          <Link
                            href={String(ROUTES.PUBLIC.BUNDLE_DETAIL(b.id))}
                            className={CLS_BUNDLE_CTA}
                          >
                            View Bundle →
                          </Link>
                        </Div>
                      ))}
                    </Stack>
                  </Div>
                )
              : undefined
          }
          renderRelated={() =>
            relatedItems.length > 0 ? (
              <RelatedProductsCarousel items={relatedItems} />
            ) : null
          }
        />

        {/* Mobile actions registered via useBottomActions() in ProductDetailActions variant="mobile" */}
        {renderPrimaryActions
          ? renderPrimaryActions({
              productId: product.id,
              productSlug: product.slug ?? slug,
              productTitle: product.title,
              productImage: product.mainImage,
              price,
              currency,
              storeId: typeof p.storeId === "string" ? (p.storeId as string) : undefined,
              storeName: typeof p.storeName === "string" ? (p.storeName as string) : undefined,
              inStock,
              variant: "mobile",
            })
          : null}
      </Container>
    </Main>
  );
}
