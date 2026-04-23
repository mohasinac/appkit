import { getDefaultPhonePrefix, getSeedLocale } from "./seed-market-config";

const _phonePrefix = getDefaultPhonePrefix();
const _locale = getSeedLocale();

/**
 * Site Settings Seed Data
 * Global site configuration (singleton document)
 */

import type { SiteSettingsDocument } from "../features/admin/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const adPlacementsSeed = [
  {
    id: "homepage-hero-banner",
    label: "Homepage Hero Banner",
    enabled: true,
    reservedHeight: 90,
  },
  {
    id: "listing-sidebar-top",
    label: "Listing Sidebar Top",
    enabled: true,
    reservedHeight: 90,
  },
  {
    id: "listing-sidebar-bottom",
    label: "Listing Sidebar Bottom",
    enabled: true,
    reservedHeight: 90,
  },
  {
    id: "search-inline",
    label: "Search Inline",
    enabled: true,
    reservedHeight: 90,
  },
] as const;

export const siteSettingsSeedData: Partial<SiteSettingsDocument> & {
  adSettings: {
    consentRequired: boolean;
    placements: readonly {
      id: string;
      label: string;
      enabled: boolean;
      reservedHeight: number;
    }[];
    providerCredentials: {
      adsenseClientId: string;
      thirdPartyScriptUrl: string;
    };
    inventory: {
      id: string;
      name: string;
      provider: "manual" | "adsense" | "thirdParty";
      status: "draft" | "active" | "scheduled" | "paused";
      placementIds: string[];
      requiresConsent: boolean;
      priority: number;
      startAt?: string;
      endAt?: string;
      createdAt: string;
      updatedAt: string;
      updatedBy: string;
      creative: {
        title?: string;
        body?: string;
        imageUrl?: string;
        ctaLabel?: string;
        ctaHref?: string;
        adsenseSlot?: string;
        thirdPartyUrl?: string;
      };
    }[];
  };
} = {
  id: "global",
  siteName: "LetItRip",
  motto: "India’s Home for Rare Anime Collectibles",
  announcementBar: {
    enabled: true,
    message: "🎉 Up to 15% Off on Pokémon TCG this week — Use code SAVE15",
  },
  logo: {
    url: "/favicon.svg",
    alt: "LetItRip Logo",
    format: "svg",
  },
  background: {
    light: {
      type: "gradient",
      value: "linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)",
      overlay: {
        enabled: false,
        color: "#000000",
        opacity: 0,
      },
    },
    dark: {
      type: "gradient",
      value: "linear-gradient(135deg, #030712 0%, #1f2937 100%)",
      overlay: {
        enabled: false,
        color: "#000000",
        opacity: 0,
      },
    },
  },
  contact: {
    email: "support@letitrip.in",
    phone: `${_phonePrefix}-9876543210`,
    address: `123, Marketplace Street, ${_locale.cities[0][0]}, ${_locale.cities[0][1]} - ${_locale.cities[0][2]}, ${_locale.countryName}`,
    upiVpa: "letitrip@upi",
    whatsappNumber: `${_phonePrefix.replace(/[^+\d]/g, "")}9876543210`,
  },
  payment: {
    razorpayEnabled: true,
    upiManualEnabled: true,
    codEnabled: false,
  },
  socialLinks: {
    facebook: "https://facebook.com/letitrip",
    twitter: "https://twitter.com/letitrip",
    instagram: "https://instagram.com/letitrip",
    linkedin: "https://linkedin.com/company/letitrip",
  },
  emailSettings: {
    fromName: "LetItRip",
    fromEmail: "noreply@letitrip.in",
    replyTo: "support@letitrip.in",
  },
  seo: {
    defaultTitle:
      "LetItRip — Anime Figures, Auctions & Rare Collectibles Marketplace",
    defaultDescription:
      "Shop rare anime figures, Nendoroids, Gunpla, Pok\u00e9mon TCG, and cosplay on India\u2019s premier otaku marketplace. Live auctions, pre-orders, and verified sellers.",
    keywords: [
      "anime figures",
      "nendoroid",
      "gunpla",
      "scale figures",
      "cosplay",
      "pokemon tcg",
      "trading cards",
      "pre-orders",
      "live auction",
      "otaku marketplace",
      "anime collectibles india",
      "figure import india",
    ],
    ogImage: "https://picsum.photos/seed/letitrip-anime-og/1200/630",
  },
  features: [
    {
      id: "feature_001",
      name: "Huge Catalogue",
      description: "1000+ Anime Figures & Collectibles",
      icon: "📦",
      enabled: true,
    },
    {
      id: "feature_002",
      name: "Fast Shipping",
      description: "Delivered in 3–5 Days Across India",
      icon: "🚚",
      enabled: true,
    },
    {
      id: "feature_003",
      name: "Authentic Only",
      description: "Verified Genuine Anime Merchandise",
      icon: "✅",
      enabled: true,
    },
    {
      id: "feature_004",
      name: "Secure Payments",
      description: "Safe & Encrypted Transactions",
      icon: "🔒",
      enabled: true,
    },
    {
      id: "feature_005",
      name: "Live Auctions",
      description: "Bid on Rare & Exclusive Figures",
      icon: "🏆",
      enabled: true,
    },
    {
      id: "feature_006",
      name: "Pre-Orders",
      description: "Reserve Upcoming Figure Releases",
      icon: "⏳",
      enabled: true,
    },
  ],
  legalPages: {
    termsOfService: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Terms of Service" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Welcome to LetItRip. By accessing our platform, you agree to these terms...",
            },
          ],
        },
      ],
    }),
    privacyPolicy: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Privacy Policy" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Your privacy is important to us. This policy describes how we collect and use your data...",
            },
          ],
        },
      ],
    }),
    refundPolicy: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Refund Policy" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "We offer a 7-day return and refund policy on most products. Items must be in original condition...",
            },
          ],
        },
      ],
    }),
    shippingPolicy: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Shipping Policy" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "We offer free shipping on orders above ₹999. Standard delivery takes 3-5 business days...",
            },
          ],
        },
      ],
    }),
  },
  shipping: {
    estimatedDays: 5,
    minOrderForFree: 999,
  },
  returns: {
    windowDays: 7,
  },
  faq: {
    variables: {
      shippingDays: 5,
      minOrderValue: 999,
      returnWindow: 7,
      supportEmail: "support@letitrip.in",
      supportPhone: `${_phonePrefix}-9876543210`,
      codDeposit: 0.1, // 10%
    },
  },
  createdAt: daysAgo(799),
  updatedAt: daysAgo(29),
  navbarConfig: {
    hiddenNavItems: [], // show all nav items by default
  },
  footerConfig: {
    trustBar: {
      enabled: true,
      items: [
        { icon: "🚚", label: "Free Shipping", visible: true },
        { icon: "🔄", label: "Easy Returns", visible: true },
        { icon: "🔒", label: "Secure Payment", visible: true },
        { icon: "🎧", label: "24/7 Support", visible: true },
        { icon: "✅", label: "Authentic Sellers", visible: true },
      ],
    },
    newsletterEnabled: true,
  },
  adSettings: {
    consentRequired: true,
    placements: adPlacementsSeed,
    providerCredentials: {
      adsenseClientId: "ca-pub-0000000000000000",
      thirdPartyScriptUrl: "https://cdn.example-ads.com/ad-runtime.js",
    },
    inventory: [
      {
        id: "ad-homepage-hero-anicon",
        name: "AniCon Hero Banner",
        provider: "manual",
        status: "active",
        placementIds: ["homepage-hero-banner"],
        requiresConsent: true,
        priority: 100,
        createdAt: daysAgo(20).toISOString(),
        updatedAt: daysAgo(2).toISOString(),
        updatedBy: "user-admin-user-admin",
        creative: {
          title: "AniCon 2026 Mega Drop",
          body: "Limited card drops and weekend-only collectibles.",
          imageUrl: "https://picsum.photos/seed/anicon-hero-ad/1200/300",
          ctaLabel: "Explore Deals",
          ctaHref: "/promotions/deals",
        },
      },
      {
        id: "ad-listing-sidebar-boost",
        name: "Sidebar Seller Boost",
        provider: "manual",
        status: "active",
        placementIds: ["listing-sidebar-top", "listing-sidebar-bottom"],
        requiresConsent: true,
        priority: 80,
        createdAt: daysAgo(12).toISOString(),
        updatedAt: daysAgo(1).toISOString(),
        updatedBy: "user-admin-user-admin",
        creative: {
          title: "Boosted Listings",
          body: "Promoted auctions ending this week.",
          imageUrl: "https://picsum.photos/seed/sidebar-ad-boost/600/300",
          ctaLabel: "View Auctions",
          ctaHref: "/auctions",
        },
      },
      {
        id: "ad-search-inline-spotlight",
        name: "Search Spotlight Slot",
        provider: "manual",
        status: "scheduled",
        placementIds: ["search-inline"],
        requiresConsent: true,
        priority: 70,
        startAt: daysAgo(-3).toISOString(),
        endAt: daysAgo(-10).toISOString(),
        createdAt: daysAgo(1).toISOString(),
        updatedAt: daysAgo(1).toISOString(),
        updatedBy: "user-admin-user-admin",
        creative: {
          title: "Search Spotlight",
          body: "Sponsored picks based on active search filters.",
          imageUrl: "https://picsum.photos/seed/search-spotlight-ad/960/240",
          ctaLabel: "Browse Sponsored",
          ctaHref: "/search/pokemon/tab/products/sort/relevance/page/1",
        },
      },
    ],
  },
  commissions: {
    razorpayFeePercent: 2,
    codDepositPercent: 10,
    sellerShippingFixed: 0,
    platformShippingPercent: 0,
    platformShippingFixedMin: 0,
    processingFeePercent: 0,
    gstPercent: 18,
    gatewayFeePercent: 2,
    autoPayoutWindowDays: 7,
  },
  featureFlags: {
    chats: true,
    smsVerification: false,
    translations: false,
    wishlists: true,
    auctions: true,
    reviews: true,
    events: true,
    blog: true,
    coupons: true,
    notifications: true,
    sellerRegistration: true,
    preOrders: true,
  },
};
