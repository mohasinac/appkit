import Link from "next/link";
import { OwnerQuickActions } from "../../../features/admin/components/OwnerQuickActions";
import type { FirestoreDocument } from "@mohasinac/appkit";
import { getDigitalCodeForDetail } from "../../../_internal/server/features/digital-code/data";

const CLS_BREADCRUMB_LINK = "hover:text-primary-600 dark:hover:text-primary-400 transition-colors";
const CLS_DIGITALCODE_BADGE = "inline-block rounded-full bg-violet-100 dark:bg-violet-900/30 px-[var(--appkit-space-2-5)] py-[var(--appkit-space-0-5)] text-violet-700 dark:text-violet-300";

import { ROUTES } from "../../../next/routing/route-map";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { formatCurrency } from "../../../utils/number.formatter";
import { toDescriptionHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import {
  Div,
  Container,
  GatedPrice,
  Heading,
  Main,
  Nav,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
  SpecTable,
} from "../../../ui";
import { PreOrderDetailView } from "../../products/components/PreOrderDetailView";
import { ProductGalleryClient } from "../../products/components/ProductGalleryClient";
import { ProductTabsShell } from "../../products/components/ProductTabsShell";
import { toCustomSectionTabs } from "../../products/components/CustomSectionTabContent";
import { ShareButton } from "../../products/components/ShareButton";
import { HistoryTracker } from "../../history/components/HistoryTracker";
import { RelatedItemsSection } from "../../products/components/RelatedItemsSection";
import { computeRelatedItems, getReviewPageForProduct } from "../../../_internal/server/features/products/data";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { getGroupsWithItemsForProduct } from "../../../_internal/server/features/grouped/data";
import { ReviewsListingPanel } from "../../reviews/components/ReviewsListingPanel";
import { ListingBottomActions } from "../../products/components/ListingBottomActions";
import { productImageUrls } from "../../products/schemas/firestore";
import type { ProductDocument } from "../../products/schemas/firestore";
import { PurchaseReviewAffordance } from "../../reviews/components/PurchaseReviewAffordance";

export interface DigitalCodeDetailPageViewProps {
  slug: string;
  /** Pre-fetched product document — dedupes with generateMetadata() via React.cache(). */
  initialProduct?: ProductDocument | null;
  /** Render-prop for the buy bar (Add to Cart / Buy Now / Wishlist) — wired by the page shim, same component standard products use. */
  renderPrimaryActions?: (ctx: {
    productId: string;
    productSlug: string;
    productTitle: string;
    productImage?: string;
    price: number | null;
    currency: string;
    storeId?: string;
    storeName?: string;
    inStock: boolean;
  }) => React.ReactNode;
}

export async function DigitalCodeDetailPageView({ slug, initialProduct, renderPrimaryActions }: DigitalCodeDetailPageViewProps) {
  const product = initialProduct !== undefined
    ? (initialProduct ?? undefined)
    // The listing IS this page's subject — a read failure must surface rather
    // than become the same `undefined` a removed listing produces, which the
    // "Not Found" branch below already handles.
    : await getDigitalCodeForDetail(slug);

  if (!product) {
    return (
      <Main>
        <Section padding="y-5xl">
          <Container size="md">
            <Stack align="start" gap="md" className="text-left">
              <Heading level={1} size="2xl" weight="semibold" color="primary">
                Digital Code Listing Not Found
              </Heading>
              <Text color="muted">The digital code listing you are looking for may have been removed.</Text>
              <Link href={String(ROUTES.PUBLIC.DIGITAL_CODES)} className="text-[length:var(--appkit-text-sm)] font-medium text-primary-600 hover:underline">
                Browse Digital Codes
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as FirestoreDocument;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();
  const title = String(p.title ?? p.name ?? "Digital Code");
  const price = typeof p.price === "number" ? p.price : null;
  // `images` is `ProductImage[]` since A6 — `productImageUrls` is the one
  // normaliser (it also accepts the legacy `string[]`). Casting it to
  // `string[]` handed the gallery objects and rendered a placeholder.
  const galleryUrls = productImageUrls(p.images);
  const images: string[] =
    galleryUrls.length > 0
      ? galleryUrls
      : typeof p.mainImage === "string"
        ? [p.mainImage]
        : [];
  const meta = product.digitalCode;
  const codesLeft = meta?.codesAvailable ?? 0;
  const category = Array.isArray(p.categorySlugs) && p.categorySlugs.length > 0 ? String(p.categorySlugs[0]) : (typeof p.category === "string" ? p.category : null);
  const categoryName = Array.isArray(p.categoryNames) && p.categoryNames.length > 0 ? String(p.categoryNames[0]) : (typeof p.categoryName === "string" ? p.categoryName : null);
  const brand = typeof p.brand === "string" ? p.brand : undefined;
  const storeName = typeof p.storeName === "string" ? p.storeName : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug = (typeof p.storeSlug === "string" ? p.storeSlug : null) || (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug)) : null;
  const specs: { name: string; value: string; unit?: string }[] = Array.isArray(p.specifications) ? (p.specifications as { name: string; value: string; unit?: string }[]) : [];
  const descriptionHtml = toDescriptionHtml(p.description);

  const [{ relatedItems, relatedByBrand, relatedByTags, relatedByStore }, groups, initialReviews] = await Promise.all([
    computeRelatedItems(product),
    getGroupsWithItemsForProduct(product.id),
    getReviewPageForProduct(product.id),
  ]);

  return (
    <Main>
      <HistoryTracker
        productId={String(p.id ?? p.slug ?? "")}
        productType="product"
        snapshot={{
          title,
          thumb: images[0],
          price: price ?? undefined,
          storeId: typeof p.storeId === "string" ? p.storeId : undefined,
          storeName: storeName ?? undefined,
        }}
      />
      <Container size="xl" padding="y-lg">
        <Row className="mb-4" align="center" justify="between" gap="sm" wrap>
          <Nav aria-label="Breadcrumb" layout="flex-wrap" gap="2xs" textSize="xs" color="muted">
            <Link href={String(ROUTES.HOME)} className={CLS_BREADCRUMB_LINK}>Home</Link>
            <Span aria-hidden>/</Span>
            <Link href={String(ROUTES.PUBLIC.DIGITAL_CODES)} className={CLS_BREADCRUMB_LINK}>Digital Codes</Link>
            {category && (
              <>
                <Span aria-hidden>/</Span>
                <Link href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))} className={CLS_BREADCRUMB_LINK}>
                  {categoryName || category}
                </Link>
              </>
            )}
            <Span aria-hidden>/</Span>
            <Span className="truncate max-w-[200px]" color="muted">{title}</Span>
          </Nav>
          <ShareButton title={title} />
        </Row>

        <PreOrderDetailView
          renderGallery={() => <ProductGalleryClient images={images} productName={title} />}
          renderInfo={() => (
            <Stack gap="md">
              <Div>
                <Row gap="xs" wrap className="mb-2">
                  <Span size="xs" weight="semibold" className={CLS_DIGITALCODE_BADGE}>Digital Code</Span>
                  {codesLeft > 0 ? (
                    <Span size="xs" weight="medium" className="inline-block" padding="pill-sm" rounded="full" surface="subtle" color="muted">{codesLeft} available</Span>
                  ) : (
                    <Span size="xs" weight="semibold" className="inline-block" padding="pill-sm" rounded="full" surface="danger-surface" color="error">Sold out</Span>
                  )}
                </Row>
                {/*
                  Owner quick-actions, rendered DIRECTLY rather than through a
                  slot prop: OwnerQuickActions self-gates on the session, so an
                  async RSC can hand it the record and let it decide whether to
                  appear at all.

                  Ownership goes in as the store SLUG, which is what
                  SessionUser.storeId holds. A listing is owned by its store.

                  🛑 Anchored to the CONTENT heading, not the first h1 in the
                  file — that one belongs to the "Not Found" branch, where the
                  record is narrowed to never and the toolbar would describe a
                  listing that does not exist.
                */}
                <OwnerQuickActions
                  resource="PRODUCT"
                  placement="detail"
                  recordLabel={String(p.title ?? p.slug ?? p.id)}
                  storeId={p.storeId ? String(p.storeId) : undefined}
                  editHref={String(ROUTES.STORE.PRODUCTS_EDIT(String(p.id)))}
                />
                <Heading level={1} className="leading-snug" smSize="2xl" color="primary" size="xl" weight="bold">
                  {title}
                </Heading>
              </Div>

              {price !== null && (
                <Text size="2xl" weight="bold" color="primary">
                  <GatedPrice>{formatCurrency(price, currency)}</GatedPrice>
                </Text>
              )}

              {meta?.redemptionInstructions && (
                <Text size="xs" color="muted">{meta.redemptionInstructions}</Text>
              )}

              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-[length:var(--appkit-text-sm)] leading-relaxed text-[var(--appkit-color-text-muted)] line-clamp-4"
                />
              )}

              {safeSeller && (
                <Div border="subtle" rounded="xl" surface="muted" padding="md">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] tracking-wide mb-0.5" color="faint" transform="uppercase">Sold by</Text>
                      <Text size="sm" weight="semibold" color="primary">{safeSeller}</Text>
                    </Div>
                    {storeHref && (
                      <Link
                        href={storeHref}
                        className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                      >
                        Visit Store →
                      </Link>
                    )}
                  </Row>
                </Div>
              )}
            </Stack>
          )}
          renderTabs={() => (
            <ProductTabsShell
              descriptionContent={
                descriptionHtml ? (
                  <RichText
                    html={descriptionHtml}
                    proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
                    className="text-[var(--appkit-color-text-muted)]"
                  />
                ) : undefined
              }
              specsContent={
                specs.length > 0 ? (
                  <SpecTable rows={specs} />
                ) : undefined
              }
              reviewsContent={
                <ReviewsListingPanel
                  source={{ kind: "product", productId: product.id }}
                  stateMode="local"
                  context="listing"
                  initialData={initialReviews}
                  emptyLabel="No reviews yet — be the first to review this product."
                />
              }
              customTabs={toCustomSectionTabs(p.customSections)}
            />
          )}
          renderBuyBar={() => (
            <Div id="digital-code-buy-bar">
              {renderPrimaryActions?.({
                productId: String(product.id),
                productSlug: String(p.slug ?? product.id),
                productTitle: title,
                productImage: images[0],
                price,
                currency,
                storeId: typeof p.storeId === "string" ? p.storeId : undefined,
                storeName: storeName ?? undefined,
                inStock: codesLeft > 0,
              })}
            </Div>
          )}
          renderRelated={() => (
            <Stack gap="xl">
              {/*
                The buyer's own order and review for THIS item. Self-gating:
                renders nothing until auth resolves, because SessionProvider
                mounts initialUser={null} on a static page, so `loading` starts
                true even for someone signed in — showing the empty state first
                would flash "no order" at a buyer who has one.
              */}
              <PurchaseReviewAffordance
                productId={String(product.id)}
                storeId={product.storeId ? String(product.storeId) : undefined}
              />
              <GroupedListingsCarousel groups={groups} />
              <RelatedItemsSection
                relatedItems={relatedItems}
                relatedByBrand={relatedByBrand}
                relatedByTags={relatedByTags}
                relatedByStore={relatedByStore}
                categoryLabel={categoryName || category || undefined}
                brandLabel={brand}
                storeLabel={storeName ?? undefined}
              />
            </Stack>
          )}
        />

        {/* Sticky CTA — registers into the layout-level BottomActions bar. */}
        <ListingBottomActions
          listingType="digital-code"
          anchorId="digital-code-buy-bar"
          price={price}
          currency={currency}
          unavailable={codesLeft <= 0}
        />
      </Container>
    </Main>
  );
}
