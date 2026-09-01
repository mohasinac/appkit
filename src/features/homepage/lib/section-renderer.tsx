import React from "react";
import { ROUTES } from "../../../next";
import { cleanTitle, parseWelcomeDescription } from "./section-helpers";
import { DEFAULT_TRUST_FEATURES, DEFAULT_SECURITY_ITEMS } from "./section-defaults";
import {
  SECTION_TITLE,
  SECTION_COPY,
  VIEW_MORE_LABEL,
  WELCOME_TRUST_CHIPS,
} from "../constants/section-copy";
import { FAQ_CATEGORY_LABELS } from "../constants/faq-category-labels";
import type { LiveStatsMap } from "./live-stats";
import { AnnouncementBar, hashBannerMessage } from "../components/AnnouncementBar";
import { HeroCarousel } from "../components/HeroCarousel";
import { StatsCounterSection } from "../components/StatsCounterSection";
import { TrustFeaturesSection } from "../components/TrustFeaturesSection";
import { ShopByCategorySection } from "../components/ShopByCategorySection";
import { FeaturedProductsSection } from "../components/FeaturedProductsSection";
import { FeaturedAuctionsSection } from "../components/FeaturedAuctionsSection";
import { FeaturedPreOrdersSection } from "../components/FeaturedPreOrdersSection";
import { FeaturedStoresSection } from "../components/FeaturedStoresSection";
import { EventsSection } from "../components/EventsSection";
import { CTABannerSection } from "../components/CTABannerSection";
import { HomepageCustomerReviewsSection } from "../components/HomepageCustomerReviewsSection";
import { SecurityHighlightsSection } from "../components/SecurityHighlightsSection";
import { WhatsAppCommunitySection } from "../components/WhatsAppCommunitySection";
import { FAQSection } from "../components/FAQSection";
import { NewsletterSection } from "../components/NewsletterSection";
import { BlogArticlesSection } from "../components/BlogArticlesSection";
import { WelcomeSection } from "../components/WelcomeSection";
import { BrandsSection } from "../components/BrandsSection";
import { SocialFeedSection } from "../components/SocialFeedSection";
import { CustomCardsSection } from "../components/CustomCardsSection";
import { GoogleReviewsSection } from "../components/GoogleReviewsSection";
// S-SBUNI-3 2026-05-13 — FeaturedBundlesSection rebuilt against
// categoryType:"bundle" rows on the categories collection.
import { FeaturedBundlesSection } from "../components/FeaturedBundlesSection";
import { HomepageSectionBoundary } from "../components/HomepageSectionBoundary";
import { PrizeDrawsSection } from "../../products/components/PrizeDrawsSection";
import { EventRafflesSection } from "../../events/components/EventRafflesSection";
import { CollectionCardsSection } from "../components/CollectionCardsSection";
import type { CarouselSlide } from "../types/index";
import type {
  HomepageSectionDocument,
  WelcomeSectionConfig,
  StatsSectionConfig,
  CarouselSectionConfig,
  ProductsSectionConfig,
  AuctionsSectionConfig,
  PreOrdersSectionConfig,
  StoresSectionConfig,
  EventsSectionConfig,
  ReviewsSectionConfig,
  CategoriesSectionConfig,
  TrustIndicatorsSectionConfig,
  FeaturesSectionConfig,
  BannerSectionConfig,
  WhatsAppCommunitySectionConfig,
  FAQSectionConfig,
  BlogArticlesSectionConfig,
  NewsletterSectionConfig,
  BrandsSectionConfig,
  SocialFeedSectionConfig,
  CustomCardsSectionConfig,
  GoogleReviewsSectionConfig,
  FeaturedBundlesSectionConfig,
  PrizeDrawsSectionConfig,
  EventRafflesSectionConfig,
  CollectionCardsSectionConfig,
} from "../schemas";
import type { ProductItem } from "../../products/types";
import type { StoreListItem } from "../../stores/types";
import type { CategoryItem } from "../../categories/types";
import type { BlogPost } from "../../blog/types";
import type { EventItem } from "../../events/types";
import type { CategoryDocument } from "../../categories/schemas";

export interface SectionData {
  products?: ProductItem[];
  auctions?: ProductItem[];
  preOrders?: ProductItem[];
  stores?: StoreListItem[];
  categories?: CategoryItem[];
  brands?: CategoryItem[];
  // S-SBUNI-3 2026-05-13 — featured bundles (CategoryDocument w/ categoryType:"bundle")
  bundles?: CategoryDocument[];
  blog?: BlogPost[];
  events?: EventItem[];
}

export interface MarketplaceHomepageViewAdSlots {
  afterHero?: React.ReactNode;
  afterFeaturedProducts?: React.ReactNode;
  afterReviews?: React.ReactNode;
  afterFAQ?: React.ReactNode;
}

export type FaqItem = { id: string; question: string; answer: string; category: string };

/**
 * Consumer's site identity.
 *
 * appkit is a library and must not compile a consumer's brand into itself —
 * the renderer used to hardcode `brandLogoText="LIR"` and
 * `"Why Buyers Trust LetItRip"`. The consumer passes this from whatever single
 * source it already uses for site identity, so there is no second definition
 * to drift.
 */
export interface HomepageBrand {
  /** Full display name, e.g. used in "Why Buyers Trust {name}". */
  name?: string;
  /** Short mark shown in the hero panel, e.g. "LT". */
  shortName?: string;
}

const AD_SLOT_MAP: Record<string, keyof MarketplaceHomepageViewAdSlots> = {
  carousel: "afterHero",
  products: "afterFeaturedProducts",
  reviews: "afterReviews",
  faq: "afterFAQ",
};

function renderSectionElement(
  section: HomepageSectionDocument,
  newsletterFormSlot: React.ReactNode,
  faqItems: FaqItem[],
  slides: CarouselSlide[],
  liveStats: LiveStatsMap,
  sectionData: SectionData,
  brand: HomepageBrand | undefined,
): React.ReactNode {
  const { type, config } = section;

  switch (type) {
    case "carousel": {
      const cfg = config as CarouselSectionConfig;
      return (
        <HeroCarousel
          initialSlides={slides}
          title={cfg?.title}
          height={cfg?.height}
          defaultAutoplayDelayMs={cfg?.defaultAutoplayDelayMs}
          pauseOnHover={cfg?.pauseOnHover}
          showDots={cfg?.showDots}
          showArrows={cfg?.showArrows}
        />
      );
    }

    case "welcome": {
      const cfg = config as WelcomeSectionConfig;
      return (
        <WelcomeSection
          title={cleanTitle(cfg?.h1) || SECTION_TITLE.welcome}
          // A real `subtitle` wins; `description` is the legacy source and is
          // still parsed for documents that only carry it.
          subtitle={cfg?.subtitle?.trim() || parseWelcomeDescription(cfg?.description)}
          pillLabel={cfg?.pillLabel || SECTION_COPY.welcomePill}
          showCTA={cfg?.showCTA ?? true}
          ctaLabel={cfg?.ctaText || SECTION_COPY.welcomePrimaryCta}
          ctaHref={cfg?.ctaLink || ROUTES.PUBLIC.PRODUCTS}
          secondaryCtaLabel={cfg?.secondaryCtaText || SECTION_COPY.welcomeSecondaryCta}
          secondaryCtaHref={cfg?.secondaryCtaLink || ROUTES.PUBLIC.PRODUCTS}
          trustChips={[...WELCOME_TRUST_CHIPS]}
          brandLogoText={brand?.shortName}
        />
      );
    }

    case "categories": {
      const cfg = config as CategoriesSectionConfig;
      return (
        <ShopByCategorySection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.categories}
          viewMoreHref={ROUTES.PUBLIC.CATEGORIES}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.categories}
          initialItems={sectionData.categories}
          limit={cfg?.maxCategories}
          cta={cfg?.cta}
          filters={cfg?.filters}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "stats": {
      const cfg = config as StatsSectionConfig;
      const stats = Array.isArray(cfg?.stats)
        ? cfg.stats
            .filter(
              (item) =>
                typeof item?.label === "string" &&
                item.label.trim().length > 0 &&
                typeof item?.value === "string" &&
                item.value.trim().length > 0,
            )
            .map((item, index) => {
              const isLive =
                item.source === "live" ||
                item.source === "live-preset" ||
                item.source === "live-collection";
              const liveRaw = isLive ? liveStats[item.key] : undefined;
              const displayValue =
                liveRaw !== undefined ? liveRaw + (item.suffix ?? "") : item.value;
              return {
                key:
                  typeof item?.key === "string" && item.key.trim().length > 0
                    ? item.key
                    : `stat-${index}`,
                label: item.label,
                value: displayValue,
              };
            })
        : [];
      if (stats.length === 0) return null;
      return <StatsCounterSection stats={stats} title={cleanTitle(cfg?.title)} />;
    }

    case "products": {
      const cfg = config as ProductsSectionConfig;
      return (
        <FeaturedProductsSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.products}
          description={cfg?.subtitle}
          viewMoreHref={ROUTES.PUBLIC.PRODUCTS}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.products}
          filterByBrand={cfg?.filterByBrand}
          initialItems={sectionData.products}
          rows={cfg?.rows}
          // `maxProducts` is what the admin builder's "Max items" input writes;
          // `maxItems` is the schema's own name. The two never met, so the
          // control had no effect. Read both, newest name first.
          maxItems={cfg?.maxItems ?? cfg?.maxProducts}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "auctions": {
      const cfg = config as AuctionsSectionConfig;
      return (
        <FeaturedAuctionsSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.auctions}
          description={cfg?.subtitle}
          viewMoreHref={ROUTES.PUBLIC.AUCTIONS}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.auctions}
          filterByBrand={cfg?.filterByBrand}
          initialItems={sectionData.auctions}
          rows={cfg?.rows}
          maxItems={cfg?.maxAuctions}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "pre-orders": {
      const cfg = config as PreOrdersSectionConfig;
      return (
        <FeaturedPreOrdersSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.preOrders}
          description={cfg?.subtitle}
          viewMoreHref={ROUTES.PUBLIC.PRE_ORDERS}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.preOrders}
          filterByBrand={cfg?.filterByBrand}
          initialItems={sectionData.preOrders}
          rows={cfg?.rows}
          maxItems={cfg?.maxItems}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "stores": {
      const cfg = config as StoresSectionConfig;
      return (
        <FeaturedStoresSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.stores}
          description={cfg?.subtitle}
          viewMoreHref={ROUTES.PUBLIC.STORES}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.stores}
          initialItems={sectionData.stores}
          limit={cfg?.maxStores}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "events": {
      const cfg = config as EventsSectionConfig;
      return (
        <EventsSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.events}
          description={cfg?.subtitle}
          viewMoreHref={ROUTES.PUBLIC.EVENTS}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.events}
          initialItems={sectionData.events}
          limit={cfg?.maxEvents}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "reviews": {
      const cfg = config as ReviewsSectionConfig;
      return (
        <HomepageCustomerReviewsSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.reviews}
          viewMoreHref={ROUTES.PUBLIC.REVIEWS}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.reviews}
          maxReviews={cfg?.maxReviews}
          itemsPerView={cfg?.itemsPerView}
          mobileItemsPerView={cfg?.mobileItemsPerView}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "banner": {
      const cfg = config as BannerSectionConfig;
      // CTAs come from the configured buttons; the component's own neutral
      // defaults fill in when none are set. Previously both labels and both
      // hrefs were hardcoded here and `buttons[]` was ignored entirely.
      const [primaryBtn, secondaryBtn] = cfg?.buttons ?? [];
      return (
        <CTABannerSection
          title={cfg?.content?.title || SECTION_TITLE.banner}
          subtitle={cfg?.content?.subtitle}
          description={cfg?.content?.description}
          height={cfg?.height}
          backgroundImage={cfg?.backgroundImage}
          primaryLabel={primaryBtn?.text}
          primaryHref={primaryBtn?.link}
          secondaryLabel={secondaryBtn?.text}
          secondaryHref={secondaryBtn?.link}
        />
      );
    }

    case "trust-indicators": {
      const cfg = config as TrustIndicatorsSectionConfig;
      const configured = (cfg?.indicators ?? [])
        .filter((ind) => ind?.title?.trim())
        .map((ind) => ({
          key: ind.id,
          iconName: ind.icon,
          title: ind.title,
          description: ind.description,
        }));
      return (
        <TrustFeaturesSection
          title={
            cleanTitle(cfg?.title) ||
            (brand?.name ? `Why Buyers Trust ${brand.name}` : SECTION_TITLE.trustIndicators)
          }
          items={configured.length > 0 ? configured : DEFAULT_TRUST_FEATURES}
        />
      );
    }

    case "features": {
      const cfg = config as FeaturesSectionConfig;
      // `items` is the real shape; `features: string[]` is the legacy one and
      // becomes title-only cards. Neither reached the component before — it
      // always rendered DEFAULT_SECURITY_ITEMS regardless of config.
      const configured =
        cfg?.items?.filter((item) => item?.title?.trim()) ??
        cfg?.features
          ?.filter((label) => label?.trim())
          .map((label, index) => ({ key: `feature-${index}`, title: label, description: "" })) ??
        [];
      return (
        <SecurityHighlightsSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.features}
          pillLabel={cfg?.pillLabel || SECTION_COPY.featuresPill}
          items={configured.length > 0 ? configured : DEFAULT_SECURITY_ITEMS}
          learnMoreHref={cfg?.learnMoreLink || ROUTES.PUBLIC.SECURITY}
          learnMoreLabel={cfg?.learnMoreLabel || SECTION_COPY.featuresLearnMore}
        />
      );
    }

    case "whatsapp-community": {
      const cfg = config as WhatsAppCommunitySectionConfig;
      return (
        <WhatsAppCommunitySection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.whatsappCommunity}
          descriptionHtml={cfg?.description || SECTION_COPY.whatsappDescription}
          // No `|| 5000` fallback: inventing a member count the site cannot
          // verify is a fabricated social-proof number.
          memberCount={cfg?.memberCount}
          groupLink={cfg?.groupLink || "https://chat.whatsapp.com/"}
          benefits={cfg?.benefits ?? []}
          testimonial={cfg?.testimonial}
          buttonText={cfg?.buttonText}
        />
      );
    }

    case "faq": {
      const cfg = config as FAQSectionConfig;
      if (!cfg?.showOnHomepage || faqItems.length === 0) return null;

      // Build tabs from configured visibleTabs (or all categories in config)
      const tabCategories = (cfg?.visibleTabs?.length ? cfg.visibleTabs : cfg?.categories) ?? [];
      const tabs = tabCategories.map((cat) => ({
        value: cat,
        label: FAQ_CATEGORY_LABELS[cat] ?? cat,
      }));

      const slicedItems = cfg?.displayCount ? faqItems.slice(0, cfg.displayCount) : faqItems;
      const totalFaqs = faqItems.length;
      const hasMore = totalFaqs > slicedItems.length;

      return (
        <FAQSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.faq}
          subtitle={cfg?.subtitle}
          tabs={tabs}
          showCategoryTabs={cfg?.showCategoryTabs ?? false}
          allowMultipleOpen={cfg?.allowMultipleOpen ?? false}
          defaultOpenCount={cfg?.defaultOpenCount ?? 0}
          items={slicedItems}
          viewMoreHref={cfg?.linkToFullPage ? ROUTES.PUBLIC.FAQS : undefined}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.faq}
          hasMore={hasMore}
          moreCount={totalFaqs - slicedItems.length}
        />
      );
    }

    case "blog-articles": {
      const cfg = config as BlogArticlesSectionConfig;
      return (
        <BlogArticlesSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.blogArticles}
          viewMoreHref={ROUTES.BLOG.LIST}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.blogArticles}
          initialItems={sectionData.blog}
          limit={cfg?.maxArticles}
          showReadTime={cfg?.showReadTime}
          showAuthor={cfg?.showAuthor}
          showThumbnails={cfg?.showThumbnails}
        />
      );
    }

    case "newsletter": {
      const cfg = config as NewsletterSectionConfig;
      return (
        <NewsletterSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.newsletter}
          subtitle={cfg?.description}
          privacyLabel={cfg?.privacyText}
          privacyHref={cfg?.privacyLink}
          renderForm={() => newsletterFormSlot ?? null}
        />
      );
    }

    case "brands": {
      const cfg = config as BrandsSectionConfig;
      return (
        <BrandsSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.brands}
          subtitle={cfg?.subtitle}
          limit={cfg?.maxBrands || 12}
          viewMoreHref={ROUTES.PUBLIC.CATEGORIES}
          viewMoreLabel={cfg?.viewMoreLabel || VIEW_MORE_LABEL.brands}
          initialItems={sectionData.brands}
          cta={cfg?.cta}
          filters={cfg?.filters}
          autoScroll={cfg?.autoScroll}
          scrollInterval={cfg?.scrollInterval}
          loop={cfg?.loop}
        />
      );
    }

    case "social-feed": {
      const cfg = config as SocialFeedSectionConfig;
      const hasStaticPosts = Array.isArray(cfg?.posts) && cfg.posts.length > 0;
      if (!cfg?.platform || (!cfg?.handle && !hasStaticPosts)) return null;
      return (
        <SocialFeedSection
          title={cleanTitle(cfg.title) || ""}
          subtitle={cfg.subtitle}
          platform={cfg.platform}
          handle={cfg.handle ?? ""}
          postType={cfg.postType || "all"}
          count={cfg.count || 9}
          layout={cfg.layout || "grid"}
          showCaption={cfg.showCaption ?? true}
          showStats={cfg.showStats ?? true}
          posts={cfg.posts}
        />
      );
    }

    case "custom-cards": {
      const cfg = config as CustomCardsSectionConfig;
      if (!cfg?.cards?.length) return null;
      return (
        <CustomCardsSection
          title={cleanTitle(cfg.title)}
          layout={cfg.layout ?? "grid"}
          columns={cfg.columns ?? 3}
          cards={cfg.cards}
          autoScroll={cfg.autoScroll}
          scrollIntervalMs={cfg.scrollIntervalMs}
          loop={cfg.loop}
        />
      );
    }

    case "google-reviews": {
      const cfg = config as GoogleReviewsSectionConfig;
      return (
        <GoogleReviewsSection
          placeId={cfg?.placeId ?? ""}
          maxReviews={cfg?.maxReviews ?? 6}
          minRating={cfg?.minRating ?? 0}
          layout={cfg?.layout ?? "grid"}
          showRating={cfg?.showRating ?? true}
          showDate={cfg?.showDate ?? true}
          linkToGoogleMaps={cfg?.linkToGoogleMaps ?? true}
          googleMapsUrl={cfg?.googleMapsUrl}
        />
      );
    }

    case "featured-bundles": {
      const cfg = config as FeaturedBundlesSectionConfig;
      return (
        <FeaturedBundlesSection
          title={cleanTitle(cfg?.title) || SECTION_TITLE.featuredBundles}
          description={cfg?.subtitle}
          initialItems={sectionData.bundles}
          maxItems={cfg?.maxItems}
          showSavingsBadge={cfg?.showSavingsBadge}
          viewMoreLabel={cfg?.viewMoreLabel}
        />
      );
    }

    case "prize-draws": {
      const cfg = config as PrizeDrawsSectionConfig;
      return <PrizeDrawsSection config={cfg ?? {}} />;
    }

    case "event-raffles": {
      const cfg = config as EventRafflesSectionConfig;
      return <EventRafflesSection config={cfg ?? {}} />;
    }

    case "collection-cards": {
      const cfg = config as CollectionCardsSectionConfig;
      return (
        <CollectionCardsSection
          config={cfg ?? { collections: [] }}
        />
      );
    }

    default:
      return null;
  }
}

export function renderSection(
  section: HomepageSectionDocument,
  adSlots: MarketplaceHomepageViewAdSlots | undefined,
  newsletterFormSlot: React.ReactNode,
  faqItems: FaqItem[],
  slides: CarouselSlide[],
  liveStats: LiveStatsMap,
  sectionData: SectionData = {},
  brand?: HomepageBrand,
): React.ReactNode {
  const sectionElement = renderSectionElement(
    section,
    newsletterFormSlot,
    faqItems,
    slides,
    liveStats,
    sectionData,
    brand,
  );
  if (!sectionElement) return null;

  const adSlotKey = AD_SLOT_MAP[section.type];
  return (
    <React.Fragment key={section.id}>
      {/* One section must never be able to take down the whole homepage. A
          throw inside any section used to propagate to [locale]/error.tsx and
          replace the entire page — see HomepageSectionBoundary. */}
      <HomepageSectionBoundary sectionId={section.id} sectionType={section.type}>
        {sectionElement}
      </HomepageSectionBoundary>
      {adSlots && adSlotKey !== undefined && adSlotKey in adSlots && adSlots[adSlotKey]}
    </React.Fragment>
  );
}

export { AnnouncementBar, hashBannerMessage };
