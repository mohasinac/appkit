/*
 * WHY: Seeds the singleton site-settings doc for YGO marketplace.
 * WHAT: 1 document — branding, SEO, features, legal, commissions, credentials, ad inventory.
 *
 * EXPORTS:
 *   siteSettingsSeedData — Partial<SiteSettingsDocument> for seed runner
 *
 * @tag domain:site-settings,admin
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { getDefaultPhonePrefix, getSeedLocale } from "./seed-market-config";

const _phonePrefix = getDefaultPhonePrefix();
const _locale = getSeedLocale();

import type { SiteSettingsDocument } from "../features/admin/schemas";

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
  motto: "India's #1 Yu-Gi-Oh! Collectibles Marketplace — Singles · Sealed · Graded Slabs · Accessories",
  announcementBar: {
    enabled: true,
    message: "🎉 Up to 25% off LOB singles + Free deck box with 2 sealed booster boxes — See Events for codes",
  },
  watermark: {
    type: "text",
    text: "letitrip.in",
    imageUrl: "",
    size: 30,
    opacity: 20,
  },
  logo: {
    url: "",
    alt: "LetItRip Logo",
    format: "svg",
  },
  background: {
    light: {
      type: "gradient",
      value: "linear-gradient(135deg, #f0f4ff 0%, #f9fafb 100%)",
      overlay: {
        enabled: false,
        color: "#000000",
        opacity: 0,
      },
    },
    dark: {
      type: "gradient",
      value: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
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
      "LetItRip — Yu-Gi-Oh! Singles, Sealed Booster Boxes, PSA Graded Slabs | India's YGO Marketplace",
    defaultDescription:
      "Buy, sell, and auction Yu-Gi-Oh! trading cards on India's premier Duel Monsters marketplace. LOB 1st Edition, Blue-Eyes White Dragon, Dark Magician, Exodia — singles, sealed products, PSA/BGS/CGC graded slabs from verified sellers.",
    keywords: [
      "yugioh cards india",
      "yu-gi-oh tcg india",
      "blue-eyes white dragon",
      "dark magician",
      "exodia the forbidden one",
      "lob 1st edition",
      "psa graded slabs",
      "sealed booster box",
      "collectibles marketplace india",
      "live auction yugioh",
      "pre-order konami",
      "duel monsters cards",
    ],
    ogImage: "https://images.ygoprodeck.com/images/cards/cropped/46986414.jpg",
  },
  features: [
    {
      id: "feature_001",
      name: "Huge Catalogue",
      description: "200+ Yu-Gi-Oh! Cards & Sealed Products",
      icon: "📦",
      enabled: true,
    },
    {
      id: "feature_002",
      name: "Fast Shipping",
      description: "Delivered in 3–7 Days Across India",
      icon: "🚚",
      enabled: true,
    },
    {
      id: "feature_003",
      name: "Authentic Only",
      description: "Verified Genuine Konami Products",
      icon: "✅",
      enabled: true,
    },
    {
      id: "feature_004",
      name: "Secure Payments",
      description: "Escrow-Protected Transactions",
      icon: "🔒",
      enabled: true,
    },
    {
      id: "feature_005",
      name: "Live Auctions",
      description: "Bid on Rare & Graded YGO Cards",
      icon: "🏆",
      enabled: true,
    },
    {
      id: "feature_006",
      name: "Pre-Orders",
      description: "Reserve Upcoming Konami Set Releases",
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
              text: "We offer free shipping on orders above ₹999. Standard delivery takes 3-7 business days...",
            },
          ],
        },
      ],
    }),
  },
  shipping: {
    estimatedDays: 7,
    minOrderForFree: 999,
  },
  returns: {
    windowDays: 7,
  },
  faq: {
    variables: {
      shippingDays: 7,
      minOrderValue: 999,
      returnWindow: 7,
      supportEmail: "support@letitrip.in",
      supportPhone: `${_phonePrefix}-9876543210`,
      codDeposit: 0.1,
    },
  },
  createdAt: daysAgo(799),
  updatedAt: daysAgo(29),
  navbarConfig: {
    hiddenNavItems: [],
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
        id: "ad-homepage-hero-ygo-drop",
        name: "YGO Card Drop Hero Banner",
        provider: "manual",
        status: "active",
        placementIds: ["homepage-hero-banner"],
        requiresConsent: true,
        priority: 100,
        createdAt: daysAgo(20).toISOString(),
        updatedAt: daysAgo(2).toISOString(),
        updatedBy: "user-admin-letitrip",
        creative: {
          title: "LOB 1st Edition Mega Drop",
          body: "Limited Legend of Blue Eyes singles and sealed packs — this weekend only.",
          imageUrl: "https://images.ygoprodeck.com/images/cards/cropped/89631139.jpg",
          ctaLabel: "Explore Deals",
          ctaHref: "/promotions/deals",
        },
      },
      {
        id: "ad-listing-sidebar-auction-boost",
        name: "Sidebar Auction Boost",
        provider: "manual",
        status: "active",
        placementIds: ["listing-sidebar-top", "listing-sidebar-bottom"],
        requiresConsent: true,
        priority: 80,
        createdAt: daysAgo(12).toISOString(),
        updatedAt: daysAgo(1).toISOString(),
        updatedBy: "user-admin-letitrip",
        creative: {
          title: "Graded Slab Auctions",
          body: "PSA 10 Blue-Eyes and Dark Magician auctions ending this week.",
          imageUrl: "https://images.ygoprodeck.com/images/cards/cropped/46986414.jpg",
          ctaLabel: "View Auctions",
          ctaHref: "/auctions",
        },
      },
      {
        id: "ad-search-inline-exodia",
        name: "Search Spotlight — Exodia",
        provider: "manual",
        status: "scheduled",
        placementIds: ["search-inline"],
        requiresConsent: true,
        priority: 70,
        startAt: daysAgo(-3).toISOString(),
        endAt: daysAgo(-10).toISOString(),
        createdAt: daysAgo(1).toISOString(),
        updatedAt: daysAgo(1).toISOString(),
        updatedBy: "user-admin-letitrip",
        creative: {
          title: "Complete Your Exodia",
          body: "All 5 Forbidden One pieces available — LOB to modern reprints.",
          imageUrl: "https://images.ygoprodeck.com/images/cards/cropped/33396948.jpg",
          ctaLabel: "Browse Exodia",
          ctaHref: "/products?q=exodia",
        },
      },
    ],
  },
  commissions: {
    platformFeePercent: 5,
    gstPercent: 18,
    minimumTransactionFee: 0,
    gatewayFeePercent: 2,
    codDepositPercent: 10,
    sellerShippingFixed: 0,
    platformShippingPercent: 0,
    platformShippingFixedMin: 0,
    autoPayoutWindowDays: 7,
    payoutHoldDays: 2,
    minPayoutAmount: 100,
    auctionListingFee: 0,
    preOrderListingFee: 0,
    featuredSlotFee: 999,
    promotedSlotFee: 499,
  },
  featureFlags: {
    chats: true,
    smsVerification: true,
    translations: true,
    wishlists: true,
    auctions: true,
    reviews: true,
    events: true,
    blog: true,
    coupons: true,
    notifications: true,
    sellerRegistration: true,
    preOrders: true,
    seedPanel: true,
    adminCheckoutBypass: false,
  },
  credentials: {
    razorpayKeyId: "rzp_test_PLACEHOLDER",
    razorpayKeySecret: "secret_PLACEHOLDER",
    razorpayWebhookSecret: "webhook_PLACEHOLDER",
    resendApiKey: "re_PLACEHOLDER",
    whatsappApiKey: "wa_PLACEHOLDER",
    whatsappPhoneNumberId: "",
    whatsappCloudApiToken: "",
    whatsappAdminNotifyNumbers: "",
    shiprocketEmail: "shiprocket@letitrip.in",
    shiprocketPassword: "shiprocket_PLACEHOLDER",
    metaAppId: "meta_app_PLACEHOLDER",
    metaAppSecret: "meta_secret_PLACEHOLDER",
    metaPageAccessToken: "meta_page_token_PLACEHOLDER",
    metaPageId: "meta_page_id_PLACEHOLDER",
    tiktokClientKey: "tiktok_client_key_PLACEHOLDER",
    tiktokClientSecret: "tiktok_client_secret_PLACEHOLDER",
    tiktokAccessToken: "tiktok_access_token_PLACEHOLDER",
    deviantartClientId: "deviantart_client_id_PLACEHOLDER",
    deviantartClientSecret: "deviantart_client_secret_PLACEHOLDER",
  },
  notificationChannels: {
    inApp: { enabled: true, readOnly: true },
    email: { enabled: true, minPriority: "normal" },
    whatsapp: { enabled: true, minPriority: "high", otpEnabled: true },
    sms: { enabled: true, minPriority: "high" },
  },
  actionConfig: {},
  navConfig: {},
  disabledRoutes: [],
};
