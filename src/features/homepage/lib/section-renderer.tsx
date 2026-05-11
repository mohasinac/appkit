import React from "react";
import { ROUTES } from "../../../next";
import { cleanTitle, parseWelcomeDescription } from "./section-helpers";
import { DEFAULT_TRUST_FEATURES, DEFAULT_SECURITY_ITEMS } from "./section-defaults";
import type { LiveStatsMap } from "./live-stats";
import { AnnouncementBar } from "../components/AnnouncementBar";
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
import type { CarouselSlide } from "../types/index";
import type {
  HomepageSectionDocument,
  WelcomeSectionConfig,
  StatsSectionConfig,

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
} from "../schemas";
import type { ProductItem } from "../../products/types";
import type { StoreListItem } from "../../stores/types";
import type { CategoryItem } from "../../categories/types";
import type { BlogPost } from "../../blog/types";
import type { EventItem } from "../../events/types";

export interface SectionData {
  products?: ProductItem[];
  auctions?: ProductItem[];
  preOrders?: ProductItem[];
  stores?: StoreListItem[];
  categories?: CategoryItem[];
  brands?: CategoryItem[];
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
): React.ReactNode {
  const { type, config } = section;

  switch (type) {
    case "carousel":
      return <HeroCarousel initialSlides={slides} />;

    case "welcome": {
      const cfg = config as WelcomeSectionConfig;
      return (
        <WelcomeSection
          title={cleanTitle(cfg?.h1) || "Discover Amazing Products"}
          subtitle={parseWelcomeDescription(cfg?.description)}
          pillLabel="India's #1 Marketplace"
          showCTA={cfg?.showCTA ?? true}
          ctaLabel={cfg?.ctaText || "Shop Now"}
          ctaHref={cfg?.ctaLink || ROUTES.PUBLIC.PRODUCTS}
          secondaryCtaLabel="Browse All"
          secondaryCtaHref={ROUTES.PUBLIC.PRODUCTS}
          trustChips={[
            { key: "delivery", emoji: "🚀", label: "Fast Delivery" },
            { key: "secure", emoji: "🔒", label: "Secure Payments" },
            { key: "rating", emoji: "⭐", label: "4.8+ Rated" },
            { key: "returns", emoji: "↩️", label: "Easy Returns" },
          ]}
          brandLogoText="LIR"
        />
      );
    }

    case "categories": {
      const cfg = config as CategoriesSectionConfig;
      return (
        <ShopByCategorySection
          title={cleanTitle(cfg?.title) || "Shop by Category"}
          viewMoreHref={ROUTES.PUBLIC.CATEGORIES}
          viewMoreLabel="All categories →"
          initialItems={sectionData.categories}
          cta={cfg?.cta}
          filters={cfg?.filters}
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
      return <StatsCounterSection stats={stats} />;
    }

    case "products": {
      const cfg = config as ProductsSectionConfig;
      return (
        <FeaturedProductsSection
          title={cleanTitle(cfg?.title) || "Featured Products"}
          viewMoreHref={ROUTES.PUBLIC.PRODUCTS}
          viewMoreLabel="View all products →"
          filterByBrand={cfg?.filterByBrand}
          initialItems={sectionData.products}
        />
      );
    }

    case "auctions": {
      const cfg = config as AuctionsSectionConfig;
      return (
        <FeaturedAuctionsSection
          title={cleanTitle(cfg?.title) || "Live Auctions"}
          viewMoreHref={ROUTES.PUBLIC.AUCTIONS}
          viewMoreLabel="View all auctions →"
          filterByBrand={cfg?.filterByBrand}
          initialItems={sectionData.auctions}
        />
      );
    }

    case "pre-orders": {
      const cfg = config as PreOrdersSectionConfig;
      return (
        <FeaturedPreOrdersSection
          title={cleanTitle(cfg?.title) || "Reserve Before It Ships"}
          viewMoreHref={ROUTES.PUBLIC.PRE_ORDERS}
          viewMoreLabel="View all pre-orders →"
          filterByBrand={cfg?.filterByBrand}
          initialItems={sectionData.preOrders}
        />
      );
    }

    case "stores": {
      const cfg = config as StoresSectionConfig;
      return (
        <FeaturedStoresSection
          title={cleanTitle(cfg?.title) || "Featured Stores"}
          viewMoreHref={ROUTES.PUBLIC.STORES}
          viewMoreLabel="View all stores →"
          initialItems={sectionData.stores}
        />
      );
    }

    case "events": {
      const cfg = config as EventsSectionConfig;
      return (
        <EventsSection
          title={cleanTitle(cfg?.title) || "Events & Offers"}
          viewMoreHref={ROUTES.PUBLIC.EVENTS}
          viewMoreLabel="View all events →"
          initialItems={sectionData.events}
        />
      );
    }

    case "reviews": {
      const cfg = config as ReviewsSectionConfig;
      return (
        <HomepageCustomerReviewsSection
          title={cleanTitle(cfg?.title) || "What Our Customers Say"}
          viewMoreHref={ROUTES.PUBLIC.REVIEWS}
          viewMoreLabel="See all reviews →"
        />
      );
    }

    case "banner": {
      const cfg = config as BannerSectionConfig;
      return (
        <CTABannerSection
          title={cfg?.content?.title || "Thousands of collectibles. One marketplace."}
          primaryLabel="Shop All Products →"
          primaryHref={ROUTES.PUBLIC.PRODUCTS}
          secondaryLabel="Browse Auctions →"
          secondaryHref={ROUTES.PUBLIC.AUCTIONS}
        />
      );
    }

    case "trust-indicators": {
      const cfg = config as TrustIndicatorsSectionConfig;
      return (
        <TrustFeaturesSection
          title={cleanTitle(cfg?.title) || "Why Buyers Trust LetItRip"}
          items={DEFAULT_TRUST_FEATURES}
        />
      );
    }

    case "features": {
      const cfg = config as FeaturesSectionConfig;
      return (
        <SecurityHighlightsSection
          title={cleanTitle(cfg?.title) || "Security You Can Trust"}
          pillLabel="Built for trust"
          items={DEFAULT_SECURITY_ITEMS}
          learnMoreHref={ROUTES.PUBLIC.SECURITY}
          learnMoreLabel="Learn about our security →"
        />
      );
    }

    case "whatsapp-community": {
      const cfg = config as WhatsAppCommunitySectionConfig;
      return (
        <WhatsAppCommunitySection
          title={cleanTitle(cfg?.title) || "Join Our WhatsApp Community"}
          descriptionHtml={cfg?.description || "5,000+ members. Get deal alerts, auction updates, and exclusive drops before anyone else."}
          memberCount={cfg?.memberCount || 5000}
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
      const FAQ_CATEGORY_LABELS: Record<string, string> = {
        general: "General",
        orders_payment: "Orders & Payment",
        shipping_delivery: "Shipping",
        returns_refunds: "Returns & Refunds",
        product_information: "Products",
        account_security: "Account",
        technical_support: "Support",
      };
      const tabs = tabCategories.map((cat) => ({
        value: cat,
        label: FAQ_CATEGORY_LABELS[cat] ?? cat,
      }));

      const slicedItems = cfg?.displayCount ? faqItems.slice(0, cfg.displayCount) : faqItems;
      const totalFaqs = faqItems.length;
      const hasMore = totalFaqs > slicedItems.length;

      return (
        <FAQSection
          title={cleanTitle(cfg?.title) || "Frequently Asked Questions"}
          subtitle={cfg?.subtitle}
          tabs={tabs}
          showCategoryTabs={cfg?.showCategoryTabs ?? false}
          allowMultipleOpen={cfg?.allowMultipleOpen ?? false}
          defaultOpenCount={cfg?.defaultOpenCount ?? 0}
          items={slicedItems}
          viewMoreHref={cfg?.linkToFullPage ? ROUTES.PUBLIC.FAQS : undefined}
          viewMoreLabel="View all FAQs →"
          hasMore={hasMore}
          moreCount={totalFaqs - slicedItems.length}
        />
      );
    }

    case "blog-articles": {
      const cfg = config as BlogArticlesSectionConfig;
      return (
        <BlogArticlesSection
          title={cleanTitle(cfg?.title) || "From Our Blog"}
          viewMoreHref={ROUTES.BLOG.LIST}
          viewMoreLabel="View all posts →"
          initialItems={sectionData.blog}
        />
      );
    }

    case "newsletter": {
      const cfg = config as NewsletterSectionConfig;
      return (
        <NewsletterSection
          title={cleanTitle(cfg?.title) || "Stay Updated"}
          subtitle={cfg?.description || "Get the latest drops, auctions, and deals in your inbox."}
          renderForm={() => newsletterFormSlot ?? null}
        />
      );
    }

    case "brands": {
      const cfg = config as BrandsSectionConfig;
      return (
        <BrandsSection
          title={cleanTitle(cfg?.title) || "Top Brands"}
          subtitle={cfg?.subtitle}
          limit={cfg?.maxBrands || 12}
          viewMoreHref={ROUTES.PUBLIC.CATEGORIES}
          viewMoreLabel="All brands →"
          initialItems={sectionData.brands}
          cta={cfg?.cta}
          filters={cfg?.filters}
        />
      );
    }

    case "social-feed": {
      const cfg = config as SocialFeedSectionConfig;
      if (!cfg?.platform || !cfg?.handle) return null;
      return (
        <SocialFeedSection
          title={cleanTitle(cfg.title) || ""}
          subtitle={cfg.subtitle}
          platform={cfg.platform}
          handle={cfg.handle}
          postType={cfg.postType || "all"}
          count={cfg.count || 9}
          layout={cfg.layout || "grid"}
          showCaption={cfg.showCaption ?? true}
          showStats={cfg.showStats ?? true}
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
): React.ReactNode {
  const sectionElement = renderSectionElement(
    section,
    newsletterFormSlot,
    faqItems,
    slides,
    liveStats,
    sectionData,
  );
  if (!sectionElement) return null;

  const adSlotKey = AD_SLOT_MAP[section.type];
  return (
    <React.Fragment key={section.id}>
      {sectionElement}
      {adSlots && adSlotKey !== undefined && adSlotKey in adSlots && adSlots[adSlotKey]}
    </React.Fragment>
  );
}

export { AnnouncementBar };
