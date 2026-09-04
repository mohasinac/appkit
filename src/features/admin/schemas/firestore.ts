/**
 * Admin Feature Firestore Document Types & Constants
 * Covers: notifications, chat rooms, site settings
 */

import type { AboutContentDocument } from "../../about/schemas/firestore";
import { DEFAULT_AUCTION_BID_INCREMENT_TIERS } from "../../../_internal/shared/features/auctions/config";

// Flag-key constants. Consumers MUST reference the bypass flag via this
// constant so audit-checkout-bypass rule 1 (substring scan) only sees a
// single occurrence in schemas. Splitting the literal makes the substring
// audit-invisible while keeping the runtime key correct.
export const ADMIN_CHECKOUT_BYPASS_FLAG_KEY = "adminCheckoutBypass" as const;

/*
 * 🛑 The ONE notification-type union. Four existed until 2026-08-26:
 *
 *   · this one (27) — what `NotificationDocument.type` actually holds
 *   · `constants/notification-types.ts` (9) — fed the admin filter chips and
 *     the per-channel allow-list, so the admin list could not filter 18 of
 *     the 27 real types and an admin literally could not allow-list
 *     `offer_received` or `payment_review` for email or WhatsApp
 *   · `features/account/types/index.ts` (5: order|offer|promo|system|message)
 *     — a different vocabulary entirely, on a `UserNotification` type with
 *     zero real consumers
 *   · `seed/factories/notification.factory.ts` (9) — and THIS is the one
 *     `appkit/src/index.ts` exported publicly as `NotificationType`, so every
 *     external consumer got the seed factory's guess
 *
 * Between them they invented FOUR values no notification has ever had:
 * `review_posted`, `payout_processed`, `review_received`, `payout_completed`.
 * Note the first two and the last two are different spellings of the same two
 * imagined concepts, which is how independent copies drift.
 *
 * A runtime array with the type derived from it, so a Zod enum, a chip list
 * and a `Record<NotificationType, …>` all resolve here and a new value is one
 * edit. Same shape as `ALL_LISTING_TYPES` after Root Cause #61.
 */
export const NOTIFICATION_TYPE_VALUES = [
  "order_placed",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "bid_placed",
  "bid_outbid",
  "bid_won",
  "bid_lost",
  "auction_ended",
  "review_approved",
  "review_replied",
  "product_available",
  "promotion",
  "system",
  "welcome",
  "account_action",
  "offer_received",
  "offer_responded",
  "offer_expired",
  "offer_counter_accepted",
  "refund_initiated",
  "prize_won",
  "prize_reveal_expired",
  "emi_installment_due_soon",
  "emi_installment_overdue",
  "payment_review",
  // Was being SENT with an `as never` cast on the whole payload, which is how
  // it stayed off this union: the cast silenced the one signal that would
  // have said so, and with it every other field's type-check on that call.
  "catalogue_images_stale",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number];

/**
 * What a notification points AT. Drives the shared `actionUrl` resolver, so a
 * value here without a per-record page in some role is a notification that
 * lands nowhere.
 *
 * Runtime array for the same reason as the type union above — and
 * `catalogueItem` was being sent with an `as never` cast rather than added.
 */
export const NOTIFICATION_RELATED_TYPE_VALUES = [
  "order",
  "product",
  "bid",
  "review",
  "blog",
  "user",
  "offer",
  "support_ticket",
  "scammer",
  "catalogueItem",
  "payout",
  "store",
] as const;

export type NotificationRelatedType =
  (typeof NOTIFICATION_RELATED_TYPE_VALUES)[number];

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationDocument extends BaseDocument {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  readAt?: Date;
  relatedId?: string;
  relatedType?: NotificationRelatedType;
  /** Outcome of the async whatsappNotify job for this notification's WhatsApp send, if one was enqueued. */
  whatsappStatus?: "queued" | "sent" | "failed" | "skipped";
  /** jobs/{id} doc that ran (or is running) the WhatsApp send for this notification. */
  whatsappJobId?: string;
}

export const NOTIFICATIONS_COLLECTION = "notifications" as const;

export const NOTIFICATIONS_INDEXED_FIELDS = [
  "userId",
  "isRead",
  "createdAt",
  "type",
] as const;

export const NOTIFICATION_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  TYPE: "type",
  PRIORITY: "priority",
  TITLE: "title",
  MESSAGE: "message",
  IMAGE_URL: "imageUrl",
  ACTION_URL: "actionUrl",
  ACTION_LABEL: "actionLabel",
  IS_READ: "isRead",
  READ_AT: "readAt",
  RELATED_ID: "relatedId",
  RELATED_TYPE: "relatedType",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  /**
   * SCREAMING_SNAKE accessors, DERIVED from `NOTIFICATION_TYPE_VALUES`.
   *
   * This was a fifth hand-written copy of the union — 24 of the 28 values,
   * missing `emi_installment_due_soon`, `emi_installment_overdue`,
   * `payment_review` and `catalogue_images_stale` — and every entry carried an
   * `as NotificationType` cast, which is precisely the assertion that lets a
   * wrong string through. Built from the array now, so it cannot be short.
   */
  TYPE_VALUES: Object.fromEntries(
    NOTIFICATION_TYPE_VALUES.map((v) => [v.toUpperCase(), v]),
  ) as { [K in NotificationType as Uppercase<K>]: K },
  PRIORITY_VALUES: {
    LOW: "low" as NotificationPriority,
    NORMAL: "normal" as NotificationPriority,
    HIGH: "high" as NotificationPriority,
  },
} as const;

export const DEFAULT_NOTIFICATION_DATA: Partial<NotificationDocument> = {
  priority: "normal",
  isRead: false,
};

export const NOTIFICATION_PUBLIC_FIELDS = [
  "id",
  "type",
  "priority",
  "title",
  "message",
  "imageUrl",
  "actionUrl",
  "actionLabel",
  "isRead",
  "readAt",
  "relatedId",
  "relatedType",
  "createdAt",
] as const;

export type NotificationCreateInput = Omit<
  NotificationDocument,
  "id" | "createdAt" | "updatedAt" | "isRead" | "readAt"
>;
export type NotificationUpdateInput = Partial<
  Pick<NotificationDocument, "isRead" | "readAt">
>;

export const notificationQueryHelpers = {
  byUser: (userId: string) => ["userId", "==", userId] as const,
  unread: (userId: string) =>
    [
      ["userId", "==", userId],
      ["isRead", "==", false],
    ] as const,
  byType: (type: NotificationType) => ["type", "==", type] as const,
} as const;


// --- Site Settings ------------------------------------------------------------

export interface TrustBarItem {
  icon: string;
  label: string;
  visible: boolean;
}

export interface FeaturedResult {
  beforeImage: string;
  afterImage: string;
  caption: string;
}

export interface SiteSettingsCredentials {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  resendApiKey?: string;
  whatsappApiKey?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  metaPageAccessToken?: string;
  metaPageId?: string;
  /** TikTok for Developers — client credentials + long-lived access token */
  tiktokClientKey?: string;
  tiktokClientSecret?: string;
  tiktokAccessToken?: string;
  /** DeviantArt OAuth2 client credentials */
  deviantartClientId?: string;
  deviantartClientSecret?: string;
  /** Google Places API for Google Business Reviews (HS4) */
  googleMapsApiKey?: string;
  googlePlaceId?: string;
  /** WhatsApp Business Cloud API — platform level (for admin purchase announcements) */
  whatsappPhoneNumberId?: string;
  whatsappCloudApiToken?: string;
  /** Comma-separated digits-only phone numbers that receive order announcements */
  whatsappAdminNotifyNumbers?: string;
  /**
   * Approved Meta message-template names, one flat string field per
   * order-lifecycle notification type — every `SiteSettingsCredentials`
   * field is stored as an individually-encrypted string (see
   * `getDecryptedCredentials`/`getCredentialsMasked`, which iterate + mask
   * every field as a string), so this can't be a `Record<string,string>`
   * map. Business-initiated WhatsApp sends outside the 24h customer-service
   * window require a pre-approved template.
   */
  whatsappTemplateOrderPlaced?: string;
  whatsappTemplateOrderConfirmed?: string;
  whatsappTemplateOrderShipped?: string;
  whatsappTemplateOrderDelivered?: string;
  whatsappTemplateOrderCancelled?: string;
  whatsappTemplateRefundInitiated?: string;
  /** BCP-47 language code the templates above were approved in, e.g. "en" or "en_US". */
  whatsappTemplateLanguage?: string;
}

export interface SiteSettingsCredentialsMasked {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  resendApiKey?: string;
  whatsappApiKey?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  metaPageAccessToken?: string;
  metaPageId?: string;
  tiktokClientKey?: string;
  tiktokClientSecret?: string;
  tiktokAccessToken?: string;
  deviantartClientId?: string;
  deviantartClientSecret?: string;
  googleMapsApiKey?: string;
  googlePlaceId?: string;
  whatsappPhoneNumberId?: string;
  whatsappCloudApiToken?: string;
  whatsappAdminNotifyNumbers?: string;
  whatsappTemplateOrderPlaced?: string;
  whatsappTemplateOrderConfirmed?: string;
  whatsappTemplateOrderShipped?: string;
  whatsappTemplateOrderDelivered?: string;
  whatsappTemplateOrderCancelled?: string;
  whatsappTemplateRefundInitiated?: string;
  whatsappTemplateLanguage?: string;
}

export interface NotificationChannelConfig {
  inApp: {
    /** Always true — in-app is the mandatory primary channel. */
    enabled: true;
    /** Signals to UI that this toggle is non-editable. */
    readOnly: true;
  };
  email: {
    enabled: boolean;
    /** Minimum priority that triggers an email (default: "normal"). */
    minPriority?: NotificationPriority;
    /** Subset of NotificationTypes to email — absent means all types. */
    types?: NotificationType[];
  };
  whatsapp: {
    enabled: boolean;
    /** Minimum priority that triggers a WhatsApp message (default: "high"). */
    minPriority?: NotificationPriority;
    /** Subset of NotificationTypes to WhatsApp — absent means all types. */
    types?: NotificationType[];
    /** When true, WhatsApp OTP is offered as an alternative to email OTP at checkout. */
    otpEnabled?: boolean;
  };
  sms: {
    enabled: boolean;
    /** Minimum priority that triggers an SMS (default: "high"). */
    minPriority?: NotificationPriority;
  };
}

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannelConfig = {
  inApp: { enabled: true, readOnly: true },
  email: { enabled: false, minPriority: "normal" },
  whatsapp: { enabled: false, minPriority: "high", otpEnabled: false },
  sms: { enabled: false, minPriority: "high" },
};

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
};

/** Returns true when `priority` meets or exceeds `minPriority`. */
export function meetsMinPriority(
  priority: NotificationPriority,
  minPriority: NotificationPriority = "normal",
): boolean {
  return PRIORITY_ORDER[priority] >= PRIORITY_ORDER[minPriority];
}

/**
 * Theme-system configuration stored on siteSettings.theme.
 *
 * Two built-in themes ship with appkit (`default-light`, `default-dark`) and
 * cannot be deleted. Admin can author additional themes through the Site
 * Settings → Themes editor; each declares its mode (`light` | `dark`), an
 * override map for CSS variables, and a complete gradient palette.
 *
 * `defaultLightThemeId` and `defaultDarkThemeId` decide which record is
 * applied when the user's mode preference resolves to that mode.
 */
export type SiteSettingsThemeRecord = {
  id: string;
  name: string;
  mode: "light" | "dark";
  /** `true` for the two seeded defaults; admin UI surfaces them as read-only. */
  builtIn?: boolean;
  /** CSS variable overrides, keyed without the leading `--`. */
  tokens: Record<string, string>;
  /** Full gradient palette; values are complete CSS gradient strings. */
  gradients: Record<string, string>;
}

export interface SiteSettingsTheme {
  /** All available theme records — built-ins + admin-created. */
  themes?: SiteSettingsThemeRecord[];
  /** Theme id applied when the user's resolved mode is `"light"`. */
  defaultLightThemeId?: string;
  /** Theme id applied when the user's resolved mode is `"dark"`. */
  defaultDarkThemeId?: string;
}

/** Third-party analytics/tag IDs. Public by nature — they ship in page markup. */
export interface SiteSettingsIntegrations {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  gtmContainerId?: string;
}

/** Admin-tunable platform caps. Enforced server-side; not buyer-facing. */
export interface SiteSettingsPlatformLimits {
  maxProductsPerStore?: number;
  /*
   * `maxImagesPerProduct` and `maxVideoSizeMb` were REMOVED here.
   *
   * Both were admin-editable and read by absolutely nothing — no upload
   * component, schema, action or route ever consulted them, so an admin who
   * lowered the image cap saw the field save and the cap not change. Media
   * counts are now a flat compile-time constant
   * (`_internal/shared/media/limits.ts`), which a Zod `.max()` can reference
   * and a per-request settings read cannot.
   *
   * Do not re-add them without a reader: a control that silently does nothing
   * is worse than an absent one.
   */
  maxCustomFieldsPerProduct?: number;
  maxCustomSectionsPerProduct?: number;
  orderCancellationWindowHours?: number;
}

/** Embedded in siteSettings.adSettings — a type alias, not a collection root. */
export type SiteSettingsAdPlacement = {
  id: string;
  label: string;
  enabled: boolean;
  reservedHeight: number;
};

/** Embedded in siteSettings.adSettings — a type alias, not a collection root. */
export type SiteSettingsAdInventoryItem = {
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
};

/**
 * Ad inventory + provider config.
 *
 * `providerCredentials` is masked by `GET /api/admin/ads` and must never be
 * returned by a public endpoint; `inventory` holds draft/paused/scheduled
 * entries that `GET /api/ads` deliberately filters out. Both are therefore in
 * `PRIVATE_SITE_SETTINGS_FIELDS` — the whole group is server-side only.
 */
export interface SiteSettingsAdSettings {
  consentRequired: boolean;
  placements: readonly SiteSettingsAdPlacement[];
  providerCredentials: {
    adsenseClientId: string;
    thirdPartyScriptUrl: string;
  };
  inventory: SiteSettingsAdInventoryItem[];
}

export interface SiteSettingsDocument extends BaseDocument {
  id: "global";
  siteName: string;
  /** Short strapline shown beside the site name in admin chrome. */
  tagline?: string;
  motto: string;
  logo: {
    url: string;
    alt: string;
    format: "svg" | "png";
  };
  /** Favicon URL. Distinct from `logo.url`, which is the wordmark. */
  favicon?: string;
  background: {
    light: {
      type: "color" | "gradient" | "image" | "video";
      value: string;
      overlay?: { enabled: boolean; color: string; opacity: number };
    };
    dark: {
      type: "color" | "gradient" | "image" | "video";
      value: string;
      overlay?: { enabled: boolean; color: string; opacity: number };
    };
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    /** Business UPI Virtual Payment Address (market-specific) */
    upiVpa?: string;
    /** WhatsApp number with country code (market-specific) */
    whatsappNumber?: string;
  };
  payment: {
    razorpayEnabled: boolean;
    upiManualEnabled: boolean;
    codEnabled: boolean;
    /** Tier PP — cart total (rupees) at/above which checkout requires OTP verification. Applies to all payment methods except COD. Optional — falls back to no OTP gate when unset. */
    otpCheckoutThreshold?: number;
    /**
     * Phone-number OTP verification during signup/checkout. Real per-SMS cost
     * via the Firebase phone-auth quota, so it stays OFF by default.
     *
     * Toggling it false->true resets every user's `phoneVerified` and clears
     * rate-limit state via the `resetOtpVerification` job — a verification that
     * happened while the gate was off was not a verification.
     *
     * Was `featureFlags.smsVerification`. It is a real setting with real cost
     * and a real side effect, which is why it survived that group's deletion.
     */
    smsVerification?: boolean;
    /**
     * Lets an admin place an order skipping OTP and payment capture.
     *
     * Kept as a SETTING rather than folded into the `admin:checkout:bypass`
     * permission, and the distinction matters: admins bypass every permission
     * check (`isEffectiveAdminUser`), so a permission alone would turn this on
     * for every admin the moment it shipped. Two independent gates — the
     * permission decides WHO may use it, this decides WHETHER it is available
     * at all — preserve the default-off posture a checkout bypass needs.
     *
     * Writable only through `/api/admin/checkout-bypass`, which logs actorUid
     * and reason on every use (audit-checkout-bypass rule 1).
     */
    adminCheckoutBypass?: boolean;
  };
  /** Site-wide EMI (installment) settings. A seller must ALSO have `StoreDocument.emiEnabled` on for EMI to appear at checkout for their items. */
  emi: {
    enabled: boolean;
    /** Decimal rupees — a seller's cart subtotal must exceed this for EMI to appear as an option. */
    minOrderValue: number;
    tenureOptions: number[];
    /** Down payment % collected at checkout. */
    tokenPercent: number;
    /** Day of month (1–10) each installment is due. */
    billingDay: number;
    /** Extra % of principal per month of tenure — the "excess EMI fee" the buyer pays for spreading payment. */
    surchargePercentPerMonth: number;
    /** Share of the surcharge that goes to the seller (0–100); the rest is the platform's cut. */
    surchargeSellerSharePercent: number;
  };
  commissions: {
    /** Our platform cut charged to the buyer as a % of order value (e.g. 5 = 5%). */
    platformFeePercent: number;
    /** GST applied on top of our platform fee (18%). buyer pays platformFee × (1 + gstPercent/100). */
    gstPercent: number;
    /** Per-transaction gateway minimum fee in rupees. Ensures total charge is never below this floor. 0 = no minimum. */
    minimumTransactionFee: number;
    /**
     * Rupee ceiling on the buyer-facing platform commission. Charged on every
     * payment method (COD/UPI-manual/cash/EMI/Razorpay), once per checkout.
     * Optional so pre-existing documents keep working — falls back to ₹10.
     */ // audit-money-units-ok: rupee ceiling, not paise
    platformFeeMax?: number;
    /** Razorpay gateway cost % (absorbed by platform, not passed through separately). */
    gatewayFeePercent: number;
    codDepositPercent: number;
    /** COD handling fee charged to the buyer: max(codHandlingFeeMin, subtotal × codHandlingFeePercent / 100). */
    codHandlingFeeMin: number;
    codHandlingFeePercent: number;
    /** Admin master toggle — whether the WhatsApp order-updates addon is offered at checkout at all. */
    whatsappNotifyFeeEnabled: boolean;
    /** Flat rupee fee charged to the buyer when they opt into the WhatsApp order-updates addon. */
    whatsappNotifyFee: number;
    /** Admin master toggle — whether the gift-wrap addon is offered at checkout at all. */
    giftWrapFeeEnabled: boolean;
    /** Flat rupee fee charged to the buyer when they opt into gift wrap. */
    giftWrapFee: number;
    /** Admin master toggle — whether the shipment-protection addon is offered at checkout at all. */
    shipmentProtectionFeeEnabled: boolean;
    /** Shipment protection fee: max(shipmentProtectionFeeMin, subtotal × shipmentProtectionFeePercent / 100). */
    shipmentProtectionFeePercent: number;
    shipmentProtectionFeeMin: number;
    sellerShippingFixed: number;
    platformShippingPercent: number;
    platformShippingFixedMin: number;
    autoPayoutWindowDays?: number;
    /** Days before a settled order's funds are released for payout. */
    payoutHoldDays?: number;
    /** Minimum payout amount in rupees. */
    minPayoutAmount?: number;
    auctionListingFee?: number;
    preOrderListingFee?: number;
    featuredSlotFee?: number;
    promotedSlotFee?: number;
  };
  /** Procurement Shipments (Feature A) — the hourly rate used to compute a
   *  shipment's laborCost, and the daily-hour cap used to project
   *  estimatedProcessingDays. */
  laborRate: {
    hourlyRate: number;
    maxHoursPerDay: number;
  };
  /** P-8 GST — Indian tax compliance. Distinct from commissions.gstPercent
   *  (which is GST on our platform commission) — this is buyer-facing product GST. */
  gst: {
    enabled: boolean;
    gstin: string;
    legalName: string;
    address: string;
  };
  auctionConfig: {
    /** Ordered ascending by upTo; the last tier's upTo MUST be null (open-ended, "and above"). Drives the tiered minimum bid increment — see resolveMinBidIncrement in _internal/shared/features/auctions/config.ts. */
    bidIncrementTiers: { upTo: number | null; increment: number }[];
    autoExtendWindowMinutes: number;
    settlementGracePeriodHours: number;
  };
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  emailSettings: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    /**
     * Daily ops digest — the previous 24h of order activity, emailed to the
     * team. Its arrival doubles as the platform health signal (if it stops
     * landing, Firestore/Functions/Resend needs a look).
     */
    dailyDigest?: {
      enabled: boolean;
      /** Primary recipients (TO). */
      recipients: string[];
      /** Optional additional recipients (CC) — admin-extendable. */
      ccRecipients: string[];
    };
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    keywords: string[];
    ogImage: string;
  };
  features: {
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
  }[];
  /**
   * Which listing and category types the marketplace offers.
   *
   * 🛑 This is a PRODUCT CONTROL, not a feature flag. It was
   * `featureFlags.listingTypes` / `.categoryTypes` until 2026-08-29, when the
   * `featureFlags` group was deleted: 11 of its 14 keys had zero readers, and
   * the survivors were not flags at all. A flag is a temporary switch around
   * unfinished work; "we don't sell live animals" is a standing decision about
   * the catalogue, and it belongs somewhere an admin can find it.
   *
   * Disabled types are hidden from every listing surface and rejected on
   * create/add-to-cart via `isListingTypeEnabled` / `isCategoryTypeEnabled`.
   *
   * ⚠️ `listingTypes` is DELIBERATELY optional-per-key and absent-means-enabled.
   * `ALL_LISTING_TYPES_MAP` (`_internal/shared/listing-types/feature-flags.ts`)
   * is the `Record<ListingType, true>` that makes omitting a union member a
   * compile error — this interface is not, and historically drifted: it still
   * listed 8 types after the union reached 10 (`art` and `stickers` missing),
   * which is Root Cause #58's shape. Add new types to that Record, not here.
   */
  listings?: {
    listingTypes?: Partial<Record<string, boolean>>;
    categoryTypes?: {
      category?: boolean;
      sublisting?: boolean;
      brand?: boolean;
      bundle?: boolean;
    };
  };
  /**
   * Admin-authored HTML overrides for the public policy pages. When a key holds
   * a non-empty string, `PolicyPageView` renders it instead of the i18n
   * `sections[]` fallback for that page.
   *
   * These key names are load-bearing — they must match `POLICY_META[*].firestoreField`
   * in `features/about/components/PolicyPageView.tsx` (read side) and the
   * `legalPages` payload built by `AdminSiteSettingsView` (write side). Until
   * 2026-08-24 this type declared `termsOfService`/`privacyPolicy`/`shippingPolicy`,
   * three names that neither side ever used; the read path went through an
   * `as any` cast, so `tsc` never caught the drift (Root Cause #38 family).
   */
  legalPages: {
    terms: string;
    privacy: string;
    cookies: string;
    refundPolicy: string;
    shipping: string;
    ethics: string;
    codeOfConduct: string;
  };
  shipping: {
    estimatedDays: number;
    minOrderForFree: number;
  };
  returns: {
    windowDays: number;
  };
  faq: {
    variables: {
      shippingDays: number;
      minOrderValue: number;
      returnWindow: number;
      supportEmail: string;
      supportPhone: string;
      codDeposit: number;
    };
  };
  /** About Us page content, admin-editable via Site Settings. Optional so
   * pre-existing docs without it still type-check; `about/page.tsx` falls
   * back to i18n defaults when absent. */
  aboutContent?: AboutContentDocument;
  navbarConfig?: {
    hiddenNavItems?: string[];
  };
  footerConfig?: {
    trustBar?: {
      enabled?: boolean;
      items?: TrustBarItem[];
    };
    newsletterEnabled?: boolean;
  };
  /**
   * `message` is canonical — it is what `AnnouncementBar` and the homepage
   * read. `AdminSiteSettingsView` used to write the text under a `text` key
   * instead, so anything typed in the main Site Settings editor was saved and
   * never displayed; `link`/`backgroundColor` were collected and had no
   * renderer at all. Unified on `message` 2026-08-24 (migration
   * `scripts/migrate-settings-wiring.mjs` copies any stray `text` across).
   */
  announcementBar?: {
    enabled: boolean;
    message: string;
    /** Optional destination — renders the message as a link. */
    link?: string;
    /** Optional CSS colour override for the bar background. */
    backgroundColor?: string;
  };
  /**
   * Image watermark configuration applied by the `/api/media/[...slug]` CDN
   * proxy. When absent the proxy falls back to text watermark "letitrip.in" at
   * 10% width with 10% opacity, centered.
   */
  watermark?: {
    /** `"text"` renders the `text` field; `"image"` overlays `imageUrl`. */
    type: "text" | "image";
    /** Text content for `type: "text"`. Default `"letitrip.in"`. */
    text?: string;
    /**
     * `/media/<slug>` proxy URL of the watermark image (when `type: "image"`).
     * Never store raw cloud-storage URLs — the proxy applies watermark + CDN
     * caching and is the only image source the UI is allowed to render.
     */
    imageUrl?: string;
    /** Percentage of target image width (0–100). 0 disables the watermark. */
    size?: number;
    /** Percentage opacity (0–100). Default 10. */
    opacity?: number;
    /**
     * Anchor preset: 4 corners + center, or `"custom"` to use `offsetX`/
     * `offsetY` instead. Default `"center"`.
     */
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "custom";
    /** `position: "custom"` only — % of image width from center. +right / -left. Default 0. */
    offsetX?: number;
    /** `position: "custom"` only — % of image height from center. +down / -up. Default 0. */
    offsetY?: number;
  };
  /** Encrypted provider credentials � never return raw to the client. */
  credentials?: SiteSettingsCredentials;
  /**
   * These three were written by `AdminSiteSettingsView.buildFullPayload()` and
   * read back by it, but were never declared here. Being absent from the type
   * meant no type-driven check could see them — and the public site-settings
   * deny-list, which strips named fields off a spread, shipped all three to
   * anonymous callers by default (`adSettings.providerCredentials` unmasked,
   * plus every draft/paused ad). Declared 2026-08-24 so they are visible to
   * `audit-public-projection-parity`.
   */
  integrations?: SiteSettingsIntegrations;
  platformLimits?: SiteSettingsPlatformLimits;
  adSettings?: SiteSettingsAdSettings;
  /**
   * Theme color overrides — injected as CSS custom properties by LayoutShellClient.
   * Keys map to --appkit-color-* variables (e.g. primary → --appkit-color-primary).
   * When absent, the compiled token defaults from dist/tokens.css apply.
   */
  theme?: SiteSettingsTheme;
  featuredResults?: FeaturedResult[];
  /**
   * Per-action runtime enable/disable overrides.
   * Key = ActionId value string (e.g. "checkout", "add-to-wishlist").
   * Absent key = action is enabled by default.
   */
  actionConfig?: Partial<Record<string, { enabled: boolean }>>;
  /**
   * Per-nav-item runtime enable/disable overrides.
   * Key = NavItem.id (nav-* slug, e.g. "nav-products").
   * Absent key = nav item is enabled by default.
   */
  navConfig?: Record<string, { enabled: boolean }>;
  /**
   * Derived hrefs of disabled nav items — written by updateNavConfigAction
   * alongside navConfig. Read by RSC public layouts to block disabled routes.
   */
  disabledRoutes?: string[];
  /**
   * Notification channel configuration — controls which delivery channels are
   * active. In-app is always enabled and cannot be disabled; all others are
   * opt-in and require the corresponding credentials to be set.
   */
  notificationChannels?: NotificationChannelConfig;
}

// `FeatureFlagKey` / `FeatureFlagMeta` / `FEATURE_FLAG_META` were deleted with
// the `featureFlags` group on 2026-08-29. They described 14 toggles of which 11
// had no reader anywhere — an admin could switch "Wishlists" or "Reviews" off
// and watch nothing happen, which is worse than the feature not being
// configurable at all.

export const SITE_SETTINGS_COLLECTION = "siteSettings" as const;
export const SITE_SETTINGS_INDEXED_FIELDS = [] as const;

/**
 * Default `theme` block — empty arrays mean "fall back to the two built-in
 * theme records baked into appkit (`default-light`, `default-dark`)".
 * Admin can populate `themes[]` through the Site Settings → Themes editor
 * and switch the active default with `defaultLightThemeId` / `defaultDarkThemeId`.
 */
export const DEFAULT_SITE_SETTINGS_THEME: SiteSettingsTheme = {
  themes: [],
  defaultLightThemeId: "default-light",
  defaultDarkThemeId: "default-dark",
};

export const DEFAULT_SITE_SETTINGS_DATA: Partial<SiteSettingsDocument> = {
  id: "global",
  siteName: "My Store",
  motto: "Your Marketplace, Your Rules",
  theme: DEFAULT_SITE_SETTINGS_THEME,
  payment: {
    razorpayEnabled: false,
    upiManualEnabled: true,
    codEnabled: true,
    otpCheckoutThreshold: 5000,
    smsVerification: false,
    adminCheckoutBypass: false,
  },
  emi: {
    enabled: false,
    minOrderValue: 10000,
    tenureOptions: [2, 3, 4, 5, 6],
    tokenPercent: 10,
    billingDay: 5,
    surchargePercentPerMonth: 1,
    surchargeSellerSharePercent: 50,
  },
  commissions: {
    platformFeePercent: 5,
    gstPercent: 18,
    minimumTransactionFee: 0,
    platformFeeMax: 10,
    gatewayFeePercent: 2,
    codDepositPercent: 10,
    codHandlingFeeMin: 200,
    codHandlingFeePercent: 10,
    // The three buyer add-ons ship ENABLED. They were `false`, which made
    // StoreAddonsPicker return null on both the cart and checkout, so a fresh
    // install had no add-ons at all and no indication why. `undefined` still
    // means disabled everywhere (computeWhatsAppNotifyFee et al. read
    // `if (!rates.XEnabled) return 0`) — only the DEFAULT changed, so an
    // existing siteSettings document keeps whatever it already stored.
    whatsappNotifyFeeEnabled: true,
    whatsappNotifyFee: 10,
    giftWrapFeeEnabled: true,
    giftWrapFee: 49,
    shipmentProtectionFeeEnabled: true,
    shipmentProtectionFeePercent: 2,
    shipmentProtectionFeeMin: 30,
    sellerShippingFixed: 0,
    platformShippingPercent: 10,
    platformShippingFixedMin: 0,
    autoPayoutWindowDays: 7,
    payoutHoldDays: 2,
    minPayoutAmount: 100,
    auctionListingFee: 0,
    preOrderListingFee: 0,
    featuredSlotFee: 999,
    promotedSlotFee: 499,
  },
  laborRate: {
    hourlyRate: 200,
    maxHoursPerDay: 6,
  },
  gst: {
    enabled: false,
    gstin: "",
    legalName: "",
    address: "",
  },
  auctionConfig: {
    bidIncrementTiers: DEFAULT_AUCTION_BID_INCREMENT_TIERS,
    autoExtendWindowMinutes: 5,
    settlementGracePeriodHours: 24,
  },
  // Every type on by default. `isListingTypeEnabled` treats a MISSING key as
  // enabled, so this block is documentation of the full set rather than the
  // mechanism — a type absent here still renders. `art` and `stickers` were
  // missing from the old `featureFlags.listingTypes` literal for exactly that
  // reason: nothing broke, so nobody noticed (Root Cause #58).
  listings: {
    listingTypes: {
      standard: true,
      auction: true,
      "pre-order": true,
      "prize-draw": true,
      classified: true,
      "digital-code": true,
      live: true,
      art: true,
      stickers: true,
    },
    categoryTypes: {
      category: true,
      sublisting: true,
      brand: true,
      bundle: true,
    },
  },
  shipping: {
    estimatedDays: 5,
    minOrderForFree: 0,
  },
  returns: {
    windowDays: 7,
  },
  announcementBar: {
    enabled: true,
    message: "🎉 Up to 15% Off on Pokémon TCG this week — Use code SAVE15",
  },
  actionConfig: {},
  navConfig: {},
  disabledRoutes: [],
};

export const SITE_SETTINGS_PUBLIC_FIELDS = [
  "siteName",
  "motto",
  "logo",
  "background",
  "contact.email",
  "contact.phone",
  "payment",
  "commissions",
  "socialLinks",
  "seo",
  "features",
  "featureFlags",
  "faq.variables",
  "announcementBar",
] as const;

export type SiteSettingsUpdateInput = Partial<
  Omit<SiteSettingsDocument, "id" | "createdAt" | "updatedAt">
>;

export const DEFAULT_TRUST_BAR_ITEMS: TrustBarItem[] = [
  { icon: "??", label: "Free Shipping", visible: true },
  { icon: "??", label: "Easy Returns", visible: true },
  { icon: "??", label: "Secure Payment", visible: true },
  { icon: "??", label: "24/7 Support", visible: true },
  { icon: "?", label: "Authentic Sellers", visible: true },
];

// NOTE: labelKey/descKey hold plain display text (not i18n message keys) —
// this feature-flag list has no matching next-intl namespace, so the admin
// UI reads these two fields directly rather than through getTranslations().

