import Link from "next/link";
import { getPublicUserProfile, getProfileStoreProducts, getSellerReviews } from "../../auth/actions/profile-actions";
import { storeRepository } from "../../stores/repository/store.repository";
import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Grid, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import { ProductCard } from "../../products/components/ProductGrid";
import { ReviewCard } from "../../reviews/components/ReviewsList";
import type { ProductItem } from "../../products/types";
import type { ProductDocument } from "../../products/schemas/firestore";
import { isAuctionListing, isPreOrderListing } from "../../products/utils/listing-type";
import { User, Star, ShoppingBag, Package, Trophy, Globe, MapPin, ExternalLink } from "lucide-react";

const __P = {
  p4: "p-4",
  p6: "p-6",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-900 dark:to-black";

export interface PublicProfileViewProps {
  userId: string;
  heroBannerClass?: string;
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
  heroBannerClass = DEFAULT_HERO_CLASS,
}: PublicProfileViewProps) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("publicProfile");

  const profile = await getPublicUserProfile(userId).catch(() => null);
  const storeId = profile?.storeSlug ?? null;

  const [products, reviews, store] = await Promise.all([
    storeId ? getProfileStoreProducts(storeId).catch(() => []) : Promise.resolve([]),
    storeId ? getSellerReviews(storeId).catch(() => []) : Promise.resolve([]),
    storeId ? storeRepository.findById(storeId).catch(() => null) : Promise.resolve(null),
  ]);

  const isSeller = profile?.role === "seller" || profile?.role === "admin";
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
  const reviewCount = reviews.length;
  const itemsSold = stats?.itemsSold ?? 0;
  const auctionsWon = stats?.auctionsWon ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;

  const storeSlug = profile?.storeSlug;
  const storeName = store?.storeName ?? pub?.storeName ?? displayName;
  const storeDescription = store?.storeDescription ?? pub?.storeDescription;

  const profileHeroCtx = { displayName, photoURL, memberSince, isSeller, storeSlug, flex, page, heroBannerClass };
  const statItems = buildProfileStatItems(t, { listingCount, reviewCount, itemsSold, auctionsWon, totalOrders, isSeller });

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {renderProfileHero(t, profileHeroCtx)}
      <Stack gap="2xl" className={`${page.container.md} py-10 md:py-12`}>
        {renderProfileStatsRow(themed, flex, statItems)}
        {renderProfileBioSection(themed, pub)}
        {renderStoreDescriptionSection(themed, isSeller, storeSlug ?? null, storeDescription ?? null, storeName, t)}
        {renderProfileListingsSection(t, themed, products, storeSlug ?? null)}
        {renderProfileReviewsSection(t, themed, reviews, storeSlug ?? null)}
        <Row justify="center" className="pt-2">
          <Link href={String(ROUTES.HOME)} className="text-sm text-zinc-400 dark:text-zinc-400 hover:text-neutral-600 dark:hover:text-zinc-300">
            ← {t("backHome")}
          </Link>
        </Row>
      </Stack>
    </Div>
  );
}

type ProfileT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
type ProfileThemed = (typeof THEME_CONSTANTS)["themed"];
type ProfileFlex = (typeof THEME_CONSTANTS)["flex"];
type ProfilePage = (typeof THEME_CONSTANTS)["page"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PubProfile = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProfileProduct = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function renderProfileHero(t: ProfileT, ctx: { displayName: string; photoURL: string | null; memberSince: string; isSeller: boolean; storeSlug: string | null | undefined; flex: ProfileFlex; page: ProfilePage; heroBannerClass: string }) {
  const { displayName, photoURL, memberSince, isSeller, storeSlug, flex, page, heroBannerClass } = ctx;
  return (
    <Section className={`${heroBannerClass} text-white py-10 md:py-14`}>
      <Div className={`${page.container.md}`}>
        <Div className="flex flex-wrap gap-4 flex-col sm:flex-row items-center sm:items-end">
          <Div className={`w-20 h-20 rounded-full bg-white/20 ${flex.center} flex-shrink-0 ${__O.hidden}`}>
            {photoURL ? <img src={photoURL} alt={displayName} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-white/60" />}
          </Div>
          <Stack gap="xs" className="text-center sm:text-left">
            <Div className="flex flex-wrap gap-1 justify-center sm:justify-start">
              <Heading level={1} variant="none" className="text-white mb-0">{displayName}</Heading>
              {isSeller && <Span size="xs" weight="semibold" className="rounded-full bg-white/20 px-2.5 py-0.5 text-white/90">{t("roleSeller")}</Span>}
            </Div>
            <Text variant="none" className="text-white/60 text-sm">{memberSince}</Text>
          </Stack>
          {isSeller && storeSlug && (
            <Div className="sm:ml-auto">
              <Link href={String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))} className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                {t("visitStore")}
              </Link>
            </Div>
          )}
        </Div>
      </Div>
    </Section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderProfileStatsRow(themed: ProfileThemed, flex: ProfileFlex, statItems: { icon: any; label: string; value: string }[]) {
  return (
    <Grid gap="md" className="grid-cols-2 sm:grid-cols-4">
      {statItems.map(({ icon: Icon, label, value }) => (
        <Div key={label} rounded="xl" className={`border ${themed.border} ${themed.bgPrimary} ${__P.p4} text-center`}>
          <Row centered className={`${flex.center} mb-1`}><Icon className="w-4 h-4 text-neutral-400" /></Row>
          <Text className="text-lg font-bold">{value}</Text>
          <Text variant="secondary" className="text-xs">{label}</Text>
        </Div>
      ))}
    </Grid>
  );
}

function renderProfileBioSection(themed: ProfileThemed, pub: PubProfile) {
  if (!pub?.bio && !pub?.location && !pub?.website) return null;
  return (
    <Section>
      <Stack gap="sm" className={`rounded-2xl border ${themed.border} ${themed.bgPrimary} ${__P.p6}`}>
        {pub.bio && <Text className="text-sm leading-relaxed text-neutral-700 dark:text-zinc-300">{pub.bio}</Text>}
        <Row gap="md" wrap>
          {pub.location && <Span size="sm" className="flex items-center gap-1.5 text-neutral-500 dark:text-zinc-400"><MapPin className="w-4 h-4" />{pub.location}</Span>}
          {pub.website && <a href={pub.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Globe className="w-4 h-4" />{pub.website.replace(/^https?:\/\//, "")}</a>}
        </Row>
      </Stack>
    </Section>
  );
}

function renderStoreDescriptionSection(themed: ProfileThemed, isSeller: boolean, storeSlug: string | null, storeDescription: string | null, storeName: string, t: ProfileT) {
  if (!isSeller || !storeSlug || !storeDescription) return null;
  return (
    <Section>
      <Div rounded="2xl" className={`border ${themed.border} ${themed.bgSecondary} ${__P.p6}`}>
        <Heading level={3} className="mb-2">{storeName}</Heading>
        <Text variant="secondary" className="text-sm leading-relaxed">{storeDescription}</Text>
        <Link href={String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{t("visitStore")} →</Link>
      </Div>
    </Section>
  );
}

function renderProfileListingsSection(t: ProfileT, themed: ProfileThemed, products: ProfileProduct[], storeSlug: string | null) {
  return (
    <Section>
      <Heading level={2} className="mb-4">{t("listingsTitle")}</Heading>
      {products.length === 0 ? (
        <Div rounded="2xl" className={`border ${themed.border} ${themed.bgSecondary} p-12 text-center`}>
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <Text variant="secondary" className="text-sm">{t("noListings")}</Text>
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

function renderProfileReviewsSection(t: ProfileT, themed: ProfileThemed, reviews: ProfileReview[], storeSlug: string | null) {
  return (
    <Section>
      <Heading level={2} className="mb-4">{t("reviewsTitle")}</Heading>
      {reviews.length === 0 ? (
        <Div rounded="2xl" className={`border ${themed.border} ${themed.bgSecondary} p-12 text-center`}>
          <Star className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <Text variant="secondary" className="text-sm">{t("noReviews")}</Text>
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
