import Link from "next/link";
import type { FirestoreDocument, JsonValue } from "@mohasinac/appkit";
import { productRepository } from "../../../repositories";
import { listBidsByProduct } from "../../auctions/actions/bid-actions";
import { safeRead } from "../../../errors/safe-read";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
  p4: "p-[var(--appkit-space-4)]",
  p5: "p-[var(--appkit-space-5)]",
} as const;

const CLS_BREADCRUMB_LINK = "hover:text-primary-600 transition-colors";
const CLS_LIVE_BADGE = "inline-block rounded-full bg-warning-surface dark:bg-warning-surface px-[var(--appkit-space-2-5)] py-[var(--appkit-space-0-5)] text-warning dark:text-warning";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import { getSiteSettingsGlobal } from "../../admin/utils/getSiteSettingsGlobal";
import {
  isBuyNowAvailable,
  resolveMinBid,
  resolveMinBidIncrement,
  type BidIncrementTier,
} from "../../../_internal/shared/features/auctions/config";
import {
  Button,
  Container,
  CountdownDisplay,
  Div,
  Heading,
  Input,
  Main,
  Nav,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
  Ul,
  Li,
  Dl,
  Dt,
  Dd,
} from "../../../ui";
import { AuctionDetailView } from "../../products/components/AuctionDetailView";
import { ProductTabsShell } from "../../products/components/ProductTabsShell";
import { CustomSectionTabContent } from "../../products/components/CustomSectionTabContent";
import type { CustomSection } from "../../products/schemas/firestore";
import { AuctionBottomActions } from "./AuctionBottomActions";
import { RelatedProducts } from "../../products/components/RelatedProducts";
import { ProductGalleryClient } from "../../products/components/ProductGalleryClient";
import { ProductFeatureBadges } from "../../products/components/ProductFeatureBadges";
import { FeatureBadgeList } from "../../products/components/FeatureBadge";
import type { ProductFeatureDocument } from "../../products/schemas/product-features";
import { HistoryTracker } from "../../history/components/HistoryTracker";
import { ShareButton } from "../../products/components/ShareButton";
import { MarketplaceAuctionGrid } from "./MarketplaceAuctionGrid";
import type { MarketplaceAuctionCardData } from "./MarketplaceAuctionCard";
import { ReviewsListingPanel } from "../../reviews/components/ReviewsListingPanel";
import { PlaceBidModalButton } from "./PlaceBidFormClient";
import type {
  PlaceBidInput,
  BidActionEnvelope,
  BuyNowSuccess,
} from "./PlaceBidFormClient";
import { CollapsibleBidHistory } from "./CollapsibleBidHistory";
import { LiveBidPrice } from "./LiveBidPrice";
import { LiveMinIncrement } from "./LiveMinIncrement";
import { RelatedItemsSection } from "../../products/components/RelatedItemsSection";
import { computeRelatedItems } from "../../../_internal/server/features/products/data";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { getGroupsWithItemsForProduct } from "../../../_internal/server/features/grouped/data";
import { SublistingCarouselSection } from "../../products/components/SublistingCarouselSection";
import { isFinalSale } from "../../products/constants/final-sale";

export interface AuctionDetailPageViewProps {
  id: string;
  /**
   * Pre-fetched auction document from the page's server data layer.
   * When provided, the internal repository call is skipped — deduplicating
   * the fetch with generateMetadata() via React.cache().
   * When absent, falls back to fetching by slug/id (backward compat).
   */
  initialAuction?: import("../../products/schemas/firestore").ProductDocument | null;
  /**
   * Typed against the single `ActionResult` envelope — see the note on
   * `BidActionEnvelope`. `Promise<unknown>` here is what let a doubly-wrapped
   * result flow through to a client that read the wrong `ok`.
   */
  onPlaceBid?: (input: PlaceBidInput) => Promise<BidActionEnvelope<unknown>>;
  onBuyNow?: () => Promise<BidActionEnvelope<BuyNowSuccess>>;
  /** SSR-loaded productFeatures (platform + store-scope). See ProductDetailPageView for semantics. */
  productFeatures?: ProductFeatureDocument[];
}

function toDescriptionHtml(raw: JsonValue): string {
  if (!raw) return "";
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  return normalizeRichTextHtml(s);
}

interface AuctionInfoPanelProps {
  productId: string;
  title: string; currentBid: number; currency: string; bidCount: number;
  isEnded: boolean; endDate: Date | null; buyNowPrice: number | null;
  /** Resolved via isBuyNowAvailable() by the caller — never re-derived here. */
  buyNowAvailable: boolean;
  featured: boolean; freeShipping: boolean; condition: string | null;
  /** Resolved by the caller via isFinalSale() — absent on the doc means true. */
  finalSale: boolean;
  category: string | null; categoryName: string | null;
  brand: string | null; brandSlug: string | null;
  productFeatures?: import("../../products/schemas/product-features").ProductFeatureDocument[];
  features: string[]; descriptionHtml: string;
  safeSeller: string | null; storeHref: string | null;
}

function renderAuctionInfoPanel(props: AuctionInfoPanelProps) {
  const { productId, title, currentBid, currency, bidCount, isEnded, endDate, buyNowPrice, buyNowAvailable, featured, freeShipping, condition, finalSale, category, categoryName, brand, brandSlug, productFeatures, features, descriptionHtml, safeSeller, storeHref } = props;
  return (
    <Stack gap="md">
      <Div>
        <Row gap="xs" wrap className="mb-2">
          <Span size="xs" weight="semibold" className={CLS_LIVE_BADGE}>🏷️ Live Auction</Span>
          {isEnded ? (
            <Span color="error" surface="danger-surface" size="xs" weight="medium" className="inline-block" padding="pill-sm" rounded="full">Ended</Span>
          ) : (
            <Span color="success" surface="success-surface" size="xs" weight="medium" className="inline-block" padding="pill-sm" rounded="full">Active</Span>
          )}
        </Row>
        <Heading level={1} className="leading-snug" smSize="2xl" color="primary" size="xl" weight="bold">{title}</Heading>
      </Div>
      <Div>
        <Text className="mb-0.5" color="muted" size="xs">Current bid</Text>
        <LiveBidPrice
          productId={productId}
          currentBid={currentBid}
          bidCount={bidCount}
          currency={currency}
          isEnded={isEnded}
          priceSize="2xl"
          badgeSize="sm"
        />
        {endDate && !isEnded && (
          <Text className="mt-1.5" color="muted" size="sm">
            Ends in <Span weight="medium" color="muted"><CountdownDisplay targetDate={endDate} format="auto" expiredLabel="Ended" /></Span>
          </Text>
        )}
        {endDate && <Text className="mt-0.5" color="faint" size="xs">{isEnded ? "Ended" : "Ends"} {endDate.toLocaleString()}</Text>}
      </Div>
      {/* Gated on the SAME predicate as the button below. It used to be a
          two-condition check while the button used three, so the panel
          advertised "Buy Now: ₹5,999" on auctions that offered no Buy Now
          button at all — which is what "the buyout button is disabled" was. */}
      {buyNowAvailable && buyNowPrice !== null && (
        <Row align="center" gap="sm" className="border border-[var(--appkit-color-primary-200)] dark:border-[var(--appkit-color-primary-800)] bg-primary-50 dark:bg-primary-900/20" padding="inlineSm" rounded="lg">
          <Span size="xs" color="muted">Buy Now:</Span>
          <Span size="base" weight="bold" className="text-primary-700 dark:text-primary-300">{formatCurrency(buyNowPrice, currency)}</Span>
          {/* This chip stated a price with no control anywhere near it, under a
              CTA labelled "Place a bid" — which is most of why Buy Now read as
              decorative. The real button lives inside the bid modal (it needs
              the live SSE price to know whether the buyout is still the better
              deal), so say where it is rather than duplicating it here. */}
          <Span size="xs" color="faint">— in “Place a bid”</Span>
        </Row>
      )}
      <ProductFeatureBadges featured={featured} freeShipping={freeShipping} condition={condition ?? undefined} finalSale={finalSale} labels={{ featured: "Featured", fasterDelivery: "Faster Delivery", ratedSeller: "Rated Seller", condition: "Condition", conditionNew: "New", conditionUsed: "Used", conditionBroken: "For Parts", conditionRefurbished: "Refurbished", returnable: "Returnable", finalSale: "Final Sale", freeShipping: "Free Shipping", codAvailable: "Cash on Delivery", emiAvailable: "EMI Available", wishlistCount: (n) => `${n} wishlisted`, categoryProductCount: (n, cat) => `${n} in ${cat}` }} />
      {(categoryName || category || brand) && (
        <Row gap="sm" wrap>
          {category && <Link href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))} className="inline-flex items-center rounded-full border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-2-5)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] font-medium text-[var(--appkit-color-text-muted)] transition-colors hover:border-primary-300 hover:bg-primary-surface hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:text-primary-400">{categoryName || category}</Link>}
          {!category && categoryName && <Span layout="inline-flex" size="xs" weight="medium" border="subtle" rounded="full" padding="pill-sm-tall" surface="muted" color="muted">{categoryName}</Span>}
          {brand && brandSlug && <Link href={String(ROUTES.PUBLIC.BRAND_DETAIL(brandSlug))} className="inline-flex items-center rounded-full border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-2-5)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] font-medium text-[var(--appkit-color-text-muted)] transition-colors hover:border-primary-300 hover:bg-primary-surface hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:text-primary-400">{brand}</Link>}
          {brand && !brandSlug && <Span layout="inline-flex" size="xs" weight="medium" border="subtle" rounded="full" padding="pill-sm-tall" surface="muted" color="muted">{brand}</Span>}
        </Row>
      )}
      {productFeatures && features.length > 0 && <FeatureBadgeList productFeatureIds={features} features={productFeatures} />}
      {!productFeatures && features.length > 0 && (
        <Div border="subtle" surface="muted" padding="inline" rounded="xl">
          <Text className="mb-2 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">About this item</Text>
          <Ul spacing="comfortable" size="sm" color="primary">
            {features.map((f, i) => <Li key={i} layout="flex-start" gap="2"><Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>{f}</Li>)}
          </Ul>
        </Div>
      )}
      {descriptionHtml && <RichText html={descriptionHtml} proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0" className="text-[length:var(--appkit-text-sm)] leading-relaxed text-[var(--appkit-color-text-muted)] line-clamp-4" />}
      {safeSeller && (
        <Div className={`${__P.p3}`} border="subtle" rounded="xl" surface="muted">
          <Row justify="between" align="center">
            <Div>
              <Text className="text-[10px] tracking-wide mb-0.5" color="faint" transform="uppercase">Listed by</Text>
              <Text size="sm" weight="semibold" color="primary">{safeSeller}</Text>
            </Div>
            {storeHref && <Link href={storeHref} className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors">Visit Store →</Link>}
          </Row>
        </Div>
      )}
    </Stack>
  );
}

/**
 * Store reviews for the auction's seller.
 *
 * Was a bespoke `slice(0, 10)` block over `listReviewsBySeller()` — which concatenates
 * per-product batches, so the "latest 10" it showed were in product order, not date
 * order, and reviews 11+ were unreachable. `ReviewsListingPanel` pages the real
 * store-reviews endpoint instead.
 */
function renderAuctionStoreReviews(storeSlug: string | undefined) {
  if (!storeSlug) return null;
  return (
    <Section className="mt-10">
      <Heading level={2} className="mb-2" color="primary" size="xl" weight="semibold">Store Reviews</Heading>
      <ReviewsListingPanel
        source={{ kind: "store", storeSlug }}
        stateMode="local"
        context="store"
        emptyLabel="This store has no reviews yet."
      />
    </Section>
  );
}

/**
 * Related auction docs → card data, at module scope rather than inline in the
 * view.
 *
 * This is a pure doc→card mapper with no component state, and it is the exact
 * spot Root Cause #48 keeps recurring: a card carries nine correct fields and
 * routes or renders wrong because of the tenth. Naming it makes the field list
 * reviewable on its own instead of buried 400 lines into a render prop.
 */
function toRelatedAuctionCards(
  relatedDocs: FirestoreDocument[],
  // The current auction's own id, so it is excluded from its own related list.
  // Typed as the document id it is compared against, not `unknown` — a bare
  // `unknown` here silently permits comparing against anything.
  currentId: FirestoreDocument["id"],
  now: Date,
): MarketplaceAuctionCardData[] {
  return relatedDocs
    .filter((r) => {
      if (r.id === currentId || r.listingType !== "auction") return false;
      const s = r.status as string | undefined;
      if (s && ["archived", "in_review", "draft"].includes(s)) return false;
      if (r.isSold === true) return false;
      const end = r.auctionEndDate;
      if (!end) return true;
      const endDate = typeof (end as { toDate?: () => Date }).toDate === "function"
        ? (end as unknown as { toDate: () => Date }).toDate()
        : end instanceof Date ? end : new Date(String(end));
      return endDate > now;
    })
    .slice(0, 4)
    .map((r) => ({
      id: String(r.id ?? ""),
      title: String(r.title ?? r.name ?? "Auction Item"),
      price: typeof r.price === "number" ? r.price : 0,
      currency: typeof r.currency === "string" ? r.currency : undefined,
      mainImage: Array.isArray(r.images)
        ? (r.images as string[])[0]
        : typeof r.mainImage === "string"
          ? r.mainImage
          : undefined,
      listingType: "auction" as const,
      auctionEndDate: r.auctionEndDate as Date | undefined,
      startingBid: typeof r.startingBid === "number" ? r.startingBid : undefined,
      currentBid: typeof r.currentBid === "number" ? r.currentBid : undefined,
      bidCount: typeof r.bidCount === "number" ? r.bidCount : undefined,
      slug: typeof r.slug === "string" ? r.slug : undefined,
      // The card renders "by <seller>"; dropping these is how a related-auction
      // card ends up the only one on the page with no seller on it, from data
      // that was on the doc all along.
      storeId: typeof r.storeId === "string" ? r.storeId : undefined,
      storeName: typeof r.storeName === "string" ? r.storeName : undefined,
    }));
}

export async function AuctionDetailPageView({ id, initialAuction, onPlaceBid, onBuyNow, productFeatures }: AuctionDetailPageViewProps) {
  // The auction IS this page's subject. A read failure must surface rather than
  // become the same `undefined` a genuinely missing slug produces — the
  // "Auction Not Found" branch below still handles that real case.
  const product = initialAuction !== undefined
    ? (initialAuction ?? undefined)
    : await productRepository.findByIdOrSlug(id);
  const bidsResult = product
    ? await safeRead<Awaited<ReturnType<typeof listBidsByProduct>> | null>(
        () => listBidsByProduct(String(product.id), { pageSize: 5 }),
        { route: "/auctions/[slug]", key: "auction.bidHistory", fallback: null },
      )
    : null;

  const storeId = (product as unknown as FirestoreDocument)?.storeId as string | undefined;

  if (!product) {
    return (
      <Main>
        <Section padding="y-5xl" >
          <Container size="md">
            <Stack align="start" gap="md" className="text-left">
              <Heading level={1} size="2xl" weight="semibold" color="primary">
                Auction Not Found
              </Heading>
              <Text color="muted">
                This auction may have ended or the link is incorrect.
              </Text>
              <Link href={String(ROUTES.PUBLIC.AUCTIONS)} className="text-[length:var(--appkit-text-sm)] font-medium text-primary-600 hover:underline">
                Browse Auctions
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as FirestoreDocument;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();

  const title = String(p.title ?? p.name ?? "Auction Item");
  const currentBid =
    typeof p.currentBid === "number"
      ? p.currentBid
      : typeof p.startingBid === "number"
        ? p.startingBid
        : typeof p.price === "number"
          ? p.price
          : 0;
  const startingBid =
    typeof p.startingBid === "number"
      ? p.startingBid
      : typeof p.price === "number"
        ? p.price
        : 0;
  const minBidIncrementOverride =
    typeof p.minBidIncrement === "number" ? p.minBidIncrement : undefined;

  const images: string[] = Array.isArray(p.images)
    ? (p.images as string[])
    : typeof p.mainImage === "string"
      ? [p.mainImage]
      : [];

  const productVideo = p.video as { url: string; thumbnailUrl?: string } | undefined;

  const endDate = p.auctionEndDate ? new Date(p.auctionEndDate as string) : null;
  const isEnded = endDate ? endDate < new Date() : false;
  const bidCount = typeof p.bidCount === "number" ? p.bidCount : 0;
  const buyNowPrice =
    typeof p.buyNowPrice === "number" ? p.buyNowPrice : null;
  const buyNowAvailable = isBuyNowAvailable({
    buyNowPrice,
    currentBid,
    isEnded,
    isSold: p.isSold === true,
  });

  const condition = typeof p.condition === "string" ? p.condition : null;
  const featured = p.featured === true;
  const shippingPaidBy = p.shippingPaidBy as "seller" | "buyer" | undefined;
  const freeShipping = shippingPaidBy === "seller";
  const storeName = typeof p.storeName === "string" ? p.storeName : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug = (typeof p.storeSlug === "string" ? p.storeSlug : null) || (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug
    ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))
    : null;
  const category = Array.isArray(p.categorySlugs) && p.categorySlugs.length > 0 ? p.categorySlugs[0] : (typeof p.category === "string" ? (p.category as string) : null);
  const categoryName = Array.isArray(p.categoryNames) && p.categoryNames.length > 0 ? p.categoryNames[0] : (typeof p.categoryName === "string" ? (p.categoryName as string) : null);
  const brand = typeof p.brand === "string" ? (p.brand as string) : null;
  const brandSlug = typeof p.brandSlug === "string" ? (p.brandSlug as string) : null;
  const tags: string[] = Array.isArray(p.tags) ? (p.tags as string[]) : [];
  const features: string[] = Array.isArray(p.features) ? (p.features as string[]) : [];
  const specs: { name: string; value: string; unit?: string }[] = Array.isArray(p.specifications)
    ? (p.specifications as { name: string; value: string; unit?: string }[])
    : [];
  const customSections: CustomSection[] = Array.isArray(p.customSections)
    ? (p.customSections as CustomSection[])
    : [];
  const descriptionHtml = toDescriptionHtml(p.description as JsonValue);

  const sublistingCategoryId = typeof p.sublistingCategoryId === "string" ? p.sublistingCategoryId : null;

  const relatedDocs = (await safeRead(
    () => productRepository.findByCategory(String(p.category ?? "")),
    {
      route: "/auctions/[slug]",
      key: "products.findByCategory",
      fallback: [] as unknown[],
    },
  )) as FirestoreDocument[];

  const [{ relatedItems, relatedByBrand, relatedByTags, relatedByStore }, groups, siteSettings] = await Promise.all([
    computeRelatedItems(product),
    getGroupsWithItemsForProduct(product.id),
    getSiteSettingsGlobal(),
  ]);
  const bidIncrementTiers: BidIncrementTier[] = siteSettings.auctionConfig?.bidIncrementTiers ?? [];
  const initialMinBidIncrement = resolveMinBidIncrement(currentBid, bidIncrementTiers, minBidIncrementOverride);
  // Mirrors placeBid's own hasBids — with no bids the starting bid is itself
  // the minimum, so this preview must not advertise startingBid + increment.
  const initialHasBids = bidCount > 0 || currentBid > startingBid;
  const initialMinBid = resolveMinBid(currentBid, bidIncrementTiers, minBidIncrementOverride, {
    hasBids: initialHasBids,
  });

  return (
    <Main>
      <HistoryTracker
        productId={String(p.id ?? p.slug ?? "")}
        productType="auction"
        snapshot={{
          title: typeof p.title === "string" ? p.title : undefined,
          thumb:
            typeof p.mainImage === "string"
              ? p.mainImage
              : Array.isArray(p.images) && typeof p.images[0] === "string"
                ? p.images[0]
                : undefined,
          price: typeof p.price === "number" ? p.price : undefined,
          storeId: typeof p.storeId === "string" ? p.storeId : undefined,
          storeName: typeof p.storeName === "string" ? p.storeName : undefined,
        }}
      />
      <Container size="xl" padding="y-lg">
        {/* Breadcrumb + share */}
        <Row className="mb-4" align="center" justify="between" gap="sm" wrap>
          <Nav aria-label="Breadcrumb" layout="flex-wrap" gap="2xs" textSize="xs" color="muted">
            <Link href={String(ROUTES.HOME)} className={CLS_BREADCRUMB_LINK}>Home</Link>
            <Span aria-hidden>/</Span>
            <Link href={String(ROUTES.PUBLIC.AUCTIONS)} className={CLS_BREADCRUMB_LINK}>Auctions</Link>
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

        <AuctionDetailView
          renderGallery={() => (
            <ProductGalleryClient images={images} video={productVideo} productName={title} />
          )}
          renderInfo={() => renderAuctionInfoPanel({ productId: String(product.id), title, currentBid, currency, bidCount, isEnded, endDate, buyNowPrice, buyNowAvailable, featured, freeShipping, condition, finalSale: isFinalSale(p), category, categoryName, brand, brandSlug, productFeatures, features, descriptionHtml, safeSeller, storeHref })}
          renderBidForm={() =>
            onPlaceBid ? (
              <Stack id="auction-bid-form" gap="3">
                {/* Compact summary card — modal owns the form */}
                <Stack className={`${__P.p5}`} border="subtle" gap="3" rounded="xl" surface="muted">
                  <Row justify="between" align="baseline">
                    <LiveBidPrice
                      productId={String(product.id)}
                      currentBid={currentBid}
                      bidCount={bidCount}
                      currency={currency}
                      isEnded={isEnded}
                      priceSize="xl"
                      badgeSize="xs"
                    />
                    {!isEnded && (
                      <LiveMinIncrement
                        productId={String(product.id)}
                        currentBid={currentBid}
                        bidCount={bidCount}
                        currency={currency}
                        isEnded={isEnded}
                        tiers={bidIncrementTiers}
                        minBidIncrementOverride={minBidIncrementOverride}
                      />
                    )}
                  </Row>
                  {!isEnded && endDate && (
                    <Text align="center" size="xs" color="muted">
                      Ends in <CountdownDisplay targetDate={endDate} format="auto" expiredLabel="Ended" />
                    </Text>
                  )}
                  <PlaceBidModalButton
                    productId={String(product.id)}
                    currentBid={currentBid}
                    startingBid={startingBid}
                    tiers={bidIncrementTiers}
                    minBidIncrementOverride={minBidIncrementOverride}
                    currency={currency}
                    isEnded={isEnded}
                    auctionEndDate={endDate}
                    buyNowPrice={buyNowPrice}
                    bidCount={bidCount}
                    tags={tags}
                    onPlaceBid={onPlaceBid}
                    onBuyNow={onBuyNow}
                    triggerClassName="w-full"
                  />
                </Stack>
              </Stack>
            ) : (
              /* Read-only bid panel — shown when no bid action is wired (preview/demo) */
              <Stack className={`${__P.p5}`} border="subtle" gap="md" rounded="xl" surface="muted">
                <Stack gap="xs">
                  <Text size="xs" color="muted">
                    Starting bid: {formatCurrency(startingBid, currency)}
                    {!isEnded && <> · min increment {formatCurrency(initialMinBidIncrement, currency)}</>}
                  </Text>
                </Stack>
                <Stack gap="sm">
                  <Input
                    type="number"
                    placeholder={`At least ${formatCurrency(initialMinBid, currency)}`}
                    min={initialMinBid}
                    aria-label="Your bid amount"
                    disabled={isEnded}
                  />
                  {!isEnded && endDate && (
                    <Text align="center" size="xs" color="muted">
                      Ends in <CountdownDisplay targetDate={endDate} format="auto" expiredLabel="Ended" />
                    </Text>
                  )}
                  <Button variant="primary" size="md" className="w-full" disabled={isEnded}>
                    {isEnded ? "Auction Ended" : "Place Bid"}
                  </Button>
                  {/* A permanently-`disabled` Buy Now button used to sit here.
                      This whole branch is the no-action preview (the live route
                      always passes onPlaceBid + onBuyNow), so it rendered a CTA
                      that could never be clicked and explained nothing — the
                      dead-affordance shape Root Cause #56 is about. The price
                      is stated instead. */}
                  {buyNowAvailable && buyNowPrice !== null && (
                    <Text align="center" size="xs" color="muted">
                      Buy Now available at {formatCurrency(buyNowPrice, currency)}
                    </Text>
                  )}
                </Stack>
                {tags.length > 0 && (
                  <Div border="default" className="border-t" padding="t-md">
                    <Row wrap gap="xs">
                      {tags.map((tag) => (
                        <Span key={tag} size="xs" rounded="full" padding="pill-sm-tall" surface="subtle" color="muted">
                          {tag}
                        </Span>
                      ))}
                    </Row>
                  </Div>
                )}
              </Stack>
            )
          }
          renderMobileBidForm={() =>
            !isEnded && onPlaceBid ? (
              <Stack className={`lg:hidden ${__P.p4}`} border="subtle" gap="3" rounded="xl" surface="muted">
                <LiveBidPrice
                  productId={String(product.id)}
                  currentBid={currentBid}
                  bidCount={bidCount}
                  currency={currency}
                  isEnded={isEnded}
                  priceSize="base"
                  badgeSize="xs"
                />
                {endDate && (
                  <Text align="center" size="xs" color="muted">
                    Ends in <CountdownDisplay targetDate={endDate} format="auto" expiredLabel="Ended" />
                  </Text>
                )}
                <PlaceBidModalButton
                  productId={String(product.id)}
                  currentBid={currentBid}
                  startingBid={startingBid}
                  tiers={bidIncrementTiers}
                  minBidIncrementOverride={minBidIncrementOverride}
                  currency={currency}
                  isEnded={isEnded}
                  auctionEndDate={endDate}
                  buyNowPrice={buyNowPrice}
                  bidCount={bidCount}
                  tags={tags}
                  onPlaceBid={onPlaceBid}
                  onBuyNow={onBuyNow}
                  triggerClassName="w-full"
                />
              </Stack>
            ) : !isEnded ? (
              <Div className={`${__P.p4} lg:hidden`} border="subtle" rounded="xl" surface="muted">
                <Row align="center" gap="sm" className="mb-3">
                  <Span size="base" weight="bold" className="text-primary-600 dark:text-primary-400">
                    {formatCurrency(currentBid, currency)}
                  </Span>
                  <Span size="xs" color="muted">{bidCount} bids</Span>
                </Row>
                {endDate && (
                  <Text align="center" className="mb-3" size="xs" color="muted">
                    Ends in <CountdownDisplay targetDate={endDate} format="auto" expiredLabel="Ended" />
                  </Text>
                )}
                <Button variant="primary" size="md" className="w-full">
                  Place Bid
                </Button>
              </Div>
            ) : null
          }
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
                  <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden">
                    {specs.map((s, i) => (
                      <Row gap="md" oddEven="zebra"
                        key={i}
                        surface="default" padding="inline"
                      >
                        <Dt className="w-36 flex-shrink-0" color="primary" weight="medium">
                          {s.name}
                        </Dt>
                        <Dd className="flex-1" color="muted">
                          {s.value}{s.unit ? ` ${s.unit}` : ""}
                        </Dd>
                      </Row>
                    ))}
                  </Dl>
                ) : undefined
              }
              customTabs={customSections.map((s) => ({
                id: s.id,
                label: s.title,
                content: <CustomSectionTabContent section={s} />,
              }))}
            />
          )}
          renderBidHistory={() => {
            if (!bidsResult) return null;
            return (
              <CollapsibleBidHistory
                productId={String(product.id)}
                initialData={bidsResult}
                currency={currency}
              />
            );
          }}
          renderRelated={() => {
            const related = toRelatedAuctionCards(relatedDocs, product.id, new Date());
            return (
              <Stack gap="xl">
                {related.length > 0 && (
                  <RelatedProducts
                    labels={{ title: "Similar Auctions" }}
                    renderGrid={() => (
                      <MarketplaceAuctionGrid
                        auctions={related}
                      />
                    )}
                  />
                )}
                <GroupedListingsCarousel groups={groups} />
                <RelatedItemsSection
                  relatedItems={relatedItems}
                  relatedByBrand={relatedByBrand}
                  relatedByTags={relatedByTags}
                  relatedByStore={relatedByStore}
                  categoryLabel={categoryName || category || undefined}
                  brandLabel={brand || undefined}
                  storeLabel={storeName || undefined}
                />
              </Stack>
            );
          }}
        />

        {/* Store reviews section */}
        {renderAuctionStoreReviews(storeId)}

        {/* Mobile actions registered via useBottomActions(). It owns its own
            bid modal — it used to scroll to `#auction-bid-form`, which lives
            inside the `hidden lg:block` desktop panel and is therefore
            unreachable on the very viewport this bar serves. */}
        {onPlaceBid && (
          <AuctionBottomActions
            productId={String(product.id)}
            currentBid={currentBid}
            startingBid={startingBid}
            tiers={bidIncrementTiers}
            minBidIncrementOverride={minBidIncrementOverride}
            currency={currency}
            isEnded={isEnded}
            auctionEndDate={endDate}
            buyNowPrice={buyNowPrice}
            bidCount={bidCount}
            tags={tags}
            onPlaceBid={onPlaceBid}
            onBuyNow={onBuyNow}
          />
        )}
      </Container>
    </Main>
  );
}
