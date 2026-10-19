import type { FirestoreDocument } from "@mohasinac/appkit";
/**
 * AppkitConfig — consumer's contract with all appkit CLI binaries.
 *
 * Place an `appkit.config.ts` (or .js / .mjs) at the root of your project.
 * All CLI binaries discover it via `process.cwd()`. Run `npx appkit-init-config`
 * to generate a starter file.
 *
 * @example
 * ```ts
 * // appkit.config.ts
 * import type { AppkitConfig } from "@mohasinac/appkit";
 * const config: AppkitConfig = {
 * baseUrl: "http://localhost:3000",
 * locales: ["en"],
 * routes: {
 * smoke: [{ path: "/", expect: ["MyBrand"] }],
 * },
 * };
 * export default config;
 * ```
 */
export interface AppkitSmokeRoute {
  /** Relative path, e.g. "/" or "/products/some-slug" */
  path: string;
  /** Strings that must appear in the initial HTML (no JS evaluated) */
  expect: string[];
  /** Optional auth fixture key from authFixtures */
  auth?: string;
}

export interface AppkitThemeProbeRoute {
  /** Relative path */
  path: string;
  /** Screenshot file name (without extension) */
  screenshotName: string;
  /** Optional auth fixture key from authFixtures */
  auth?: string;
}

export interface AppkitAuthFixture {
  /** Cookie header value, e.g. "session=FIXTURE_TOKEN" */
  cookie: string;
}

export interface FirestoreIndexField {
  fieldPath: string;
  order?: "ASCENDING" | "DESCENDING";
  arrayConfig?: "CONTAINS";
}

export interface FirestoreIndex {
  collectionGroup: string;
  queryScope: "COLLECTION" | "COLLECTION_GROUP";
  fields: FirestoreIndexField[];
}

export interface FirestoreFieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexes: Array<{
    order?: "ASCENDING" | "DESCENDING";
    arrayConfig?: "CONTAINS";
    queryScope: "COLLECTION" | "COLLECTION_GROUP";
  }>;
}

/** Consumer-specific Firebase extensions merged on top of the appkit base by firebase-merge.mjs. */
export interface AppkitFirebaseExtensions {
  /** Additional Firestore composite indexes merged on top of the appkit base (deduplicated). */
  indexes?: FirestoreIndex[];
  /** Additional Firestore field overrides appended to the base list. */
  fieldOverrides?: FirestoreFieldOverride[];
  /** Additional RTDB rule paths deep-merged into the base rules object. */
  database?: FirestoreDocument;
  /** Raw Firestore security rules block injected inside the top-level match block. */
  firestoreRules?: string;
  /** Raw Storage security rules block injected inside the bucket match block. */
  storageRules?: string;
}

export interface AppkitFirebaseConfig {
  /** Firebase project ID */
  projectId: string;
  /** Path to firestore.indexes.json base file (default: appkit/firebase/base/firestore.indexes.json) */
  indexesPath?: string;
  /** Collections to include in reset (undefined = all) */
  resetCollections?: string[];
  /** Firebase Functions region */
  functionsRegion?: string;
  /** Consumer-specific extensions merged on top of the appkit base by `npm run firebase:generate`. */
  extensions?: AppkitFirebaseExtensions;
}

export interface AppkitBrandConfig {
  /** Display name of the brand, e.g. "Acme Store" */
  name: string;
  /** Short / abbreviated name, e.g. "LT" */
  shortName?: string;
  /** One-line brand description used in meta tags and footers */
  description?: string;
  /** Tagline shown in footer / about sections */
  madeInText?: string;
  socialUrls?: {
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    youtube?: string;
    facebook?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface AppkitSeoConfig {
  /** Canonical site URL, e.g. "https://example.com" */
  siteUrl: string;
  /** Default page <title> */
  defaultTitle?: string;
  /** Default meta description */
  defaultDescription?: string;
  /** Default OG image path (relative to public/) */
  defaultImage?: string;
  /** OG site name */
  siteName?: string;
  /** Twitter/X handle including @, e.g. "@mybrand" */
  twitterHandle?: string;
  /** BCP 47 locale tag for OG/schema.org, e.g. "en-IN" */
  locale?: string;
}

/**
 * A value the business has not decided yet.
 *
 * 🛑 `null`, deliberately, rather than `undefined` or an empty string. All
 * three would render the same blank space, and only this one is distinguishable
 * from "the key is missing" at a glance in the config file — which matters
 * because every field typed this way appears on a page whose purpose is legal
 * disclosure. A renderer is expected to show a visible `[to be confirmed]`
 * marker (`<PendingValue>`), never an empty gap, so that an unfilled statutory
 * field is obvious to whoever looks at the page rather than reading as absent.
 */
export type PendingString = string | null;

/** Registered postal address of the legal entity. */
export interface AppkitBusinessAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  /**
   * GST state code, e.g. "27" for Maharashtra.
   *
   * 🛑 Must match the first two digits of `AppkitBusinessConfig.gstin`, and is
   * an INPUT to the intra- vs inter-state supply decision that picks CGST+SGST
   * over IGST. Wrong here means wrong tax on every invoice.
   */
  stateCode: string;
  postalCode: string;
  country: string;
}

export interface AppkitBusinessSupport {
  email?: PendingString;
  phone?: PendingString;
  /** WhatsApp number with country code, digits only, e.g. "918919665811". */
  whatsapp?: PendingString;
  /** Human-readable, e.g. "Mon-Sat, 10:00-19:00 IST". */
  hours?: PendingString;
}

/**
 * Grievance officer. A mandatory published disclosure for an Indian
 * e-commerce platform under the Consumer Protection (E-Commerce) Rules 2020
 * and the IT Rules 2021 — name, designation and a working contact.
 */
export interface AppkitBusinessGrievance {
  name?: PendingString;
  designation?: PendingString;
  email?: PendingString;
  phone?: PendingString;
}

/**
 * Published policy terms, as PROSE rather than numbers.
 *
 * "2-3 business days" carries its own unit; a bare `3` forces every renderer
 * to re-invent one, and they will not agree.
 */
export interface AppkitBusinessPolicy {
  processingTime?: PendingString;
  deliveryEstimate?: PendingString;
  shippingCharges?: PendingString;
  cancellationWindow?: PendingString;
  returnWindow?: PendingString;
  refundTimeline?: PendingString;
}

/** Where buyers paying by bank transfer or UPI send money. */
export interface AppkitBusinessBank {
  name?: PendingString;
  accountName?: PendingString;
  /** 🛑 PRIVATE. Never on the public GET /api/site-settings. */
  accountNumber?: PendingString;
  /** 🛑 PRIVATE. Never on the public GET /api/site-settings. */
  ifsc?: PendingString;
  /** UPI Virtual Payment Address, e.g. "name@bank". Buyer-facing. */
  upiVpa?: PendingString;
  /**
   * Root-relative path to the payment QR image.
   *
   * 🛑 A STATIC asset under public/, never a `/media/<slug>`. The media proxy
   * composites a watermark onto every image it serves and has no skip
   * mechanism, and a mark over a QR can corrupt enough modules to break the
   * scan. `resolveMediaUrl` returns a relative path untouched, which is what
   * makes a static path safe here.
   */
  qrImagePath?: string;
}

/**
 * Statutory identity of the legal entity behind the site.
 *
 * This is the ONE owner of these facts. They are published by law, so none of
 * it is secret and all of it belongs in a committed, reviewable file; the
 * corresponding `BUSINESS_*` env vars exist to override per deployment.
 */
export interface AppkitBusinessConfig {
  /** Registered legal name, e.g. "Let It Rip India". */
  legalName: string;
  /** Proprietor / authorised signatory. */
  proprietor?: string;
  /** e.g. "Sole proprietorship", "Private limited company". */
  structure?: string;
  /** 15-character GSTIN. Validate with `isValidGstin` — shape AND checksum. */
  gstin?: PendingString;
  /** Udyam (MSME) registration number. */
  udyamNumber?: PendingString;
  registeredAddress?: AppkitBusinessAddress;
  support?: AppkitBusinessSupport;
  grievance?: AppkitBusinessGrievance;
  policy?: AppkitBusinessPolicy;
  bank?: AppkitBusinessBank;
}

export interface AppkitI18nConfig {
  /** next-intl localePrefix strategy (default: "never") */
  localePrefix?: "never" | "always" | "as-needed";
  /**
   * Set false to suppress the Set-Cookie: Next-Locale header, which forces
   * cache-control: private and breaks Vercel ISR. Disable when running a single
   * locale (default: false).
   */
  enableLocaleCookie?: boolean;
}

export interface AppkitVercelConfig {
  /** Vercel project ID */
  projectId: string;
  /** Vercel team slug or ID */
  team?: string;
  /** Path to .env file to sync */
  envFile?: string;
  /** Deployment regions, e.g. ["bom1"] */
  regions?: string[];
}

export interface AppkitConfig {
  /** Base URL for smoke tests and theme probes (default: http://localhost:3000) */
  baseUrl?: string;
  /** Supported locales (default: ["en"]) */
  locales?: string[];
  /** Brand identity — name, social URLs, taglines */
  brand?: AppkitBrandConfig;
  /**
   * Statutory identity of the legal entity — legal name, GSTIN, registered
   * address, support channels, grievance officer, published policy terms.
   *
   * Distinct from `brand`, which is how the site PRESENTS itself. "LetItRip"
   * is the brand; "Let It Rip India" is the entity that issues the invoice.
   */
  business?: AppkitBusinessConfig;
  /** SEO defaults — siteUrl, defaultTitle, OG image, Twitter handle */
  seo?: AppkitSeoConfig;
  /** i18n / next-intl routing options */
  i18n?: AppkitI18nConfig;
  /** Route configuration for smoke tests and theme probing */
  routes?: {
    /** Routes to SSR-verify: must return 200 + expected strings in initial HTML */
    smoke?: AppkitSmokeRoute[];
    /** Routes to screenshot for theme-repaint verification */
    themeProbe?: AppkitThemeProbeRoute[];
  };
  /** Strings that must NOT appear in any client bundle chunk */
  bundleForbidden?: string[];
  /** Named auth fixtures for smoke/theme tests */
  authFixtures?: Record<string, AppkitAuthFixture>;
  /** CSS custom property overrides for theme-swap verification */
  themeOverrides?: Record<string, string>;
  /** Firebase project configuration (used by firebase-* CLI binaries) */
  firebase?: AppkitFirebaseConfig;
  /** Vercel project configuration (used by vercel-* CLI binaries) */
  vercel?: AppkitVercelConfig;
}
