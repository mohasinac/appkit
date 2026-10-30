/*
 * WHY: Seeds the singleton site-settings doc for a generic collectibles marketplace.
 * WHAT: 1 document — branding, SEO, features, legal, commissions, credentials, ad inventory.
 *
 * EXPORTS:
 *   siteSettingsSeedData — Partial<SiteSettingsDocument> for seed runner
 *
 * @tag domain:site-settings,admin
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { SiteSettingsDocument } from "../features/admin/schemas";
import { seedExtMedia, seedPhoto } from "./_helpers/media";
import { ROUTES } from "../next/routing/route-map";
import { DEFAULT_AUCTION_BID_INCREMENT_TIERS } from "../_internal/shared/features/auctions/config";

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

export const siteSettingsSeedData: Partial<SiteSettingsDocument> = {
  id: "global",
  siteName: "LetItRip",
  motto: "India's Marketplace for Collectibles — Action Figures, Trading Cards, Spinning Tops & More",
  // `message` is the canonical field — `AnnouncementBar` and the homepage read
  // it. The main admin editor used to save this copy under `text`, which no
  // renderer has ever read, so admin-authored announcements saved and then
  // never appeared (fixed 2026-08-24). `link` is seeded because it only became
  // a rendered field in that same fix — without a fixture nothing exercises it.
  announcementBar: {
    enabled: true,
    /*
     * 🛑 Was "Up to 25% off select listings … See Events for codes" linking
     * `/events`. Two problems, both live on the first line of every page:
     * `/events` is closed, and no coupon in the database ever supported a
     * 25% claim. The free-shipping figure IS checked — it is
     * `shipping.minOrderForFree`, 999.
     */
    message: "🎉 Free shipping on orders above ₹999 — shop the latest Beyblade X drops",
    link: ROUTES.PUBLIC.PRODUCTS,
  },
  watermark: {
    type: "text",
    text: "letitrip.in",
    imageUrl: "",
    size: 10,
    opacity: 10,
    position: "center",
    offsetX: 0,
    offsetY: 0,
  },
  logo: {
    url: "",
    alt: "LetItRip Logo",
    format: "svg",
  },
  /*
   * 🛑 NO `aboutContent` — REMOVED 2026-10-27, and its absence is the point.
   *
   * `/about` resolves every label as `val(key, t(key))`: the stored value
   * WINS and the i18n string is only a fallback. So this block SHADOWED
   * `messages/en.json` `about.*`, and rewriting the translations for the
   * single-vendor storefront changed nothing on the page — it still said
   * "India's largest collectibles marketplace" and listed Pokemon TCG,
   * Hot Wheels and PSA-graded cards. The live override was cleared; seeding
   * it back would re-create exactly that shadowing.
   *
   * The i18n block is now the one reviewed copy. An admin can author an
   * override again whenever they want; the seed should not ship one.
   */
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
    phone: "+91-8919665811",
    address: "Siddeshwar Peth, Solapur, Maharashtra 413001",
    upiVpa: "mohsin0502@okicici",
    whatsappNumber: "918919665811",
  },
  payment: {
    razorpayEnabled: false,
    phonepeEnabled: false,
    upiManualEnabled: true,
    codEnabled: true,
    otpCheckoutThreshold: 5000,
  },
  emi: {
    enabled: true,
    minOrderValue: 10000,
    tenureOptions: [2, 3, 4, 5, 6],
    tokenPercent: 10,
    billingDay: 5,
    surchargePercentPerMonth: 1,
    surchargeSellerSharePercent: 50,
  },
  socialLinks: {
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
  },
  emailSettings: {
    fromName: "LetItRip",
    fromEmail: "noreply@letitrip.in",
    replyTo: "support@letitrip.in",
    /*
     * ONE recipient, no CC.
     *
     * This was 3 TO plus 1 CC. Resend bills a CC as a separate delivery, so
     * one daily report cost FOUR of the day's 100 emails — and the digest is
     * now the single most important message the site sends, since it carries
     * the contact messages, ticket backlog and payment-proof queue that used
     * to be their own alerts.
     *
     * `ccRecipients` stays as an empty array rather than being removed: the
     * field is still on the schema so existing documents validate, and
     * `dailyStatusDigest` no longer reads it at all.
     */
    dailyDigest: {
      enabled: true,
      recipients: ["mohasin@letitrip.in"],
      ccRecipients: [],
    },
  },
  /*
   * Both channels start OFF. A reseed should leave the site quiet rather than
   * mailing real people, and turning email back on is one toggle in
   * Site Settings → Notifications.
   *
   * The ceiling is 80 against Resend's free 100/day — see
   * MESSAGE_BUDGET_DEFAULTS for why the headroom is not timidity.
   */
  messaging: {
    emailEnabled: false,
    whatsappEnabled: false,
    dailyCeiling: { email: 80, whatsapp: 200, sms: 50 },
  },
  seo: {
    // Kept in step with the hero h1 in homepage-sections-seed-data.ts: the
    // title is what a search result and a browser tab show, so leaving
    // "Auction" here would have gone on advertising a disabled type from the
    // one place a visitor sees before the page even loads.
    defaultTitle:
      "LetItRip — Buy & Sell Collectibles | India's Collectibles Marketplace",
    defaultDescription:
      "Buy and sell collectibles on India's marketplace for enthusiasts — action figures, trading cards, spinning tops, model kits, and more from verified sellers.",
    keywords: [
      "collectibles marketplace india",
      "action figures india",
      "trading cards india",
      "spinning tops collectibles",
      "model kits india",
      "vintage collectibles",
      "live auction collectibles",
      "pre-order collectibles",
      "verified sellers india",
      "buy sell collectibles online",
    ],
    ogImage: seedPhoto("site-og-image-collectibles-20260101", 1200, 630),
  },
  features: [
    {
      id: "feature_001",
      name: "Huge Catalogue",
      description: "Curated Collectibles Across Every Category",
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
      description: "Verified Sellers, Verified Products",
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
      description: "Bid on Rare & Collectible Items",
      icon: "🏆",
      enabled: true,
    },
    {
      id: "feature_006",
      name: "Pre-Orders",
      description: "Reserve Upcoming Releases Early",
      icon: "⏳",
      enabled: true,
    },
  ],
  // Every key here is an ADMIN OVERRIDE, and an empty string is the correct
  // default: `PolicyPageView` falls back to the i18n `sections[]` content for
  // that page whenever the value is empty, and every one of these pages already
  // ships full copy in `messages/en.json`.
  //
  // Two hard constraints, both learned the hard way (2026-08-24):
  //   1. The value must be raw HTML. `PolicyPageView` injects it with
  //      `dangerouslySetInnerHTML`, and the admin Legal tab edits it as a plain
  //      HTML textarea. This block previously held TipTap `JSON.stringify({...})`
  //      documents, so the one key that DID match a real reader (`refundPolicy`)
  //      rendered a wall of raw JSON on /refund-policy in production.
  //   2. The key names must match `POLICY_META[*].firestoreField` in
  //      `features/about/components/PolicyPageView.tsx`. The other three keys here
  //      were `termsOfService`/`privacyPolicy`/`shippingPolicy` — names no reader
  //      or writer has ever used, so they were silently inert.
  legalPages: {
    terms: "",
    privacy: "",
    cookies: "",
    refundPolicy: "",
    shipping: "",
    ethics: "",
    codeOfConduct: "",
    /*
     * Added 2026-10-19 alongside the two new `PolicyPageView` keys. Empty like
     * every sibling: the seed deliberately ships no legal prose — the admin
     * Legal tab is the author, and a seeded placeholder would render as real
     * policy text on an indexed public page.
     */
    cancellation: "",
    grievance: "",
  },
  shipping: {
    estimatedDays: 7,
    minOrderForFree: 999,
    // C5c — manual until a Shiprocket provider AND credentials exist. A
    // seeded `shiprocket` would throw at boot by design.
    provider: "manual" as const,
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
      supportPhone: "+91-8919665811",
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
      thirdPartyScriptUrl: seedExtMedia("https://cdn.example-ads.com/ad-runtime.js"),
    },
    inventory: [
      {
        id: "ad-homepage-hero-new-arrivals",
        name: "New Arrivals Hero Banner",
        provider: "manual",
        status: "active",
        placementIds: ["homepage-hero-banner"],
        requiresConsent: true,
        priority: 100,
        createdAt: daysAgo(20).toISOString(),
        updatedAt: daysAgo(2).toISOString(),
        updatedBy: "user-admin-letitrip",
        creative: {
          title: "New Arrivals Mega Drop",
          body: "Limited new arrivals across every category — this weekend only.",
          imageUrl: seedPhoto("ad-homepage-hero-new-arrivals-20260101", 1200, 400),
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
          title: "Live Auctions",
          body: "Rare and collectible items — auctions ending this week.",
          imageUrl: seedPhoto("ad-listing-sidebar-auction-boost-20260101", 600, 600),
          ctaLabel: "View Auctions",
          ctaHref: String(ROUTES.PUBLIC.AUCTIONS),
        },
      },
      {
        id: "ad-search-inline-spotlight",
        name: "Search Spotlight — Featured Picks",
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
          title: "Complete Your Collection",
          body: "Find the pieces you're missing — new listings added daily.",
          imageUrl: seedPhoto("ad-search-inline-spotlight-20260101", 600, 600),
          ctaLabel: "Browse All",
          ctaHref: String(ROUTES.PUBLIC.PRODUCTS),
        },
      },
    ],
  },
  // This block was missing entirely until 2026-08-21, and it is the data-layer
  // half of the "+₹1 / +₹5 / +₹10 quick-bid buttons" bug. `DEFAULT_SITE_SETTINGS_DATA`
  // (features/admin/schemas/firestore.ts) has always carried an `auctionConfig`,
  // but that object is not what writes Firestore — this seed file is, and it
  // declared no `auctionConfig` at all. The seed CLI runs the payload through
  // `stripUndefined()` and writes with `{ merge: true }`, so an absent key is
  // simply skipped: no `appkit-seed load`, however many times it ran, could ever
  // create `auctionConfig.bidIncrementTiers`. Every caller then read
  // `settings.auctionConfig?.bidIncrementTiers ?? []` and resolved the ₹1
  // last-resort increment. Sourced from the shared constant so the seed, the
  // schema default and the admin editor's initial state cannot drift apart —
  // which is exactly what that constant's docstring already claimed.
  auctionConfig: {
    bidIncrementTiers: DEFAULT_AUCTION_BID_INCREMENT_TIERS,
    autoExtendWindowMinutes: 5,
    settlementGracePeriodHours: 24,
  },
  /*
   * 🛑 There is deliberately NO `gst` block here, and it must stay that way.
   *
   * It looks like the `auctionConfig` defect one block up — a key the schema
   * default declares and the seed does not, so `appkit-seed load` can never
   * create it — but the two are opposite cases, and seeding this one would be
   * destructive rather than corrective.
   *
   *   `auctionConfig` was broken BY its absence: every reader resolved
   *   `?? []` and fell back to a ₹1 bid increment, so the feature was
   *   measurably wrong until the key existed.
   *
   *   `gst` is CORRECT when absent: readers do `settings.gst?.enabled ??
   *   false`, which is the intended default — product GST off until a real
   *   registration is entered.
   *
   * And the seed writes `set(..., { merge: true })`, so declaring
   * `gst: { gstin: "", ... }` here would overwrite a live GSTIN with an empty
   * string on **every** subsequent `appkit-seed load`. A registration number
   * is admin-entered identity, not platform config; the only writer is the
   * Site Settings → Gst tab, and `/api/admin/site` now refuses to enable GST
   * until the GSTIN passes its own check digit and the legal name and address
   * are present (see `validateGstEnablement`).
   */
  commissions: {
    platformFeePercent: 5,
    gstPercent: 18,
    minimumTransactionFee: 0,
    gatewayFeePercent: 2,
    codDepositPercent: 10,
    codHandlingFeeCap: 200,
    codHandlingFeePercent: 10,
    // Enabled so a seeded install actually shows the add-ons — see the matching
    // comment on DEFAULT_SITE_SETTINGS_DATA.commissions.
    whatsappNotifyFeeEnabled: false,
    whatsappNotifyFee: 10,
    /* Monthly, seller-paid. The per-order buyer addon above is disabled by default. */
    whatsappNotifyMonthlyFee: 199,
    /* Opt-in buyer UPSELLS, off since 2026-10-27 — gift wrap and shipment
     * protection are marketplace merchandising, not "the basic of the basic
     * for an ecommerce". Disabling an opt-in extra removes an OPTION, so no
     * total can go up. `platformFeePercent` is deliberately NOT touched: that
     * changes what every buyer pays and is a pricing decision. */
    giftWrapFeeEnabled: false,
    giftWrapFee: 49,
    shipmentProtectionFeeEnabled: false,
    shipmentProtectionFeePercent: 2,
    shipmentProtectionFeeMin: 30,
    saleProtectionFeeEnabled: true,
    saleProtectionFeePercent: 3,
    saleProtectionFeeMin: 49,
    sellerShippingFixed: 0,
    platformShippingPercent: 0,
    platformShippingFixedMin: 0,
    autoPayoutWindowDays: 7,
    /*
     * 🛑 7, not 2 — corrected 2026-10-21.
     *
     * Seeded at 2 while the hardcoded window in `autoPayoutEligibility` was 7
     * and the sale-protection claim window is 7 days. Nothing read the
     * setting, so the disagreement was invisible; the moment it was wired up
     * it would have SHORTENED the hold to 2 and released a seller's money
     * five days before the buyer could claim against protection we had sold
     * and would have to fund ourselves.
     *
     * `resolvePayoutHoldDays` clamps up to the floor regardless, so this is
     * the honest value rather than the enforcing one.
     */
    payoutHoldDays: 7,
    minPayoutAmount: 100,
    auctionListingFee: 0,
    preOrderListingFee: 0,
    featuredSlotFee: 999,
    promotedSlotFee: 499,
  },
  // Was `featureFlags` — 14 toggles of which 11 had no reader. Deleted
  // 2026-08-29; the two that were never flags live here instead.
  listings: {
    // Kept identical to `DEFAULT_SITE_SETTINGS_DATA.listings` in
    // admin/schemas/firestore.ts — a seed that disagrees with the default
    // means a freshly seeded site and a never-configured site offer different
    // catalogues. See that block for why every member is now spelled out.
    /*
     * TWO types, as of 2026-10-27 — the site sells buy-it-now and reserve,
     * and nothing else. Owner's instruction: "disable everything on the site,
     * keep to bare pre orders and standards".
     *
     * 🛑 `art`, `stickers` and `spares` were `true` here while all three were
     * measured at ZERO available listings, so `isListingSurfaceVisible`
     * auto-hid them and `/art` and `/spares` already answered a real 404 at
     * the edge — while the seeded homepage went on linking to both three times
     * each. Setting the flag is what makes the intent legible instead of
     * leaving it as an accident of the stock count, and it is what lets
     * `audit-closed-surface-links` see them (that audit reads the flags; it
     * cannot read a live measurement).
     */
    listingTypes: {
      standard: true,
      "pre-order": true,
      spares: false,
      art: false,
      stickers: false,
      auction: false,
      "random-lots": false,
      classified: false,
      "digital-code": false,
      live: false,
    },
    categoryTypes: {
      category: true,
      sublisting: true,
      brand: true,
      /*
       * 🛑 Paired with `section-featured-bundles.enabled` in
       * `homepage-sections-seed-data.ts` — flipping one without the other
       * makes the admin homepage builder and the live page disagree.
       *
       * OFF since 2026-10-27, with the rest of the catalogue: a bundle is
       * neither a standard listing nor a pre-order. It is also now the flag
       * that CLOSES `/bundles` and `/bundles/{slug}` at the edge — see
       * `closedSurfacePrefixes`, which it reaches because bundles are a
       * category type and so hit neither the listing-type nor the browse-page
       * loop. Before that it hid the homepage rail while the route served.
       */
      bundle: false,
    },
    /*
     * Every browse section CLOSED, as of 2026-10-24 — `/categories`,
     * `/brands`, `/franchise` and `/stores` (+ `/sellers`) return Not Found
     * and disappear from the navbar, sidebar, mobile sheet, footer and
     * sitemap.
     *
     * 🛑 Spelled out rather than omitted. `isBrowsePageEnabled` treats an
     * absent key as OPEN, so leaving these out would publish all four on a
     * fresh seed — the opposite of the decision this block records.
     *
     * Nothing is deleted and nothing is unreachable internally: brand and
     * category rows still tag the catalogue and still drive every query that
     * reads them. Re-opening a section is one toggle in Site Settings ->
     * Listings -> Browse sections.
     *
     * 🛑 A seed change does NOT reach a live document. `appkit-seed load`
     * writes `set(merge: true)`, so this block only lands on a collection that
     * has never been written. The live `siteSettings/global` is set by
     * `scripts/set-browse-page-flags.mjs`.
     */
    browsePages: {
      categories: false,
      brands: false,
      franchise: false,
      stores: false,
    },
    /*
     * Marketplace FEATURES withdrawn — the fourth axis, 2026-10-27.
     *
     * Owner: reduce a multi-seller marketplace to a plain single-vendor shop.
     * These are the surfaces whose whole premise is the marketplace — seller
     * onboarding, the commission schedule, the payout timetable, the scam
     * registry, the reference tools. `closedPaths` is prefix-matched, so
     * `/scams` takes `/scams/report` and `/scams/faqs` with it.
     *
     * 🛑 NOT in this list, on purpose: `/help`, `/faqs`, `/track`, `/gst`,
     * `/credits`. They are merely no longer advertised. Closing means 404, and
     * 404ing a support page someone has bookmarked is a regression with no
     * upside — unlinking it from the footer is enough.
     *
     * 🛑 `/user/become-seller` is listed but the EDGE will never enforce it:
     * `src/proxy.ts` exempts the whole `/user` subtree, which owns its own
     * RBAC. It is declared here anyway so there is one list, and the page
     * itself reads it (`BecomeSellerGate`) and refuses. The edge enforces
     * what it can reach; the page enforces the rest.
     */
    closedPaths: [
      String(ROUTES.PUBLIC.DEVELOPER),
      String(ROUTES.PUBLIC.FEES),
      String(ROUTES.PUBLIC.HELP_SELLER_BADGES),
      String(ROUTES.PUBLIC.HOW_AUCTIONS_WORK),
      String(ROUTES.PUBLIC.HOW_EMI_WORKS),
      String(ROUTES.PUBLIC.HOW_OFFERS_WORK),
      String(ROUTES.PUBLIC.HOW_PAYOUTS_WORK),
      String(ROUTES.PUBLIC.ITEM_REQUESTS),
      String(ROUTES.PUBLIC.LOTTERIES),
      String(ROUTES.PUBLIC.PARTS),
      String(ROUTES.PUBLIC.REPORT_ENTITY),
      String(ROUTES.PUBLIC.SCAMS),
      /* No `ROUTES.PUBLIC.SELL` constant exists, so `/sell` — the public
       * seller-recruitment landing page — is closed on the LIVE document by
       * `scripts/close-remaining-surfaces.mjs` and is absent here. Adding the
       * constant is an appkit change; this comment is the marker for it. */
      String(ROUTES.USER.BECOME_SELLER),
      String(ROUTES.PUBLIC.SELLER_GUIDE),
    ],
  },
  credentials: {
    phonepeClientId: "PGTESTPAYUAT_PLACEHOLDER",
    phonepeClientSecret: "secret_PLACEHOLDER",
    phonepeClientVersion: "1",
    phonepeEnvironment: "sandbox",
    phonepeWebhookUsername: "webhook_PLACEHOLDER",
    phonepeWebhookPassword: "webhook_PLACEHOLDER",
    /*
     * 🛑 Deliberately EMPTY, not `*_PLACEHOLDER`, and this is the same
     * reasoning the Meta secrets and `googleMapsApiKey` are seeded empty for:
     * a placeholder is truthy, so a consumer that reads the value directly
     * treats it as a usable credential and makes a real, failing API call —
     * here, mid-checkout, after the buyer has committed. `resolveKeys()` also
     * filters PLACEHOLDER for these three as a second line of defence, but
     * the seed should not be the thing that needs defending against.
     *
     * A real key belongs in Admin › Site Settings › Credentials (encrypted at
     * rest) or in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.
     */
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    resendApiKey: "",
    whatsappApiKey: "wa_PLACEHOLDER",
    // Real Meta secrets — deliberately left empty. With these unset the order
    // announcement logs "not configured" and skips cleanly; a placeholder
    // string here would instead be treated as a usable token and fail on send.
    // Enter the real values in Admin → Site Settings → WhatsApp.
    whatsappPhoneNumberId: "",
    whatsappCloudApiToken: "",
    // The platform's own WhatsApp number, digits-only with country code
    // (+91 8919665811). Same number as contact.whatsappNumber above.
    whatsappAdminNotifyNumbers: "918919665811",
    // Default Meta message-template names. These MUST be created and approved
    // in Meta Business Manager under exactly these names — business-initiated
    // sends outside the 24h customer-service window are rejected without an
    // approved template. Names match the notification types they serve, see
    // WHATSAPP_TEMPLATE_BY_TYPE in features/admin/actions/notification-actions.ts.
    whatsappTemplateOrderPlaced: "order_placed",
    whatsappTemplateOrderConfirmed: "order_confirmed",
    whatsappTemplateOrderShipped: "order_shipped",
    whatsappTemplateOrderDelivered: "order_delivered",
    whatsappTemplateOrderCancelled: "order_cancelled",
    whatsappTemplateRefundInitiated: "refund_initiated",
    whatsappTemplateLanguage: "en",
    metaAppId: "meta_app_PLACEHOLDER",
    metaAppSecret: "meta_secret_PLACEHOLDER",
    metaPageAccessToken: "meta_page_token_PLACEHOLDER",
    metaPageId: "meta_page_id_PLACEHOLDER",
    tiktokClientKey: "tiktok_client_key_PLACEHOLDER",
    tiktokClientSecret: "tiktok_client_secret_PLACEHOLDER",
    tiktokAccessToken: "tiktok_access_token_PLACEHOLDER",
    deviantartClientId: "deviantart_client_id_PLACEHOLDER",
    deviantartClientSecret: "deviantart_client_secret_PLACEHOLDER",
    // Google Places — billed API. Left EMPTY for the same reason as the Meta
    // secrets above: `/api/social-feed/google-reviews` and
    // `GoogleReviewsSection` read these directly and would treat a
    // `*_PLACEHOLDER` string as a usable key, producing a failed billed call
    // instead of cleanly skipping. Editable at Admin → Site Settings →
    // Integrations (inputs added 2026-08-24 — both fields were consumed by the
    // Google Reviews section but had no UI, so they could never be set).
    googleMapsApiKey: "",
    googlePlaceId: "",
  },
  notificationChannels: {
    inApp: { enabled: true, readOnly: true },
    email: { enabled: true, minPriority: "normal" },
    whatsapp: { enabled: true, minPriority: "high", otpEnabled: true },
    /*
     * FALSE. There is no SMS sender anywhere in this codebase — nothing reads
     * `notificationChannels.sms`, no Twilio SDK is installed, and the only
     * "Twilio" reference is a parser for INBOUND webhook payloads.
     *
     * It was seeded `true`, which is worse than it sounds: the admin
     * Notifications tab renders a channel as enabled, so anyone reading that
     * screen would conclude SMS was live and being delivered. A channel that
     * cannot send should not claim to be on.
     */
    sms: { enabled: false, minPriority: "high" },
  },
  /*
   * The WhatsApp catalogue feed — `/whatsapp/{storeSlug}/feed.csv`.
   *
   * 🛑 SEEDED FALSE, i.e. OFF for every store, which is the opposite of the
   * field's own default. The readers are `!== false` so that an absent field,
   * an unseeded document and a failed settings read all leave feeds WORKING
   * (Meta empties a connected catalogue the moment a scheduled fetch returns a
   * file with no rows). An explicit `false` here is the deliberate write that
   * polarity reserves the "off" state for — a platform-wide retraction while
   * the per-store controls ship, not a default.
   *
   * Flipping this to `true` turns feeds back on for every store that has not
   * switched its own off; `StoreDocument.whatsappFeedEnabled` is the per-store
   * half and a seller owns it from /store/whatsapp.
   */
  whatsappFeed: { enabled: false },
  actionConfig: {},
  /*
   * 🛑 Both SPELLED OUT, 2026-10-27. They were `{}` and `[]`, and because
   * `appkit-seed load` writes `set(merge: true)`, seeding them empty would
   * RE-OPEN every hand-disabled route on a live site — /blog, /bundles,
   * /events, /reviews and /tools all answer 404 only because of these two.
   *
   * `disabledRoutes` is DERIVED from `navConfig` by `updateNavConfigDomain`
   * (it filters `ALL_PUBLIC_NAV_ITEMS` by the disabled ids), so the two must
   * agree here exactly as they do live. Keys are `publicNavId(href)` —
   * `nav-{slug}`, the portal-less spelling the Navigation Permissions panel
   * writes.
   */
  navConfig: {
    "nav-blog": { enabled: false },
    "nav-reviews": { enabled: false },
    "nav-events": { enabled: false },
    "nav-bundles": { enabled: false },
    "nav-tools": { enabled: false },
  },
  disabledRoutes: [
    String(ROUTES.BLOG.LIST),
    String(ROUTES.PUBLIC.BUNDLES),
    String(ROUTES.PUBLIC.EVENTS),
    String(ROUTES.PUBLIC.REVIEWS),
    String(ROUTES.PUBLIC.TOOLS),
  ],
  theme: {
    themes: [
      /* ── LIGHT THEMES ──────────────────────────────────────── */
      {
        id: "crimson-warrior",
        name: "Teal Tide",
        mode: "light" as const,
        builtIn: false,
        tokens: {
          "appkit-color-primary":     "#0d9488",
          "appkit-color-primary-50":  "#f0fdfa",
          "appkit-color-primary-100": "#ccfbf1",
          "appkit-color-primary-200": "#99f6e4",
          "appkit-color-primary-300": "#5eead4",
          "appkit-color-primary-400": "#2dd4bf",
          "appkit-color-primary-500": "#14b8a6",
          "appkit-color-primary-600": "#0d9488",
          "appkit-color-primary-700": "#0f766e",
          "appkit-color-primary-800": "#115e59",
          "appkit-color-primary-900": "#134e4a",
          "appkit-color-primary-950": "#042f2e",
          "appkit-color-secondary":     "#1a55f2",
          "appkit-color-secondary-50":  "#eef5ff",
          "appkit-color-secondary-100": "#d9e8ff",
          "appkit-color-secondary-200": "#bcd4ff",
          "appkit-color-secondary-300": "#8eb9ff",
          "appkit-color-secondary-400": "#5992ff",
          "appkit-color-secondary-500": "#3570fc",
          "appkit-color-secondary-600": "#1a55f2",
          "appkit-color-secondary-700": "#1343de",
          "appkit-color-secondary-800": "#1536b4",
          "appkit-color-secondary-900": "#18318e",
          "appkit-color-secondary-950": "#111e58",
          "appkit-color-bg":               "#fafaf9",
          "appkit-color-surface":          "#ffffff",
          "appkit-color-surface-elevated": "#ffffff",
          "appkit-color-surface-input":    "#ffffff",
          "appkit-color-border":           "#e7e5e4",
          "appkit-color-border-subtle":    "#f5f5f4",
          "appkit-color-text":             "#1c1917",
          "appkit-color-text-muted":       "#78716c",
          "appkit-color-text-faint":       "#a8a29e",
          "appkit-color-text-on-primary":  "#ffffff",
          "appkit-color-success":          "#059669",
          "appkit-color-success-surface":  "#ecfdf5",
          "appkit-color-warning":          "#d97706",
          "appkit-color-warning-surface":  "#fffbeb",
          "appkit-color-error":            "#dc2626",
          "appkit-color-error-surface":    "#fef2f2",
          "appkit-color-info":             "#0284c7",
          "appkit-color-info-surface":     "#f0f9ff",
          "appkit-color-focus-ring":       "#0d9488",
          "appkit-shadow-glow":      "0 0 0 1px rgba(13,148,136,0.10), 0 4px 16px -4px rgba(13,148,136,0.20)",
          "appkit-shadow-glow-pink": "0 0 0 1px rgba(26,85,242,0.12), 0 4px 16px -4px rgba(26,85,242,0.22)",
          "appkit-font-display":   "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
          "appkit-font-sans":      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
          "appkit-font-mono":      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
        },
        gradients: {
          brand:            "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          "brand-tri":      "linear-gradient(to right, #0d9488, #1a55f2, #2dd4bf)",
          accent:           "linear-gradient(to right, var(--appkit-color-primary-600), var(--appkit-color-secondary-500))",
          "accent-divider": "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
          "page-header":    "linear-gradient(to bottom right, var(--appkit-color-primary-50), transparent 60%, transparent)",
          "section-warm":   "linear-gradient(to bottom right, var(--appkit-color-secondary-50), var(--appkit-color-surface))",
          "section-cool":   "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-info-surface))",
          "section-mesh":   "radial-gradient(ellipse at top, var(--appkit-color-primary-50), var(--appkit-color-surface), var(--appkit-color-secondary-50))",
          "accent-banner":  "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          promotion:        "linear-gradient(to bottom right, var(--appkit-color-primary), var(--appkit-color-secondary), var(--appkit-color-warning))",
          spotlight:        "linear-gradient(to bottom right, var(--appkit-color-secondary-50), var(--appkit-color-bg), var(--appkit-color-secondary-50))",
          "whatsapp-card":  "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
          glass:            "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
          "card-indigo":    "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-teal":      "linear-gradient(to bottom right, var(--appkit-color-secondary-50), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-amber":     "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-rose":      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          logo:             "linear-gradient(to right, var(--appkit-color-primary-700) 0%, var(--appkit-color-primary-500) 55%, var(--appkit-color-secondary-400) 100%)",
          sidebar:          "linear-gradient(to bottom, var(--appkit-color-primary-700), var(--appkit-color-secondary-600))",
        },
      },
      {
        id: "phantom-ice",
        name: "Phantom Ice",
        mode: "light" as const,
        builtIn: false,
        tokens: {
          "appkit-color-primary":     "#0284c7",
          "appkit-color-primary-50":  "#f0f9ff",
          "appkit-color-primary-100": "#e0f2fe",
          "appkit-color-primary-200": "#bae6fd",
          "appkit-color-primary-300": "#7dd3fc",
          "appkit-color-primary-400": "#38bdf8",
          "appkit-color-primary-500": "#0ea5e9",
          "appkit-color-primary-600": "#0284c7",
          "appkit-color-primary-700": "#0369a1",
          "appkit-color-primary-800": "#075985",
          "appkit-color-primary-900": "#0c4a6e",
          "appkit-color-primary-950": "#082f49",
          "appkit-color-secondary":     "#475569",
          "appkit-color-secondary-50":  "#f8fafc",
          "appkit-color-secondary-100": "#f1f5f9",
          "appkit-color-secondary-200": "#e2e8f0",
          "appkit-color-secondary-300": "#cbd5e1",
          "appkit-color-secondary-400": "#94a3b8",
          "appkit-color-secondary-500": "#64748b",
          "appkit-color-secondary-600": "#475569",
          "appkit-color-secondary-700": "#334155",
          "appkit-color-secondary-800": "#1e293b",
          "appkit-color-secondary-900": "#0f172a",
          "appkit-color-secondary-950": "#020617",
          "appkit-color-bg":               "#f0f9ff",
          "appkit-color-surface":          "#ffffff",
          "appkit-color-surface-elevated": "#ffffff",
          "appkit-color-surface-input":    "#f8fafc",
          "appkit-color-border":           "#e2e8f0",
          "appkit-color-border-subtle":    "#f1f5f9",
          "appkit-color-text":             "#0f172a",
          "appkit-color-text-muted":       "#475569",
          "appkit-color-text-faint":       "#94a3b8",
          "appkit-color-text-on-primary":  "#ffffff",
          "appkit-color-success":          "#059669",
          "appkit-color-success-surface":  "#ecfdf5",
          "appkit-color-warning":          "#d97706",
          "appkit-color-warning-surface":  "#fffbeb",
          "appkit-color-error":            "#dc2626",
          "appkit-color-error-surface":    "#fef2f2",
          "appkit-color-info":             "#0284c7",
          "appkit-color-info-surface":     "#f0f9ff",
          "appkit-color-focus-ring":       "#0284c7",
          "appkit-shadow-glow":      "0 0 0 1px rgba(2,132,199,0.10), 0 4px 16px -4px rgba(2,132,199,0.20)",
          "appkit-shadow-glow-pink": "0 0 0 1px rgba(2,132,199,0.12), 0 4px 16px -4px rgba(2,132,199,0.22)",
          "appkit-font-display":   "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
          "appkit-font-sans":      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
          "appkit-font-mono":      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
        },
        gradients: {
          brand:            "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          "brand-tri":      "linear-gradient(to right, #0284c7, #475569, #38bdf8)",
          accent:           "linear-gradient(to right, var(--appkit-color-primary-600), var(--appkit-color-secondary-500))",
          "accent-divider": "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
          "page-header":    "linear-gradient(to bottom right, var(--appkit-color-primary-50), transparent 60%, transparent)",
          "section-warm":   "linear-gradient(to bottom right, var(--appkit-color-secondary-50), var(--appkit-color-surface))",
          "section-cool":   "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-info-surface))",
          "section-mesh":   "radial-gradient(ellipse at top, var(--appkit-color-primary-50), var(--appkit-color-surface), var(--appkit-color-secondary-50))",
          "accent-banner":  "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          promotion:        "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-warning))",
          spotlight:        "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-bg), var(--appkit-color-primary-50))",
          "whatsapp-card":  "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
          glass:            "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
          "card-indigo":    "linear-gradient(to bottom right, var(--appkit-color-primary-50), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-teal":      "linear-gradient(to bottom right, var(--appkit-color-secondary-50), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-amber":     "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-rose":      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          logo:             "linear-gradient(to right, var(--appkit-color-primary-700) 0%, var(--appkit-color-primary-400) 55%, var(--appkit-color-secondary-400) 100%)",
          sidebar:          "linear-gradient(to bottom, var(--appkit-color-primary-800), var(--appkit-color-secondary-600))",
        },
      },
      {
        id: "sunset",
        name: "Sunset",
        mode: "light" as const,
        builtIn: false,
        tokens: {
          "appkit-color-primary":     "#d97706",
          "appkit-color-primary-50":  "#fffbeb",
          "appkit-color-primary-100": "#fef3c7",
          "appkit-color-primary-200": "#fde68a",
          "appkit-color-primary-300": "#fcd34d",
          "appkit-color-primary-400": "#fbbf24",
          "appkit-color-primary-500": "#f59e0b",
          "appkit-color-primary-600": "#d97706",
          "appkit-color-primary-700": "#b45309",
          "appkit-color-primary-800": "#92400e",
          "appkit-color-primary-900": "#78350f",
          "appkit-color-primary-950": "#451a03",
          "appkit-color-secondary":     "#e11d48",
          "appkit-color-secondary-50":  "#fff1f2",
          "appkit-color-secondary-100": "#ffe4e6",
          "appkit-color-secondary-200": "#fecdd3",
          "appkit-color-secondary-300": "#fda4af",
          "appkit-color-secondary-400": "#fb7185",
          "appkit-color-secondary-500": "#f43f5e",
          "appkit-color-secondary-600": "#e11d48",
          "appkit-color-secondary-700": "#be123c",
          "appkit-color-secondary-800": "#9f1239",
          "appkit-color-secondary-900": "#881337",
          "appkit-color-secondary-950": "#4c0519",
          "appkit-color-bg":               "#fff7ed",
          "appkit-color-surface":          "#ffffff",
          "appkit-color-surface-elevated": "#ffffff",
          "appkit-color-surface-input":    "#fffbeb",
          "appkit-color-border":           "#fed7aa",
          "appkit-color-border-subtle":    "#ffedd5",
          "appkit-color-text":             "#431407",
          "appkit-color-text-muted":       "#9a3412",
          "appkit-color-text-faint":       "#c2410c",
          "appkit-color-text-on-primary":  "#ffffff",
          "appkit-color-success":          "#16a34a",
          "appkit-color-success-surface":  "#f0fdf4",
          "appkit-color-warning":          "#d97706",
          "appkit-color-warning-surface":  "#fffbeb",
          "appkit-color-error":            "#dc2626",
          "appkit-color-error-surface":    "#fef2f2",
          "appkit-color-info":             "#0284c7",
          "appkit-color-info-surface":     "#f0f9ff",
          "appkit-color-focus-ring":       "#f59e0b",
          "appkit-shadow-glow":      "0 0 0 1px rgba(245,158,11,0.10), 0 4px 16px -4px rgba(245,158,11,0.20)",
          "appkit-shadow-glow-pink": "0 0 0 1px rgba(225,29,72,0.12), 0 4px 16px -4px rgba(225,29,72,0.22)",
          "appkit-font-display":   "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
          "appkit-font-sans":      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
          "appkit-font-mono":      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
        },
        gradients: {
          brand:            "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          "brand-tri":      "linear-gradient(to right, #d97706, #f43f5e, #e11d48)",
          accent:           "linear-gradient(to right, var(--appkit-color-primary-600), var(--appkit-color-secondary-500))",
          "accent-divider": "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
          "page-header":    "linear-gradient(to bottom right, #fffbeb, transparent 60%, transparent)",
          "section-warm":   "linear-gradient(to bottom right, #fff7ed, var(--appkit-color-surface))",
          "section-cool":   "linear-gradient(to bottom right, #fffbeb, #f0f9ff)",
          "section-mesh":   "radial-gradient(ellipse at top, #fffbeb, var(--appkit-color-surface), #fff1f2)",
          "accent-banner":  "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          promotion:        "linear-gradient(to bottom right, var(--appkit-color-secondary), var(--appkit-color-primary), var(--appkit-color-warning))",
          spotlight:        "linear-gradient(to bottom right, #fffbeb, var(--appkit-color-bg), #fffbeb)",
          "whatsapp-card":  "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
          glass:            "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
          "card-indigo":    "linear-gradient(to bottom right, #fffbeb, var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-teal":      "linear-gradient(to bottom right, #fff1f2, var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-amber":     "linear-gradient(to bottom right, #fff7ed, var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-rose":      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          logo:             "linear-gradient(to right, var(--appkit-color-primary-700) 0%, var(--appkit-color-primary-500) 55%, var(--appkit-color-secondary-400) 100%)",
          sidebar:          "linear-gradient(to bottom, var(--appkit-color-primary-700), var(--appkit-color-secondary-600))",
        },
      },
      /* ── DARK THEMES ───────────────────────────────────────── */
      {
        id: "shadow-abyss",
        name: "Teal Depths",
        mode: "dark" as const,
        builtIn: false,
        tokens: {
          "appkit-color-primary":     "#14b8a6",
          "appkit-color-primary-50":  "#f0fdfa",
          "appkit-color-primary-100": "#ccfbf1",
          "appkit-color-primary-200": "#99f6e4",
          "appkit-color-primary-300": "#5eead4",
          "appkit-color-primary-400": "#2dd4bf",
          "appkit-color-primary-500": "#14b8a6",
          "appkit-color-primary-600": "#0d9488",
          "appkit-color-primary-700": "#0f766e",
          "appkit-color-primary-800": "#115e59",
          "appkit-color-primary-900": "#134e4a",
          "appkit-color-primary-950": "#042f2e",
          "appkit-color-secondary":     "#3570fc",
          "appkit-color-secondary-50":  "#eef5ff",
          "appkit-color-secondary-100": "#d9e8ff",
          "appkit-color-secondary-200": "#bcd4ff",
          "appkit-color-secondary-300": "#8eb9ff",
          "appkit-color-secondary-400": "#5992ff",
          "appkit-color-secondary-500": "#3570fc",
          "appkit-color-secondary-600": "#1a55f2",
          "appkit-color-secondary-700": "#1343de",
          "appkit-color-secondary-800": "#1536b4",
          "appkit-color-secondary-900": "#18318e",
          "appkit-color-secondary-950": "#111e58",
          "appkit-color-bg":               "#042f2e",
          "appkit-color-surface":          "#115e59",
          "appkit-color-surface-elevated": "rgba(17,94,89,0.9)",
          "appkit-color-surface-input":    "rgba(19,78,74,0.6)",
          "appkit-color-border":           "#0f766e",
          "appkit-color-border-subtle":    "rgba(19,78,74,0.6)",
          "appkit-color-text":             "#f0fdfa",
          "appkit-color-text-muted":       "#99f6e4",
          "appkit-color-text-faint":       "#5eead4",
          "appkit-color-text-on-primary":  "#ffffff",
          "appkit-color-success":          "#34d399",
          "appkit-color-success-surface":  "rgba(6,78,59,0.25)",
          "appkit-color-warning":          "#fbbf24",
          "appkit-color-warning-surface":  "#1c1508",
          "appkit-color-error":            "#f87171",
          "appkit-color-error-surface":    "rgba(127,29,29,0.25)",
          "appkit-color-info":             "#38bdf8",
          "appkit-color-info-surface":     "rgba(12,74,110,0.25)",
          "appkit-color-focus-ring":       "#5eead4",
          "appkit-shadow-glow":      "0 0 0 1px rgba(20,184,166,0.20), 0 4px 16px -4px rgba(20,184,166,0.40)",
          "appkit-shadow-glow-pink": "0 0 0 1px rgba(53,112,252,0.20), 0 4px 20px -4px rgba(53,112,252,0.35)",
          "appkit-font-display":   "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
          "appkit-font-sans":      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
          "appkit-font-mono":      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
        },
        gradients: {
          brand:            "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          "brand-tri":      "linear-gradient(to right, #14b8a6, #3570fc, #38bdf8)",
          accent:           "linear-gradient(to right, var(--appkit-color-info), var(--appkit-color-primary))",
          "accent-divider": "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
          "page-header":    "linear-gradient(to bottom right, rgba(20,184,166,0.15), transparent 60%, transparent)",
          "section-warm":   "linear-gradient(to bottom right, rgba(53,112,252,0.10), transparent)",
          "section-cool":   "linear-gradient(to bottom right, rgba(56,189,248,0.10), transparent)",
          "section-mesh":   "radial-gradient(ellipse at top, rgba(20,184,166,0.15), var(--appkit-color-surface), rgba(56,189,248,0.08))",
          "accent-banner":  "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          promotion:        "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-warning))",
          spotlight:        "linear-gradient(to bottom right, rgba(20,184,166,0.12), var(--appkit-color-bg), rgba(56,189,248,0.10))",
          "whatsapp-card":  "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
          glass:            "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
          "card-indigo":    "linear-gradient(to bottom right, rgba(20,184,166,0.12), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-teal":      "linear-gradient(to bottom right, rgba(56,189,248,0.10), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-amber":     "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-rose":      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          logo:             "linear-gradient(to right, var(--appkit-color-primary-400) 0%, var(--appkit-color-primary-300) 55%, var(--appkit-color-info) 100%)",
          sidebar:          "linear-gradient(to bottom, var(--appkit-color-primary-800), var(--appkit-color-secondary-800))",
        },
      },
      {
        id: "storm-champion",
        name: "Storm Champion",
        mode: "dark" as const,
        builtIn: false,
        tokens: {
          "appkit-color-primary":     "#2563eb",
          "appkit-color-primary-50":  "#eff6ff",
          "appkit-color-primary-100": "#dbeafe",
          "appkit-color-primary-200": "#bfdbfe",
          "appkit-color-primary-300": "#93c5fd",
          "appkit-color-primary-400": "#60a5fa",
          "appkit-color-primary-500": "#3b82f6",
          "appkit-color-primary-600": "#2563eb",
          "appkit-color-primary-700": "#1d4ed8",
          "appkit-color-primary-800": "#1e40af",
          "appkit-color-primary-900": "#1e3a8a",
          "appkit-color-primary-950": "#172554",
          "appkit-color-secondary":     "#ca8a04",
          "appkit-color-secondary-50":  "#fefce8",
          "appkit-color-secondary-100": "#fef9c3",
          "appkit-color-secondary-200": "#fef08a",
          "appkit-color-secondary-300": "#fde047",
          "appkit-color-secondary-400": "#facc15",
          "appkit-color-secondary-500": "#eab308",
          "appkit-color-secondary-600": "#ca8a04",
          "appkit-color-secondary-700": "#a16207",
          "appkit-color-secondary-800": "#854d0e",
          "appkit-color-secondary-900": "#713f12",
          "appkit-color-secondary-950": "#422006",
          "appkit-color-bg":               "#020c1b",
          "appkit-color-surface":          "#0a1628",
          "appkit-color-surface-elevated": "rgba(10,22,40,0.9)",
          "appkit-color-surface-input":    "rgba(20,40,70,0.6)",
          "appkit-color-border":           "#1e3a5f",
          "appkit-color-border-subtle":    "rgba(30,58,95,0.6)",
          "appkit-color-text":             "#fafafa",
          "appkit-color-text-muted":       "#93c5fd",
          "appkit-color-text-faint":       "#60a5fa",
          "appkit-color-text-on-primary":  "#ffffff",
          "appkit-color-success":          "#34d399",
          "appkit-color-success-surface":  "rgba(6,78,59,0.25)",
          "appkit-color-warning":          "#fbbf24",
          "appkit-color-warning-surface":  "#1c1508",
          "appkit-color-error":            "#f87171",
          "appkit-color-error-surface":    "rgba(127,29,29,0.25)",
          "appkit-color-info":             "#38bdf8",
          "appkit-color-info-surface":     "rgba(12,74,110,0.25)",
          "appkit-color-focus-ring":       "#60a5fa",
          "appkit-shadow-glow":      "0 0 0 1px rgba(37,99,235,0.20), 0 4px 16px -4px rgba(37,99,235,0.40)",
          "appkit-shadow-glow-pink": "0 0 0 1px rgba(202,138,4,0.20), 0 4px 20px -4px rgba(202,138,4,0.35)",
          "appkit-font-display":   "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
          "appkit-font-sans":      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
          "appkit-font-mono":      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
        },
        gradients: {
          brand:            "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          "brand-tri":      "linear-gradient(to right, #2563eb, #ca8a04, #ef4444)",
          accent:           "linear-gradient(to right, var(--appkit-color-secondary), var(--appkit-color-primary))",
          "accent-divider": "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
          "page-header":    "linear-gradient(to bottom right, rgba(37,99,235,0.15), transparent 60%, transparent)",
          "section-warm":   "linear-gradient(to bottom right, rgba(202,138,4,0.10), transparent)",
          "section-cool":   "linear-gradient(to bottom right, rgba(37,99,235,0.12), transparent)",
          "section-mesh":   "radial-gradient(ellipse at top, rgba(37,99,235,0.15), var(--appkit-color-surface), rgba(202,138,4,0.08))",
          "accent-banner":  "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          promotion:        "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-secondary))",
          spotlight:        "linear-gradient(to bottom right, rgba(37,99,235,0.12), var(--appkit-color-bg), rgba(202,138,4,0.08))",
          "whatsapp-card":  "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
          glass:            "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
          "card-indigo":    "linear-gradient(to bottom right, rgba(37,99,235,0.12), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-teal":      "linear-gradient(to bottom right, rgba(202,138,4,0.10), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-amber":     "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-rose":      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          logo:             "linear-gradient(to right, var(--appkit-color-primary-400) 0%, var(--appkit-color-primary-300) 55%, var(--appkit-color-secondary-400) 100%)",
          sidebar:          "linear-gradient(to bottom, var(--appkit-color-primary-800), var(--appkit-color-primary-900))",
        },
      },
      {
        id: "cobalt-night",
        name: "Cobalt Night",
        mode: "dark" as const,
        builtIn: false,
        tokens: {
          "appkit-color-primary":     "#3570fc",
          "appkit-color-primary-50":  "#eef5ff",
          "appkit-color-primary-100": "#d9e8ff",
          "appkit-color-primary-200": "#bcd4ff",
          "appkit-color-primary-300": "#8eb9ff",
          "appkit-color-primary-400": "#5992ff",
          "appkit-color-primary-500": "#3570fc",
          "appkit-color-primary-600": "#1a55f2",
          "appkit-color-primary-700": "#1343de",
          "appkit-color-primary-800": "#1536b4",
          "appkit-color-primary-900": "#18318e",
          "appkit-color-primary-950": "#111e58",
          "appkit-color-secondary":     "#65c408",
          "appkit-color-secondary-50":  "#f3ffe3",
          "appkit-color-secondary-100": "#e4ffc5",
          "appkit-color-secondary-200": "#c8ff90",
          "appkit-color-secondary-300": "#a3f550",
          "appkit-color-secondary-400": "#84e122",
          "appkit-color-secondary-500": "#65c408",
          "appkit-color-secondary-600": "#509c02",
          "appkit-color-secondary-700": "#3e7708",
          "appkit-color-secondary-800": "#345e0d",
          "appkit-color-secondary-900": "#2c5011",
          "appkit-color-secondary-950": "#142d03",
          "appkit-color-bg":               "#111e58",
          "appkit-color-surface":          "#1536b4",
          "appkit-color-surface-elevated": "rgba(21,54,180,0.9)",
          "appkit-color-surface-input":    "rgba(24,49,142,0.6)",
          "appkit-color-border":           "#1343de",
          "appkit-color-border-subtle":    "rgba(24,49,142,0.6)",
          "appkit-color-text":             "#eef5ff",
          "appkit-color-text-muted":       "#bcd4ff",
          "appkit-color-text-faint":       "#8eb9ff",
          "appkit-color-text-on-primary":  "#ffffff",
          "appkit-color-success":          "#4ade80",
          "appkit-color-success-surface":  "rgba(6,78,59,0.25)",
          "appkit-color-warning":          "#fbbf24",
          "appkit-color-warning-surface":  "#1c1508",
          "appkit-color-error":            "#f87171",
          "appkit-color-error-surface":    "rgba(127,29,29,0.25)",
          "appkit-color-info":             "#38bdf8",
          "appkit-color-info-surface":     "rgba(12,74,110,0.25)",
          "appkit-color-focus-ring":       "#8eb9ff",
          "appkit-shadow-glow":      "0 0 0 1px rgba(53,112,252,0.20), 0 4px 16px -4px rgba(53,112,252,0.40)",
          "appkit-shadow-glow-pink": "0 0 0 1px rgba(101,196,8,0.20), 0 4px 20px -4px rgba(101,196,8,0.35)",
          "appkit-font-display":   "var(--font-display), \"Poppins\", ui-sans-serif, system-ui, sans-serif",
          "appkit-font-sans":      "var(--font-body), ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          "appkit-font-editorial": "var(--font-editorial), \"Georgia\", serif",
          "appkit-font-mono":      "ui-monospace, \"SFMono-Regular\", \"Cascadia Mono\", \"Consolas\", monospace",
        },
        gradients: {
          brand:            "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          "brand-tri":      "linear-gradient(to right, #3570fc, #65c408, #8eb9ff)",
          accent:           "linear-gradient(to right, var(--appkit-color-secondary), var(--appkit-color-primary))",
          "accent-divider": "linear-gradient(to right, transparent, var(--appkit-color-primary), transparent)",
          "page-header":    "linear-gradient(to bottom right, rgba(53,112,252,0.20), transparent 60%, transparent)",
          "section-warm":   "linear-gradient(to bottom right, rgba(101,196,8,0.10), transparent)",
          "section-cool":   "linear-gradient(to bottom right, rgba(53,112,252,0.20), transparent)",
          "section-mesh":   "radial-gradient(ellipse at top, rgba(53,112,252,0.20), var(--appkit-color-surface), rgba(101,196,8,0.10))",
          "accent-banner":  "linear-gradient(to right, var(--appkit-color-primary), var(--appkit-color-secondary))",
          promotion:        "linear-gradient(to bottom right, var(--appkit-color-error), var(--appkit-color-primary), var(--appkit-color-warning))",
          spotlight:        "linear-gradient(to bottom right, rgba(53,112,252,0.15), var(--appkit-color-bg), rgba(53,112,252,0.15))",
          "whatsapp-card":  "linear-gradient(to bottom right, var(--appkit-color-success), var(--appkit-color-success))",
          glass:            "linear-gradient(to bottom right, color-mix(in srgb, var(--appkit-color-surface) 85%, transparent), color-mix(in srgb, var(--appkit-color-surface) 65%, transparent))",
          "card-indigo":    "linear-gradient(to bottom right, rgba(53,112,252,0.20), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-teal":      "linear-gradient(to bottom right, rgba(101,196,8,0.15), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-amber":     "linear-gradient(to bottom right, var(--appkit-color-warning-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          "card-rose":      "linear-gradient(to bottom right, var(--appkit-color-error-surface), var(--appkit-color-surface), var(--appkit-color-surface))",
          logo:             "linear-gradient(to right, var(--appkit-color-secondary-400) 0%, var(--appkit-color-primary-400) 55%, var(--appkit-color-primary-300) 100%)",
          sidebar:          "linear-gradient(to bottom, var(--appkit-color-primary-950), var(--appkit-color-primary-900))",
        },
      },
    ],
    // Reverted 2026-08-15 — the live site had drifted onto the "Teal Tide" /
    // "Teal Depths" custom pair (added in a prior session's theme-experiment
    // sweep), which is not the brand's cobalt+lime/hot-pink identity. The
    // custom themes above stay available as selectable options (nothing
    // deleted); this just restores the appkit built-ins as what's live by
    // default. buildThemeRegistry() always resolves "default-light"/
    // "default-dark" to the true built-in records regardless of this list.
    defaultLightThemeId: "default-light",
    defaultDarkThemeId: "default-dark",
  },
};
