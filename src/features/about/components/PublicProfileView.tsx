import Link from "next/link";
import { getPublicUserProfile, getProfileStoreProducts, getSellerReviews, getReviewsAuthoredBy } from "../../auth/actions/profile-actions";
import { storeRepository } from "../../stores/repository/store.repository";
import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { FLEX_CENTER } from "../../../_internal/shared/styles/themed";
import { Anchor, Div, Grid, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ProductCard } from "../../products/components/ProductGrid";
import { ReviewCard } from "../../reviews/components/ReviewsList";
import type { ProductItem } from "../../products/types";
import type { ProductDocument } from "../../products/schemas/firestore";
import { isAuctionListing, isPreOrderListing } from "../../products/utils/listing-type";
import { isAdminUser, isSellerUser } from "../../auth/role-predicates";
import { User, Star, ShoppingBag, Package, Trophy, Globe, MapPin, ExternalLink } from "lucide-react";

const __P = {
  p4: "p-4",
  p6: "p-6",
} as const;

const CLS_EMPTY_ICON = "w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600 ";

const __O = {
  hidden: "overflow-hidden",
} as const;


export interface PublicProfileViewProps {
  userId: string;
}

function toProductItem(p: ProductDocument): ProductItem {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    price: p.price,
    currency: p.currency,
    mainImage: p.mainImage,
    images: p.images,
    status: p.status,
    condition: p.condition as ProductItem["condition"],
    listingType: p.listingType,
    isOnSale: p.isOnSale,
    isSold: p.isSold,
    isPromoted: p.isPromoted,
    featured: p.featured,
    categorySlugs: p.categorySlugs ?? (p.category ? [p.category] : []),
    categoryNames: p.categoryNames ?? (p.categoryName ? [p.categoryName] : []),
    brand: p.brand,
    brandSlug: p.brandSlug,
    storeId: p.storeId,
    storeName: p.storeName,
    currentBid: p.currentBid,
    availableQuantity: p.availableQuantity,
    tags: p.tags,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : undefined,
  };
}

function getProductHref(p: ProductDocument): string {
  if (isAuctionListing(p)) return String(ROUTES.PUBLIC.AUCTION_DETAIL(p.id));
  if (isPreOrderListing(p)) return String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id));
  return String(ROUTES.PUBLIC.PRODUCT_DETAIL(p.id));
}

export async function PublicProfileView({
  userId,
}: PublicProfileViewProps) {
  const page = { container: PAGE_CONTAINER };
  const flex = { center: FLEX_CENTER };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("publicProfile");

  const profile = await getPublicUserProfile(userId).catch(() => null);
  const storeId = profile?.storeSlug ?? null;

  const [products, reviewsReceived, store, reviewsAuthored] = await Promise.all([
    storeId ? getProfileStoreProducts(storeId).catch(() => []) : Promise.resolve([]),
    storeId ? getSellerReviews(storeId).catch(() => []) : Promise.resolve([]),
    storeId ? storeRepository.findById(storeId).catch(() => null) : Promise.resolve(null),
    getReviewsAuthoredBy(userId).catch(() => []),
  ]);

  const isSeller = isSellerUser(profile) || isAdminUser(profile);
  // For sellers: lead with store identity (name + logo). For buyers: user identity.
  const displayName = isSeller && store?.storeName
    ? store.storeName
    : (profile?.displayName ?? t("profileTitle"));
  const photoURL = isSeller && store?.storeLogoURL
    ? store.storeLogoURL
    : (profile?.photoURL ?? null);
  const memberSince = profile?.createdAt
    ? `Member since ${profile.createdAt.toLocaleDateString("en", { month: "long", year: "numeric" })}`
    : t("memberSince");

  const pub = profile?.publicProfile;
  const stats = profile?.stats;

  const listingCount = products.length;
  const reviewCount = reviewsAuthored.length + reviewsReceived.length;
  const itemsSold = stats?.itemsSold ?? 0;
  const auctionsWon = stats?.auctionsWon ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;

  const storeSlug = profile?.storeSlug;
  const storeName = store?.storeName ?? pub?.storeName ?? displayName;
  const storeDescription = store?.storeDescription ?? pub?.storeDescription;

  const profileHeroCtx = { displayName, photoURL, memberSince, isSeller, storeSlug, flex, page };
  const statItems = buildProfileStatItems(t, { listingCount, reviewCount, itemsSold, auctionsWon, totalOrders, isSeller });

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {renderProfileHero(t, profileHeroCtx)}
      {/* audit-variant-ok: responsive padding override md:py-12 alongside y-2xl base */}
      <Stack gap="2xl" className={`${page.container.md} md:py-12`} padding="y-2xl">
        {renderProfileStatsRow(flex, statItems)}
        {renderProfileBioSection(pub)}
        {renderStoreDescriptionSection(isSeller, storeSlug ?? null, storeDescription ?? null, storeName, t)}
        {renderProfileListingsSection(t, products, storeSlug ?? null)}
        {renderAuthoredReviewsSection(t, reviewsAuthored, displayName)}
        {isSeller && storeSlug && renderProfileReviewsSection(t, reviewsReceived, storeSlug)}
        <Row justify="center" padding="t-xs">
          <Link href={String(ROUTES.HOME)} className="text-sm text-zinc-400 dark:text-zinc-400 hover:text-neutral-600 dark:hover:text-zinc-300">
            ← {t("backHome")}
          </Link>
        </Row>
      </Stack>
    </Div>
  );
}

type ProfileT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
type ProfileFlex = { center: string };
type ProfilePage = { container: typeof PAGE_CONTAINER };
 
type PubProfile = any;
 
type ProfileProduct = any;
 
type ProfileReview = any;

function buildProfileStatItems(t: ProfileT, ctx: { listingCount: number; reviewCount: number; itemsSold: number; auctionsWon: number; totalOrders: number; isSeller: boolean }) {
  const { listingCount, reviewCount, itemsSold, auctionsWon, totalOrders, isSeller } = ctx;
  return [
    { icon: ShoppingBag, label: t("statListings"), value: String(listingCount) },
    { icon: Star, label: t("statReviews"), value: String(reviewCount) },
    ...(isSeller
      ? [
          { icon: Package, label: t("statSold"), value: String(itemsSold) },
          { icon: Trophy, label: t("statAuctions"), value: String(auctionsWon) },
        ]
      : [
          { icon: Trophy, label: t("statAuctions"), value: String(auctionsWon) },
          { icon: Package, label: t("statOrders"), value: String(totalOrders) },
        ]),
  ];
}

function renderProfileHero(t: ProfileT, ctx: { displayName: string; photoURL: string | null; memberSince: string; isSeller: boolean; storeSlug: string | null | undefined; flex: ProfileFlex; page: ProfilePage }) {
  const { displayName, photoURL, memberSince, isSeller, storeSlug, flex, page } = ctx;
  return (
    <Section color="inverse" tone="accent-banner" className="md:py-14" padding="y-2xl"> {/* audit-variant-ok: responsive padding override md:py-14 alongside y-2xl base */}
      <Div className={`${page.container.md}`}>
        {/* audit-variant-ok: responsive layout override — flex-wrap sm:flex-row sm:items-end has no single variant prop */}
        <Stack direction="sm-row" className="flex-wrap sm:items-end" align="center" gap="md">
          <Row align="center" justify="center" className={`w-20 h-20 flex-shrink-0 ${__O.hidden}`} surface="default" rounded="full">
            {photoURL ? <MediaImage src={photoURL} alt={displayName} size="avatar" fallback="👤" /> : <User className="w-10 h-10 text-white/60" />}
          </Row>
          <Stack gap="xs" className="text-center sm:text-left">
            {/* audit-variant-ok: sm:justify-start is a responsive override; Row.justify only supports single value */}
            {/* audit-inline-style-ok: sm:justify-start is a responsive override; Row.justify only supports single value */}
            <Row className="sm:justify-start" justify="center" gap="xs" wrap>
              <Heading color="inverse" level={1} variant="none" className="mb-0">{displayName}</Heading>
              {/* audit-variant-ok: translucent-white badge over inverse hero background — no white overlay surface variant exists */}
              {isSeller && <Span color="inverse" size="xs" weight="semibold" className="bg-white/20" padding="pill-sm" rounded="full">{t("roleSeller")}</Span>}
            </Row>
            <Text color="inverse" variant="none" size="sm">{memberSince}</Text>
          </Stack>
          {isSeller && storeSlug && (
            <Div className="sm:ml-auto">
              <Link href={String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))} className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                {t("visitStore")}
              </Link>
            </Div>
          )}
        </Stack>
      </Div>
    </Section>
  );
}

 
function renderProfileStatsRow(flex: ProfileFlex, statItems: { icon: any; label: string; value: string }[]) {
  return (
    <Grid gap="md" className="grid-cols-2 sm:grid-cols-4">
      {statItems.map(({ icon: Icon, label, value }) => (
        <Div key={label} rounded="xl" className={`${__P.p4} text-center`} border="default" surface="muted">
          <Row centered className={`${flex.center} mb-1`}><Icon className="w-4 h-4 text-neutral-400" /></Row>
          <Text size="lg" weight="bold">{value}</Text>
          <Text variant="secondary" size="xs">{label}</Text>
        </Div>
      ))}
    </Grid>
  );
}

function renderProfileBioSection(pub: PubProfile) {
  if (!pub?.bio && !pub?.location && !pub?.website) return null;
  return (
    <Section>
      <Stack gap="sm" className={`${__P.p6}`} border="default" surface="muted" rounded="2xl">
        {pub.bio && <Text className="leading-relaxed text-neutral-700" size="sm">{pub.bio}</Text>}
        <Row gap="md" wrap>
          {pub.location && <Span layout="flex" gap="xs" size="sm" className="text-neutral-500 dark:text-neutral-400"><MapPin className="w-4 h-4" />{pub.location}</Span>}
          {/* audit-variant-ok: Anchor lacks layout variant; flex + gap needed to inline icon with text */}
          {pub.website && <Anchor href={pub.website} className="flex items-center gap-1.5"><Globe className="w-4 h-4" /><Span size="sm">{pub.website.replace(/^https?:\/\//, "")}</Span></Anchor>}
        </Row>
      </Stack>
    </Section>
  );
}

function renderStoreDescriptionSection(isSeller: boolean, storeSlug: string | null, storeDescription: string | null, storeName: string, t: ProfileT) {
  if (!isSeller || !storeSlug || !storeDescription) return null;
  return (
    <Section>
      <Div rounded="2xl" className={`${__P.p6}`} border="default" surface="subtle">
        <Heading level={3} className="mb-2">{storeName}</Heading>
        <Text variant="secondary" className="leading-relaxed" size="sm">{storeDescription}</Text>
        <Link href={String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{t("visitStore")} →</Link>
      </Div>
    </Section>
  );
}

function renderProfileListingsSection(t: ProfileT, products: ProfileProduct[], storeSlug: string | null) {
  return (
    <Section>
      <Heading level={2} className="mb-4">{t("listingsTitle")}</Heading>
      {products.length === 0 ? (
        <Div rounded="2xl" className={`p-12 text-center`} border="default" surface="subtle"> {/* audit-variant-ok: empty-state Div needs p-12 (no PADDING_MAP equivalent at this scale) */}
          <ShoppingBag className={CLS_EMPTY_ICON} />
          <Text variant="secondary" size="sm">{t("noListings")}</Text>
        </Div>
      ) : (
        <Grid gap="md" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {products.slice(0, 8).map((p: ProfileProduct) => <ProductCard key={p.id} product={toProductItem(p)} href={getProductHref(p)} />)}
        </Grid>
      )}
      {products.length > 8 && storeSlug && (
        <Div className="mt-4 text-center">
          <Link href={String(ROUTES.PUBLIC.STORE_PRODUCTS(storeSlug))} className="text-sm font-medium text-primary hover:underline">{t("viewAllListings", { count: products.length })}</Link>
        </Div>
      )}
    </Section>
  );
}

function renderProfileReviewsSection(t: ProfileT, reviews: ProfileReview[], storeSlug: string | null) {
  return (
    <Section>
      <Heading level={2} className="mb-4">{t("reviewsReceivedTitle")}</Heading>
      {reviews.length === 0 ? (
        <Div rounded="2xl" className={`p-12 text-center`} border="default" surface="subtle"> {/* audit-variant-ok: empty-state Div needs p-12 (no PADDING_MAP equivalent at this scale) */}
          <Star className={CLS_EMPTY_ICON} />
          <Text variant="secondary" size="sm">{t("noReviewsReceived")}</Text>
        </Div>
      ) : (
        <Grid gap="md" className="grid-cols-1 sm:grid-cols-2">
          {reviews.slice(0, 6).map((review: ProfileReview) => <ReviewCard key={review.id} review={review} />)}
        </Grid>
      )}
      {reviews.length > 6 && storeSlug && (
        <Div className="mt-4 text-center">
          <Link href={String(ROUTES.PUBLIC.STORE_REVIEWS(storeSlug))} className="text-sm font-medium text-primary hover:underline">{t("viewAllReviews", { count: reviews.length })}</Link>
        </Div>
      )}
    </Section>
  );
}

function renderAuthoredReviewsSection(t: ProfileT, reviews: ProfileReview[], displayName: string) {
  return (
    <Section>
      <Heading level={2} className="mb-4">{t("reviewsAuthoredTitle", { name: displayName })}</Heading>
      {reviews.length === 0 ? (
        <Div rounded="2xl" className={`p-12 text-center`} border="default" surface="subtle"> {/* audit-variant-ok: empty-state Div needs p-12 (no PADDING_MAP equivalent at this scale) */}
          <Star className={CLS_EMPTY_ICON} />
          <Text variant="secondary" size="sm">{t("noReviewsAuthored", { name: displayName })}</Text>
        </Div>
      ) : (
        <Grid gap="md" className="grid-cols-1 sm:grid-cols-2">
          {reviews.slice(0, 6).map((review: ProfileReview) => <ReviewCard key={review.id} review={review} />)}
        </Grid>
      )}
    </Section>
  );
}
