import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { Div } from "../../../ui/components/Div";
import { Main } from "../../../ui/components/Semantic";
// Deep import, not the `ui` barrel and not `@mohasinac/appkit/client`: this is a
// Server Component, so a runtime value from the client entry would arrive as a
// client-reference proxy (Root Cause #76). Rendering it as JSX is the supported
// boundary; importing it from its defining module is Root Cause #18.
import { TopBannerPortal } from "../../../ui/components/TopBannerPortal";
import { carouselRepository } from "../repository/carousel.repository";
// Both are React.cache wrappers around a single repository call, shared with
// other readers in the same request tree (the locale layout for settings,
// page.tsx's FAQ JSON-LD for the FAQs). Importing the repositories directly
// here is what made each of those a second Firestore read.
import { getSiteSettingsGlobal } from "../../admin/utils/getSiteSettingsGlobal";
import { getHomepageFaqsCached } from "../../faq/utils/getHomepageFaqsCached";
import { safeRead } from "../../../errors/safe-read";
import { fetchLiveStats, type LiveStatsMap } from "../lib/live-stats";
import { renderSection, AnnouncementBar, type SectionData } from "../lib/section-renderer";
import { gateCarouselSlides } from "../lib/slide-gating";
import { SECTION_COPY } from "../constants/section-copy";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
import {
  isListingTypeEnabled,
  isCategoryTypeEnabled,
  isBrowsePageEnabled,
} from "../../../_internal/shared/listing-types/feature-flags";
import type { BrowsePageKey } from "../../../_internal/shared/listing-types/feature-flags";
import type { ListingType } from "../../products/types/index";
import type { CategoryType } from "../../categories/types/index";
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

/**
 * The same idea for the CATEGORY types, added 2026-10-20.
 *
 * 🛑 Bundles are not a `ListingType`, so `featured-bundles` sat outside the
 * map above and rendered unconditionally — the one merchandise rail on the
 * homepage with no off switch at all, while every neighbouring rail had one.
 * `listings.categoryTypes.bundle` is the control that already exists for
 * exactly this, and the admin Site Settings screen already shows it.
 */
const HOMEPAGE_SECTION_CATEGORY_TYPE: Partial<Record<SectionType, CategoryType>> = {
  "featured-bundles": "bundle",
};

/**
 * The THIRD axis — a section whose whole job is to funnel visitors into a
 * public browse page that an admin has closed.
 *
 * 🛑 THIS GAP WAS VISIBLE ON THE LIVE HOMEPAGE. `/categories`, `/brands`,
 * `/franchise` and `/stores` were all closed via `listings.browsePages`, and
 * the homepage went on rendering "Shop by Category" with an "All categories →"
 * button and a "Featured Stores" rail with "View all stores →" — every one of
 * them a link into a section that is deliberately shut. A rail that advertises
 * a closed door is worse than an absent rail: the visitor spends a click to
 * find out.
 *
 * The two maps above gate on what the marketplace SELLS and what a taxonomy
 * ROW may be. Neither can express "the front door is shut", which is why
 * closing every browse page changed nothing here — see the `browsePages`
 * docstring in the admin schema for why that is a separate axis rather than a
 * rename of either.
 *
 * `brands` is included even though no section of that type is seeded today:
 * the type exists in the `SectionType` union, so an admin can add one, and a
 * gate that covers three of four reachable cases is the drift this codebase
 * keeps paying for (Root Cause #61).
 */
const HOMEPAGE_SECTION_BROWSE_PAGE: Partial<Record<SectionType, BrowsePageKey>> = {
  categories: "categories",
  brands: "brands",
  stores: "stores",
};
import { getFeaturedProducts, getFeaturedAuctions, getFeaturedPreOrders } from "../../products/actions/product-actions";
import { listTopLevelCategories, listBrandCategories } from "../../categories/actions/category-actions";
import { listFeaturedBundles } from "../../../_internal/server/features/bundles/data";
import { listStores } from "../../stores/actions/store-query-actions";
import { toStoreListItem } from "../../../_internal/server/features/stores/adapters";
import { getFeaturedBlogPosts } from "../../blog/actions/blog-actions";
import { listPublicEvents } from "../../events/actions/event-actions";
import { getHomepageCoupons } from "../../../_internal/server/features/promotions/data";
import type {
  HomepageSectionDocument,
  StatsSectionConfig,
  CarouselSlideDocument,
} from "../schemas";
import type { CarouselSlide } from "../types/index";
import type { ProductItem } from "../../products/types";

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
  /**
   * Consumer's site identity. Pass this from whatever single source already
   * owns it (this app uses the same `appkit.config.js` block that backs
   * `SITE_IDENTITY` in the root layout). Without it the sections fall back to
   * brand-neutral copy — which is correct for a library, and is why the
   * renderer no longer hardcodes "LIR" or "LetItRip".
   */
  brand?: import("../lib/section-renderer").HomepageBrand;
}

export async function MarketplaceHomepageView({
  adSlots,
  newsletterFormSlot,
  onBannerDismiss,
  brand,
}: MarketplaceHomepageViewProps = {}) {
  // Every read on this page is a RAIL: the homepage must still render when one
  // fails, but a failure has to be distinguishable from an empty catalogue —
  // that is exactly Root Cause #59, and safeRead is what records it.
  const slides = await safeRead(() => carouselRepository.getActiveSlides(), {
    route: "/", key: "homepage.carouselSlides", fallback: [],
  });
  // getSiteSettingsGlobal, not the repository directly — the locale layout and
  // generateMetadata already read the same singleton through it, so this is one
  // Firestore read for the whole request tree instead of a second one.
  const siteSettings = await safeRead(() => getSiteSettingsGlobal(), {
    route: "/", key: "homepage.siteSettings", fallback: null,
  });
  // The fallback used to be a hardcoded seasonal Pokémon TCG discount, which
  // any install leaving the bar unconfigured would have published as live
  // promotional copy for a promotion that does not exist.
  const announcementMessage =
    siteSettings?.announcementBar?.message?.trim() || SECTION_COPY.announcementFallback;
  const showAnnouncement = siteSettings?.announcementBar?.enabled ?? true;

  const [allSections, rawFaqItems] = await Promise.all([
    safeRead(() => homepageSectionsRepository.getEnabledSections(), {
      route: "/", key: "homepage.enabledSections", fallback: [] as HomepageSectionDocument[],
    }),
    // Shared with the FAQ JSON-LD built in src/app/[locale]/page.tsx — one read.
    safeRead(() => getHomepageFaqsCached(), {
      route: "/", key: "homepage.faqs", fallback: [],
    }),
  ]);

  // A homepage section must not advertise a listing type the site does not
  // offer. This gate previously read `featureFlags.{auctions,preOrders,events,
  // blog}`; that group was deleted on 2026-08-29, and only the listing-type
  // half of it had a real successor (`settings.listings.listingTypes`).
  //
  // So auctions / pre-orders / prize-draws are gated by the same control that
  // hides them on every other surface, `featured-bundles` joined them on
  // 2026-10-20 via the category-type half of the same setting, and the
  // `events` / `blog` / `event-raffles` sections stay unconditional — there is
  // no product control for "we don't run events", and there never was one that
  // anything but this line read. Those are switched off per-document instead
  // (`enabled: false`), which is the only lever they have.
  const enabledSections = allSections.filter((section) => {
    const type = section.type as SectionType;
    const gatedListing = HOMEPAGE_SECTION_LISTING_TYPE[type];
    if (gatedListing && !isListingTypeEnabled(gatedListing, siteSettings)) return false;
    const gatedCategory = HOMEPAGE_SECTION_CATEGORY_TYPE[type];
    if (gatedCategory && !isCategoryTypeEnabled(gatedCategory, siteSettings)) return false;
    const gatedBrowse = HOMEPAGE_SECTION_BROWSE_PAGE[type];
    if (gatedBrowse && !isBrowsePageEnabled(gatedBrowse, siteSettings)) return false;
    return true;
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
    couponsResult,
  ] = await Promise.all([
    // No `.catch(() => null)` on these three: they go through
    // `listPublicProducts`, which already logs a failed query loudly and
    // returns an empty result. Swallowing here would make a broken query
    // indistinguishable from an empty catalogue (Root Cause #59).
    activeTypes.has("products") ? getFeaturedProducts(12) : null,
    activeTypes.has("auctions") ? getFeaturedAuctions(12) : null,
    activeTypes.has("pre-orders") ? getFeaturedPreOrders(12) : null,
    // `welcome` is a second trigger, not a typo: its hero mosaic is built from
    // these categories' cover images. Gating the fetch on `categories` alone
    // meant a homepage without a categories section rendered the hero's
    // brand-mark fallback with nothing anywhere saying the imagery had simply
    // not been fetched.
    activeTypes.has("categories") || activeTypes.has("welcome")
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
    /*
     * `getHomepageCoupons` does its own `safeRead` internally — it is the one
     * fetch here that owns its failure, because it has a meaningful fallback
     * of its own (an empty rail, which the section then hides entirely).
     * Wrapping it again would record the same degraded read twice.
     */
    activeTypes.has("coupons") ? getHomepageCoupons(12) : null,
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
    /*
     * Projected by `toAttachedCoupon`, not cast — same reason as `stores`
     * above. This becomes a Client Component's prop, and a raw
     * `CouponDocument` carries `usage.*` redemption telemetry and
     * `analytics.totalRevenue` straight into the homepage's public HTML
     * (Root Cause #70). The projection is done inside `getHomepageCoupons`.
     */
    coupons: couponsResult?.length ? couponsResult : undefined,
  };

  /*
   * The same "do not advertise what we do not sell" rule the section filter
   * above applies, one level deeper.
   *
   * `enabledSections` is keyed on `SectionType`, so it can drop the auctions
   * RAIL but is structurally blind to a carousel — a carousel is one section
   * of type `carousel` whatever its slides happen to be about. With
   * `auction: false` live, the hero still shipped a "Live auctions" card and a
   * full "Win it at your price" slide, both pointing at `/auctions`.
   *
   * Gated on the LINK rather than the copy: "Win it at your price" names no
   * type, so a keyword scan would miss the worse of the two offenders while
   * eating innocent ones. See `slide-gating.ts`.
   */
  const carouselSlides = gateCarouselSlides(toCarouselSlides(slides), siteSettings);

  return (
    <Main>
      <Div className="relative">
        {/* Portalled ABOVE the title bar rather than rendered here. It used to
            be `<AnnouncementBar overlay>`, which is `absolute inset-x-0 top-0`
            over this very Div — i.e. painted on top of the first section, which
            is the overlap the `overlay` prop existed to create and that its own
            comment measured against the hero <h1>. The banner is page-owned but
            belongs above the header, and only the layout can place it there. */}
        {showAnnouncement ? (
          <TopBannerPortal>
            <AnnouncementBar
              message={announcementMessage}
              link={siteSettings?.announcementBar?.link}
              onDismiss={onBannerDismiss}
            />
          </TopBannerPortal>
        ) : null}
        {orderedSections.map((section) =>
          renderSection(section, adSlots, newsletterFormSlot ?? null, faqItems, carouselSlides, liveStats, sectionData, brand),
        )}
      </Div>
    </Main>
  );
}
