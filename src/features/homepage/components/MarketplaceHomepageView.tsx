import React from "react";
import { Main } from "../../../ui";
import { carouselRepository, faqsRepository, siteSettingsRepository } from "../../../repositories";
import { fetchLiveStats, type LiveStatsMap } from "../lib/live-stats";
import { renderSection, AnnouncementBar, type SectionData } from "../lib/section-renderer";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
import { getFeaturedProducts, getFeaturedAuctions, getFeaturedPreOrders } from "../../products/actions/product-actions";
import { listTopLevelCategories, listBrandCategories } from "../../categories/actions/category-actions";
import { listStores } from "../../stores/actions/store-query-actions";
import { getFeaturedBlogPosts } from "../../blog/actions/blog-actions";
import { listPublicEvents } from "../../events/actions/event-actions";
import type {
  HomepageSectionDocument,
  StatsSectionConfig,
  LiveStatMetric,
} from "../schemas";
import type { ProductItem } from "../../products/types";
import type { StoreListItem } from "../../stores/types";
import type { CategoryItem } from "../../categories/types";
import type { BlogPost } from "../../blog/types";
import type { EventItem } from "../../events/types";

export type { MarketplaceHomepageViewAdSlots } from "../lib/section-renderer";

export interface MarketplaceHomepageViewProps {
  adSlots?: import("../lib/section-renderer").MarketplaceHomepageViewAdSlots;
  newsletterFormSlot?: React.ReactNode;
}

export async function MarketplaceHomepageView({
  adSlots,
  newsletterFormSlot,
}: MarketplaceHomepageViewProps = {}) {
  const slides = await carouselRepository.getActiveSlides().catch(() => []);
  const siteSettings = await siteSettingsRepository.getSingleton().catch(() => null);
  const announcementMessage =
    siteSettings?.announcementBar?.message?.trim() ||
    "🎉 Up to 15% Off on Pokémon TCG this week — Use code SAVE15";
  const showAnnouncement = siteSettings?.announcementBar?.enabled ?? true;

  const [enabledSections, rawFaqItems] = await Promise.all([
    homepageSectionsRepository.getEnabledSections().catch(() => [] as HomepageSectionDocument[]),
    faqsRepository.getHomepageFAQs().catch(() => []),
  ]);

  // Collect only the live metric keys that are actually configured in this deployment
  const liveMetricsNeeded = new Set<LiveStatMetric>();
  for (const section of enabledSections) {
    if (section.type === "stats") {
      const cfg = section.config as StatsSectionConfig;
      for (const stat of cfg?.stats ?? []) {
        if (stat.source === "live" && stat.metric) {
          liveMetricsNeeded.add(stat.metric as LiveStatMetric);
        }
      }
    }
  }
  const liveStats: LiveStatsMap =
    liveMetricsNeeded.size > 0 ? await fetchLiveStats([...liveMetricsNeeded]) : {};

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
  }));

  // Determine which data-driven section types are active so we only fetch what's needed
  const activeTypes = new Set(orderedSections.map((s) => s.type));

  const [
    productsResult,
    auctionsResult,
    preOrdersResult,
    categoriesResult,
    brandsResult,
    storesResult,
    blogResult,
    eventsResult,
  ] = await Promise.all([
    activeTypes.has("products") ? getFeaturedProducts(12).catch(() => null) : null,
    activeTypes.has("auctions") ? getFeaturedAuctions(12).catch(() => null) : null,
    activeTypes.has("pre-orders") ? getFeaturedPreOrders(12).catch(() => null) : null,
    activeTypes.has("categories") ? listTopLevelCategories(12).catch(() => null) : null,
    activeTypes.has("brands") ? listBrandCategories(12).catch(() => null) : null,
    activeTypes.has("stores") ? listStores({ pageSize: 8, sorts: "-averageRating" }).catch(() => null) : null,
    activeTypes.has("blog-articles") ? getFeaturedBlogPosts(6).catch(() => null) : null,
    activeTypes.has("events") ? listPublicEvents({ filters: "status==active", pageSize: 6 }).catch(() => null) : null,
  ]);

  // ProductDocument.condition has "graded" which is absent from ProductItem.condition,
  // so the structural types are not directly assignable despite being functionally
  // compatible for all section rendering purposes. The cast is safe: section components
  // only read fields that overlap between the two types.
  const sectionData: SectionData = {
    products: (productsResult?.items ?? []) as unknown as ProductItem[],
    auctions: (auctionsResult?.items ?? []) as unknown as ProductItem[],
    preOrders: (preOrdersResult?.items ?? []) as unknown as ProductItem[],
    categories: (categoriesResult ?? []) as unknown as CategoryItem[],
    brands: (brandsResult ?? []) as unknown as CategoryItem[],
    stores: (storesResult?.items ?? []) as unknown as StoreListItem[],
    blog: (blogResult ?? []) as unknown as BlogPost[],
    events: (eventsResult?.items ?? []) as unknown as EventItem[],
  };

  return (
    <Main>
      {showAnnouncement ? <AnnouncementBar message={announcementMessage} /> : null}
      {orderedSections.map((section) =>
        renderSection(section, adSlots, newsletterFormSlot ?? null, faqItems, slides as any[], liveStats, sectionData),
      )}
    </Main>
  );
}
