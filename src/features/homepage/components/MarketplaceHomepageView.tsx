import React from "react";
import { Main } from "../../../ui";
import { carouselRepository, faqsRepository, siteSettingsRepository } from "../../../repositories";
import { fetchLiveStats, type LiveStatsMap } from "../lib/live-stats";
import { renderSection, AnnouncementBar } from "../lib/section-renderer";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
import type {
  HomepageSectionDocument,
  StatsSectionConfig,
  LiveStatMetric,
} from "../schemas";

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

  return (
    <Main>
      {showAnnouncement ? <AnnouncementBar message={announcementMessage} /> : null}
      {orderedSections.map((section) =>
        renderSection(section, adSlots, newsletterFormSlot ?? null, faqItems, slides as any[], liveStats),
      )}
    </Main>
  );
}
