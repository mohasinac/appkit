/**
 * @mohasinac/appkit/cli
 *
 * Node API helpers for Next.js + i18n integration.
 * The full CLI binary remains in @mohasinac/cli (standalone — npx-able).
 *
 * Usage in next.config.js:
 *   const { withFeatures } = require("@mohasinac/appkit/cli");
 *   const features = require("./features.config").default;
 *   module.exports = withFeatures(features)({ serverExternalPackages: ["firebase-admin"] });
 *
 * Usage in src/i18n/request.ts:
 *   import { mergeFeatureMessages } from "@mohasinac/appkit/cli";
 *   import features from "../../features.config";
 *   const messages = await mergeFeatureMessages(locale, features);
 */

import type { FeaturesConfig } from "../contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { FeaturesConfig };

export interface NextConfig {
  transpilePackages?: string[];
  [key: string]: unknown;
}

type Messages = Record<string, unknown>;

// ---------------------------------------------------------------------------
// withFeatures — next.config.js helper
// ---------------------------------------------------------------------------

/**
 * When using appkit as a single published package, transpilePackages only
 * needs the one appkit entry (not 58 individual @mohasinac/* packages).
 * We keep this helper for forward-compatibility and for consumers still
 * transitioning from the old packages.
 */
const ALWAYS_TRANSPILE: string[] = [
  "@mohasinac/appkit",
];

/** Maps feature config key → appkit sub-path (for documentation / future use) */
export const FEATURE_SUBPATH_MAP: Record<string, string> = {
  layout: "@mohasinac/appkit/features/layout",
  forms: "@mohasinac/appkit/features/forms",
  filters: "@mohasinac/appkit/features/filters",
  media: "@mohasinac/appkit/features/media",
  auth: "@mohasinac/appkit/features/auth",
  account: "@mohasinac/appkit/features/account",
  products: "@mohasinac/appkit/features/products",
  categories: "@mohasinac/appkit/features/categories",
  cart: "@mohasinac/appkit/features/cart",
  wishlist: "@mohasinac/appkit/features/wishlist",
  checkout: "@mohasinac/appkit/features/checkout",
  orders: "@mohasinac/appkit/features/orders",
  payments: "@mohasinac/appkit/features/payments",
  blog: "@mohasinac/appkit/features/blog",
  reviews: "@mohasinac/appkit/features/reviews",
  faq: "@mohasinac/appkit/features/faq",
  search: "@mohasinac/appkit/features/search",
  homepage: "@mohasinac/appkit/features/homepage",
  admin: "@mohasinac/appkit/features/admin",
  events: "@mohasinac/appkit/features/events",
  auctions: "@mohasinac/appkit/features/auctions",
  promotions: "@mohasinac/appkit/features/promotions",
  seller: "@mohasinac/appkit/features/seller",
  stores: "@mohasinac/appkit/features/stores",
  "pre-orders": "@mohasinac/appkit/features/pre-orders",
  consultation: "@mohasinac/appkit/features/consultation",
  corporate: "@mohasinac/appkit/features/corporate",
  "before-after": "@mohasinac/appkit/features/before-after",
  loyalty: "@mohasinac/appkit/features/loyalty",
  collections: "@mohasinac/appkit/features/collections",
  preorders: "@mohasinac/appkit/features/pre-orders",
  "whatsapp-bot": "@mohasinac/appkit/features/whatsapp-bot",
};

/**
 * Wraps a Next.js config object. With appkit, only `@mohasinac/appkit` needs to
 * be in transpilePackages — no per-feature entries required.
 */
export function withFeatures(
  features: FeaturesConfig,
): (nextConfig: NextConfig) => NextConfig {
  return function applyFeatures(nextConfig: NextConfig): NextConfig {
    const existing = nextConfig.transpilePackages ?? [];
    const merged = [
      ...ALWAYS_TRANSPILE,
      ...existing.filter((p) => !ALWAYS_TRANSPILE.includes(p)),
    ];
    // Suppress unused-variable warning for features param — kept for API compat
    void features;
    return { ...nextConfig, transpilePackages: merged };
  };
}

// ---------------------------------------------------------------------------
// mergeFeatureMessages — i18n helper
// ---------------------------------------------------------------------------

/** Maps feature key → i18n namespace used by that feature */
const FEATURE_NAMESPACE_MAP: Record<string, string> = {
  layout: "layout",
  forms: "forms",
  auth: "auth",
  account: "account",
  products: "products",
  categories: "categories",
  cart: "cart",
  wishlist: "wishlist",
  checkout: "checkout",
  orders: "orders",
  payments: "payments",
  blog: "blog",
  reviews: "reviews",
  faq: "faq",
  search: "search",
  homepage: "home",
  admin: "admin",
  events: "events",
  auctions: "auctions",
  promotions: "promotions",
  seller: "seller",
  stores: "stores",
  "pre-orders": "preOrders",
  preorders: "preOrders",
  consultation: "consultation",
  corporate: "corporate",
  "before-after": "beforeAfter",
  loyalty: "loyalty",
  collections: "collections",
  "whatsapp-bot": "whatsappBot",
};

// Opaque dynamic import — prevents bundlers from statically analysing the path
const _dynamicImport = new Function(
  "modulePath",
  "return import(modulePath)",
) as (modulePath: string) => Promise<Record<string, unknown>>;

function deepMerge(a: Messages, b: Messages): Messages {
  const result: Messages = { ...a };
  for (const key of Object.keys(b)) {
    const av = a[key];
    const bv = b[key];
    if (
      bv !== null &&
      typeof bv === "object" &&
      !Array.isArray(bv) &&
      av !== null &&
      typeof av === "object" &&
      !Array.isArray(av)
    ) {
      result[key] = deepMerge(av as Messages, bv as Messages);
    } else {
      result[key] = bv;
    }
  }
  return result;
}

/**
 * Attempts to load a feature's message fragment from the appkit package.
 * With appkit, messages live inside the package's `messages/` directory
 * at build time. Returns {} on missing.
 */
async function tryLoadFeatureMessages(
  featureKey: string,
  locale: string,
): Promise<Messages> {
  try {
    // For appkit, feature messages are bundled per-feature sub-path
    const mod = await _dynamicImport(
      `@mohasinac/appkit/features/${featureKey}/messages/${locale}.json`,
    );
    return (mod.default ?? mod) as Messages;
  } catch {
    return {};
  }
}

/**
 * Loads the project's own message file, then deep-merges message fragments
 * from all enabled appkit features on top. Project-local messages always win.
 *
 * @param locale   BCP 47 locale tag, e.g. "en"
 * @param features The project's features.config.ts default export
 */
export async function mergeFeatureMessages(
  locale: string,
  features: FeaturesConfig,
): Promise<Messages> {
  let projectMessages: Messages = {};
  try {
    const mod = await _dynamicImport(`../../messages/${locale}.json`);
    projectMessages = (mod.default ?? mod) as Messages;
  } catch {
    // Tolerate missing file (e.g. test environments)
  }

  const enabledKeys = Object.entries(features)
    .filter(([key, enabled]) => enabled && key in FEATURE_NAMESPACE_MAP)
    .map(([key]) => key);

  const fragments = await Promise.all(
    enabledKeys.map((key) => tryLoadFeatureMessages(key, locale)),
  );

  let base: Messages = {};
  for (const fragment of fragments) {
    base = deepMerge(base, fragment);
  }

  return deepMerge(base, projectMessages);
}

