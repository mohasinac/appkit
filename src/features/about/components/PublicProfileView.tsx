import Link from "next/link";
import { getPublicUserProfile, getProfileStoreProducts, getSellerReviews } from "../../auth/actions/profile-actions";
import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section } from "../../../ui";
import { ProductCard } from "../../products/components/ProductGrid";
import { ReviewCard } from "../../reviews/components/ReviewsList";
import type { ProductItem } from "../../products/types";
import type { ProductDocument } from "../../products/schemas/firestore";
import { User, Star, ShoppingBag, Package, Trophy, Globe, MapPin, ExternalLink } from "lucide-react";

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
    isAuction: p.isAuction,
    isPreOrder: p.isPreOrder,
    isOnSale: p.isOnSale,
    isSold: p.isSold,
    isPromoted: p.isPromoted,
    featured: p.featured,
    category: p.category,
    categoryName: p.categoryName,
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
  if (p.isAuction) return String(ROUTES.PUBLIC.AUCTION_DETAIL(p.id));
  if (p.isPreOrder) return String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id));
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

  const [products, reviews] = await Promise.all([
    storeId ? getProfileStoreProducts(storeId).catch(() => []) : Promise.resolve([]),
    storeId ? getSellerReviews(storeId).catch(() => []) : Promise.resolve([]),
  ]);

  const displayName = profile?.displayName ?? t("profileTitle");
  const photoURL = profile?.photoURL ?? null;
  const isSeller = profile?.role === "seller" || profile?.role === "admin";
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
  const storeName = pub?.storeName ?? displayName;
  const storeDescription = pub?.storeDescription;

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="publicprofileview-div-186">
      {/* Profile hero banner */}
      <Section className={`${heroBannerClass} text-white py-10 md:py-14`}>
        <div className={`${page.container.md}`}>
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar */}
            <div className={`w-20 h-20 rounded-full bg-white/20 ${flex.center} flex-shrink-0 overflow-hidden`}>
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/60" />
              )}
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <Heading level={1} variant="none" className="text-white mb-0">
                  {displayName}
                </Heading>
                {isSeller && (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white/90">
                    {t("roleSeller")}
                  </span>
                )}
              </div>
              <Text variant="none" className="text-white/60 text-sm mt-1">
                {memberSince}
              </Text>
            </div>

            {/* Visit store button */}
            {isSeller && storeSlug && (
              <div className="sm:ml-auto">
                <Link
                  href={String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("visitStore")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className={`${page.container.md} py-10 md:py-12 space-y-10`}>
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
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
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className={`rounded-xl border ${themed.border} ${themed.bgPrimary} p-4 text-center`}
            >
              <div className={`${flex.center} mb-1`}>
                <Icon className="w-4 h-4 text-neutral-400" />
              </div>
              <Text className="text-lg font-bold">{value}</Text>
              <Text variant="secondary" className="text-xs">
                {label}
              </Text>
            </div>
          ))}
        </div>

        {/* Bio & meta */}
        {(pub?.bio || pub?.location || pub?.website) && (
          <Section>
            <div className={`rounded-2xl border ${themed.border} ${themed.bgPrimary} p-6 space-y-3`}>
              {pub.bio && (
                <Text className="text-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
                  {pub.bio}
                </Text>
              )}
              <div className="flex flex-wrap gap-4">
                {pub.location && (
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-zinc-400">
                    <MapPin className="w-4 h-4" />
                    {pub.location}
                  </span>
                )}
                {pub.website && (
                  <a
                    href={pub.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {pub.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Store description — shown for sellers with a description */}
        {isSeller && storeSlug && storeDescription && (
          <Section>
            <div className={`rounded-2xl border ${themed.border} ${themed.bgSecondary} p-6`}>
              <Heading level={3} className="mb-2">
                {storeName}
              </Heading>
              <Text variant="secondary" className="text-sm leading-relaxed">
                {storeDescription}
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t("visitStore")} →
              </Link>
            </div>
          </Section>
        )}

        {/* Listings */}
        <Section>
          <Heading level={2} className="mb-4">
            {t("listingsTitle")}
          </Heading>
          {products.length === 0 ? (
            <div className={`rounded-2xl border ${themed.border} ${themed.bgSecondary} p-12 text-center`}>
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <Text variant="secondary" className="text-sm">
                {t("noListings")}
              </Text>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.slice(0, 8).map((p) => (
                <ProductCard
                  key={p.id}
                  product={toProductItem(p)}
                  href={getProductHref(p)}
                />
              ))}
            </div>
          )}
          {products.length > 8 && storeSlug && (
            <div className="mt-4 text-center">
              <Link
                href={String(ROUTES.PUBLIC.STORE_PRODUCTS(storeSlug))}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("viewAllListings", { count: products.length })}
              </Link>
            </div>
          )}
        </Section>

        {/* Reviews */}
        <Section>
          <Heading level={2} className="mb-4">
            {t("reviewsTitle")}
          </Heading>
          {reviews.length === 0 ? (
            <div className={`rounded-2xl border ${themed.border} ${themed.bgSecondary} p-12 text-center`}>
              <Star className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
              <Text variant="secondary" className="text-sm">
                {t("noReviews")}
              </Text>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviews.slice(0, 6).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
          {reviews.length > 6 && storeSlug && (
            <div className="mt-4 text-center">
              <Link
                href={String(ROUTES.PUBLIC.STORE_REVIEWS(storeSlug))}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("viewAllReviews", { count: reviews.length })}
              </Link>
            </div>
          )}
        </Section>

        {/* Back link */}
        <div className="flex justify-center pt-2">
          <Link href={String(ROUTES.HOME)} className="text-sm text-neutral-400 dark:text-zinc-500 hover:text-neutral-600 dark:hover:text-zinc-300">
            ← {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
