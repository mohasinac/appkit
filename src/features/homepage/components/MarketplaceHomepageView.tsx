import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { Div, Main } from "../../../ui";
import { carouselRepository, faqsRepository, siteSettingsRepository } from "../../../repositories";
import { safeRead } from "../../../errors/safe-read";
import { fetchLiveStats, type LiveStatsMap } from "../lib/live-stats";
import { renderSection, AnnouncementBar, type SectionData } from "../lib/section-renderer";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
import { isListingTypeEnabled } from "../../../_internal/shared/listing-types/feature-flags";
import type { ListingType } from "../../products/types/index";
import type { SectionType } from "../schemas/firestore";

/**
 * Homepage sections that advertise a specific listing type, and must therefore
 * disappear when the site stops offering it. A section type absent from this
 * map always renders.
 */
const HOMEPAGE_SECTION_LISTING_TYPE: Partial<Record<SectionType, ListingType>> = {
  auctions: "auction",
  "pre-orders": "pre-order",
  "prize-draws": "prize-draw",
};
import { getFeaturedProducts, getFeaturedAuctions, getFeaturedPreOrders } from "../../products/actions/product-actions";
import { listTopLevelCategories, listBrandCategories } from "../../categories/actions/category-actions";
import { listFeaturedBundles } from "../../../_internal/server/features/bundles/data";
import { listStores } from "../../stores/actions/store-query-actions";
import { toStoreListItem } from "../../../_internal/server/features/stores/adapters";
import { getFeaturedBlogPosts } from "../../blog/actions/blog-actions";
import { listPublicEvents } from "../../events/actions/event-actions";
import type {
  HomepageSectionDocument,
  StatsSectionConfig,
  CarouselSlideDocument,
} from "../schemas";
import type { CarouselSlide } from "../types/index";
import type { ProductItem } from "../../products/types";
import type { StoreListItem } from "../../stores/types";
import type { CategoryItem } from "../../categories/types";
import type { BlogPost } from "../../blog/types";
import type { EventItem } from "../../events/types";

/**
 * Converts Firestore CarouselSlideDocument[] (Date fields) to the API-shaped
 * CarouselSlide[] (string dates) expected by HeroCarousel / useHeroCarousel.
 * The two types share all display-relevant fields; only createdAt/updatedAt
 * and internal-only fields (analytics, createdBy) diverge.
 */
function toCarouselSlides(docs: CarouselSlideDocument[]): CarouselSlide[] {
  return docs.map(({ createdAt, updatedAt, analytics: _analytics, createdBy: _createdBy, ...rest }) => ({
    ...rest,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : undefined,
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : undefined,
  }));
}

export type { MarketplaceHomepageViewAdSlots } from "../lib/section-renderer";

export interface MarketplaceHomepageViewProps {
  adSlots?: import("../lib/section-renderer").MarketplaceHomepageViewAdSlots;
  newsletterFormSlot?: React.ReactNode;
  /** Callback when user dismisses announcement banner — wire to a server action to persist. */
  onBannerDismiss?: (hash: string) => void;
}

export async function MarketplaceHomepageView({
  adSlots,
  newsletterFormSlot,
  onBannerDismiss,
}: MarketplaceHomepageViewProps = {}) {
  // Every read on this page is a RAIL: the homepage must still render when one
  // fails, but a failure has to be distinguishable from an empty catalogue —
  // that is exactly Root Cause #59, and safeRead is what records it.
  const slides = await safeRead(() => carouselRepository.getActiveSlides(), {
    route: "/", key: "homepage.carouselSlides", fallback: [],
  });
  const siteSettings = await safeRead(() => siteSettingsRepository.getSingleton(), {
    route: "/", key: "homepage.siteSettings", fallback: null,
  });
  const announcementMessage =
    siteSettings?.announcementBar?.message?.trim() ||
    "🎉 Up to 15% Off on Pokémon TCG this week — Use code SAVE15";
  const showAnnouncement = siteSettings?.announcementBar?.enabled ?? true;

  const [allSections, rawFaqItems] = await Promise.all([
    safeRead(() => homepageSectionsRepository.getEnabledSections(), {
      route: "/", key: "homepage.enabledSections", fallback: [] as HomepageSectionDocument[],
    }),
    safeRead(() => faqsRepository.getHomepageFAQs(), {
      route: "/", key: "homepage.faqs", fallback: [],
    }),
  ]);

  // A homepage section must not advertise a listing type the site does not
  // offer. This gate previously read `featureFlags.{auctions,preOrders,events,
  // blog}`; that group was deleted on 2026-08-29, and only the listing-type
  // half of it had a real successor (`settings.listings.listingTypes`).
  //
  // So auctions / pre-orders / prize-draws are gated by the same control that
  // hides them on every other surface, and the `events` / `blog` sections are
  // now unconditional — there is no product control for "we don't run events",
  // and there never was one that anything but this line read.
  const enabledSections = allSections.filter((section) => {
    const gated = HOMEPAGE_SECTION_LISTING_TYPE[section.type as SectionType];
    return !gated || isListingTypeEnabled(gated, siteSettings);
  });

  // Collect live metric requests from all enabled stats sections
  const liveStatRequests: import("../lib/live-stats").LiveStatRequest[] = [];
  for (const section of enabledSections) {
    if (section.type !== "stats") continue;
    const cfg = section.config as StatsSectionConfig;
    for (const stat of cfg?.stats ?? []) {
      const src = stat.source;
      if (src === "live" || src === "live-preset") {
        if (stat.metric) {
          liveStatRequests.push({ key: stat.key, source: src, preset: stat.metric });
        }
      } else if (src === "live-collection") {
        if (stat.collectionQuery) {
          liveStatRequests.push({ key: stat.key, source: src, collectionQuery: stat.collectionQuery });
        }
      }
    }
  }
  const liveStats: LiveStatsMap =
    liveStatRequests.length > 0 ? await fetchLiveStats(liveStatRequests) : {};

  const orderedSections = [...enabledSections].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();
    if (aUpdated !== bUpdated) return aUpdated - bUpdated;
    return a.id.localeCompare(b.id);
  });

  const faqItems = rawFaqItems.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: typeof faq.answer === "string" ? faq.answer : faq.answer.text,
    category: faq.category ?? "general",
  }));

  // Determine which data-driven section types are active so we only fetch what's needed
  const activeTypes = new Set(orderedSections.map((s) => s.type));

  const [
    productsResult,
    auctionsResult,
    preOrdersResult,
    categoriesResult,
    brandsResult,
    bundlesResult,
    storesResult,
    blogResult,
    eventsResult,
  ] = await Promise.all([
    // No `.catch(() => null)` on these three: they go through
    // `listPublicProducts`, which already logs a failed query loudly and
    // returns an empty result. Swallowing here would make a broken query
    // indistinguishable from an empty catalogue (Root Cause #59).
    activeTypes.has("products") ? getFeaturedProducts(12) : null,
    activeTypes.has("auctions") ? getFeaturedAuctions(12) : null,
    activeTypes.has("pre-orders") ? getFeaturedPreOrders(12) : null,
    activeTypes.has("categories")
      ? safeRead<Awaited<ReturnType<typeof listTopLevelCategories>> | null>(
          () => listTopLevelCategories(12),
          { route: "/", key: "homepage.categories", fallback: null })
      : null,
    activeTypes.has("brands")
      ? safeRead<Awaited<ReturnType<typeof listBrandCategories>> | null>(
          () => listBrandCategories(12),
          { route: "/", key: "homepage.brands", fallback: null })
      : null,
    activeTypes.has("featured-bundles")
      ? safeRead<Awaited<ReturnType<typeof listFeaturedBundles>> | null>(
          () => listFeaturedBundles(8),
          { route: "/", key: "homepage.featuredBundles", fallback: null })
      : null,
    activeTypes.has("stores")
      ? safeRead<Awaited<ReturnType<typeof listStores>> | null>(
          () => listStores({ pageSize: 8, sorts: sortBy("averageRating", "DESC") }),
          { route: "/", key: "homepage.stores", fallback: null })
      : null,
    activeTypes.has("blog-articles")
      ? safeRead<Awaited<ReturnType<typeof getFeaturedBlogPosts>> | null>(
          () => getFeaturedBlogPosts(6),
          { route: "/", key: "homepage.blogPosts", fallback: null })
      : null,
    activeTypes.has("events")
      ? safeRead<Awaited<ReturnType<typeof listPublicEvents>> | null>(
          () => listPublicEvents({ filters: sieveFilter("status", SIEVE_OP.EQ, "active"), pageSize: 6 }),
          { route: "/", key: "homepage.events", fallback: null })
      : null,
  ]);

  // ProductDocument / BlogDocument / EventDocument have Date fields and extra Firestore-only
  // fields absent from the corresponding *Item types. The casts below are safe: section
  // components only read display fields that are present on both document and item shapes.
  const sectionData: SectionData = {
    products: productsResult?.items?.length
      ? (productsResult.items as unknown as ProductItem[])
      : undefined,
    auctions: auctionsResult?.items?.length
      ? (auctionsResult.items as unknown as ProductItem[])
      : undefined,
    preOrders: preOrdersResult?.items?.length
      ? (preOrdersResult.items as unknown as ProductItem[])
      : undefined,
    categories: categoriesResult?.length
      ? (categoriesResult as unknown as CategoryItem[])
      : undefined,
    brands: brandsResult?.length
      ? (brandsResult as unknown as CategoryItem[])
      : undefined,
    bundles: bundlesResult?.length ? bundlesResult : undefined,
    // Projected, NOT cast. FeaturedStoresSection is a Client Component and this
    // value becomes its `initialItems`, so a raw StoreDocument here would be
    // serialised into the homepage's public HTML — secrets included. Every
    // other cast in this object maps a document that carries no secrets.
    stores: storesResult?.items?.length
      ? storesResult.items.map((s) => toStoreListItem(s))
      : undefined,
    blog: blogResult?.length
      ? (blogResult as unknown as BlogPost[])
      : undefined,
    events: eventsResult?.items?.length
      ? (eventsResult.items as unknown as EventItem[])
      : undefined,
  };

  const carouselSlides = toCarouselSlides(slides);

  return (
    <Main>
      <Div className="relative">
        {showAnnouncement ? (
          <AnnouncementBar overlay message={announcementMessage} link={siteSettings?.announcementBar?.link} onDismiss={onBannerDismiss} />
        ) : null}
        {orderedSections.map((section) =>
          renderSection(section, adSlots, newsletterFormSlot ?? null, faqItems, carouselSlides, liveStats, sectionData),
        )}
      </Div>
    </Main>
  );
}
