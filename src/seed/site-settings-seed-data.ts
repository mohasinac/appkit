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

export const siteSettingsSeedData: Partial<SiteSettingsDocument> = {
  id: "global",
  siteName: "LetItRip",
  motto: "India’s Home for Rare Anime Collectibles",
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
};
