import React from "react";
import { Main } from "../../../ui";
import { carouselRepository, faqsRepository, siteSettingsRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { AnnouncementBar } from "./AnnouncementBar";
import { HeroCarousel } from "./HeroCarousel";
import { StatsCounterSection } from "./StatsCounterSection";
import { TrustFeaturesSection } from "./TrustFeaturesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { ShopByCategorySection } from "./ShopByCategorySection";
import { FeaturedProductsSection } from "./FeaturedProductsSection";
import { FeaturedAuctionsSection } from "./FeaturedAuctionsSection";
import { FeaturedPreOrdersSection } from "./FeaturedPreOrdersSection";
import { FeaturedStoresSection } from "./FeaturedStoresSection";
import { EventsSection } from "./EventsSection";
import { CTABannerSection } from "./CTABannerSection";
import { HomepageCustomerReviewsSection } from "./HomepageCustomerReviewsSection";
import { SecurityHighlightsSection } from "./SecurityHighlightsSection";
import { WhatsAppCommunitySection } from "./WhatsAppCommunitySection";
import { FAQSection } from "./FAQSection";
import { NewsletterSection } from "./NewsletterSection";
import { BlogArticlesSection } from "./BlogArticlesSection";
import { WelcomeSection } from "./WelcomeSection";
import { BrandsSection } from "./BrandsSection";
import { SocialFeedSection } from "./SocialFeedSection";
import { CustomCardsSection } from "./CustomCardsSection";
import { GoogleReviewsSection } from "./GoogleReviewsSection";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
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

const DEFAULT_TRUST_FEATURES = [
  {
    iconName: "secure-payments",
    title: "Secure Payments",
    description: "Protected payments with transparent order tracking.",
  },
  {
    iconName: "fast-delivery",
    title: "Fast Delivery",
    description: "Fast shipping with reliable nationwide logistics partners.",
  },
  {
    iconName: "easy-returns",
    title: "Easy Returns",
    description: "Hassle-free returns within the policy window.",
  },
  {
    iconName: "support",
    title: "24/7 Support",
    description: "Real help from our team across pre and post purchase.",
  },
];

const DEFAULT_HOW_IT_WORKS = [
  {
    number: 1,
    title: "Browse & Discover",
    desc: "Search 10,000+ listings across products, auctions, and pre-orders.",
  },
  {
    number: 2,
    title: "Bid or Buy Now",
    desc: "Place a bid on live auctions or buy instantly at the listed price.",
  },
  {
    number: 3,
    title: "Get Delivered",
    desc: "Track your order end-to-end until it arrives at your door.",
  },
];

const DEFAULT_SECURITY_ITEMS = [
  {
    key: "encryption",
    title: "End-to-End Encryption",
    description: "All sensitive data is encrypted in transit and at rest.",
  },
  {
    key: "tls",
    title: "TLS 1.3 in Transit",
    description: "Every API call and page load is secured with modern TLS.",
  },
  {
    key: "rbac",
    title: "Role-Based Access",
    description: "Strict role boundaries keep buyer, seller, and admin data separate.",
  },
  {
    key: "min-priv",
    title: "Minimum-Privilege Tokens",
    description: "Short-lived, scoped tokens minimise exposure on every request.",
  },
];

// --- Helpers -----------------------------------------------------------------

/** Strip leading emoji/symbols that admins sometimes prefix onto DB titles. */
function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const cleaned = raw.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return cleaned || raw;
}

function parseWelcomeDescription(description: string | undefined): string {
  if (!description) return "";
  try {
    const parsed = JSON.parse(description) as {
      content?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const extracted = parsed.content
      ?.flatMap((node) => node.content ?? [])
      .map((leaf) => leaf.text ?? "")
      .join(" ")
      .trim();
    return extracted || description;
  } catch {
    return description;
  }
}

/**
 * Render a single homepage section based on its type and config
 */
const AD_SLOT_MAP: Record<string, string> = {
  carousel: "afterHero",
  products: "afterFeaturedProducts",
  reviews: "afterReviews",
  faq: "afterFAQ",
};

function renderSection(
  section: HomepageSectionDocument,
  adSlots: MarketplaceHomepageViewAdSlots | undefined,
  newsletterFormSlot: React.ReactNode,
  faqItems: Array<{ id: string; question: string; answer: string }>,
  slides: any[],
): React.ReactNode {
  const { type, config } = section;
  const adSlotKey = AD_SLOT_MAP[type] as keyof MarketplaceHomepageViewAdSlots | undefined;

  const sectionElement = (() => {
    switch (type) {
      case "carousel":
        return <HeroCarousel initialSlides={slides} />;

      case "welcome": {
        const cfg = config as WelcomeSectionConfig;
        const title = cleanTitle(cfg?.h1) || "Discover Amazing Products";
        const subtitle = parseWelcomeDescription(cfg?.description);
        const ctaText = cfg?.ctaText || "Shop Now";
        const ctaLink = cfg?.ctaLink || ROUTES.PUBLIC.PRODUCTS;
        return (
          <WelcomeSection
            title={title}
            subtitle={subtitle}
            pillLabel="India's #1 Marketplace"
            showCTA={cfg?.showCTA ?? true}
            ctaLabel={ctaText}
            ctaHref={ctaLink}
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
              .map((item, index) => ({
                key:
                  typeof item?.key === "string" && item.key.trim().length > 0
                    ? item.key
                    : `stat-${index}`,
                label: item.label,
                value: item.value,
              }))
          : [];
        if (stats.length === 0) {
          return null;
        }
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
            title={cleanTitle(cfg?.title) || "Why Buyers Trust LetiTrip"}
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
          />
        );
      }

      case "faq": {
        const cfg = config as FAQSectionConfig;
        if (!cfg?.showOnHomepage || faqItems.length === 0) {
          return null;
        }
        return (
          <FAQSection
            title={cleanTitle(cfg?.title) || "Frequently Asked Questions"}
            tabs={[]}
            activeTab=""
            items={faqItems}
            viewMoreHref={ROUTES.PUBLIC.FAQS}
            viewMoreLabel="View all FAQs →"
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
  })();

  // Return section with optional ad slot before it
  if (!sectionElement) {
    return null;
  }

  return (
    <React.Fragment key={section.id}>
      {sectionElement}
      {adSlots && adSlotKey !== undefined && adSlotKey in adSlots && adSlots[adSlotKey]}
    </React.Fragment>
  );
}



// --- View Props ---------------------------------------------------------------

export interface MarketplaceHomepageViewAdSlots {
  /** Rendered immediately after the hero carousel. Good for a full-width banner. */
  afterHero?: React.ReactNode;
  /** Rendered between featured products and featured auctions. */
  afterFeaturedProducts?: React.ReactNode;
  /** Rendered after the customer reviews section. */
  afterReviews?: React.ReactNode;
  /** Rendered after the FAQ section. */
  afterFAQ?: React.ReactNode;
}

export interface MarketplaceHomepageViewProps {
  /**
   * Optional ad slot content injected at key positions in the homepage.
   * Pass `<AdSlot id="..." />` as values; they render nothing when the slot
   * is not configured or consent hasn't been granted.
   */
  adSlots?: MarketplaceHomepageViewAdSlots;
  /**
   * Optional newsletter form content for homepage section #16.
   * Provide a client component wired to live subscribe actions/API.
   */
  newsletterFormSlot?: React.ReactNode;
}

// --- Main View ---------------------------------------------------------------

export async function MarketplaceHomepageView({
  adSlots,
  newsletterFormSlot,
}: MarketplaceHomepageViewProps = {}) {
  // Load carousel slides and sections from DB
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

  // Render with dynamic sections from DB
  return (
    <Main>
      {showAnnouncement ? <AnnouncementBar message={announcementMessage} /> : null}
      {orderedSections.map((section) =>
        renderSection(section, adSlots, newsletterFormSlot ?? null, faqItems, slides as any[]),
      )}
    </Main>
  );
}
