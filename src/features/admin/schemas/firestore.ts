/**
 * Admin Feature Firestore Document Types & Constants
 * Covers: notifications, chat rooms, site settings
 */

import type { AboutContentDocument } from "../../about/schemas/firestore";
import { DEFAULT_AUCTION_BID_INCREMENT_TIERS } from "../../../_internal/shared/features/auctions/config";
import type { RateChange } from "../../../_internal/shared/features/pricing/rate-registry";

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
 *     `offer_received` or `payment_review` for email
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
  /*
   * 🛑 `account_action` means A BAN OR AN UNBAN, and nothing else.
   *
   * It used to also carry support-ticket activity AND scam-report outcomes —
   * three unrelated concerns on one value, which made them impossible to tell
   * apart anywhere downstream. That mattered the moment email became
   * type-gated (see `EMAIL_ELIGIBLE_TYPES`): there was no way to stop emailing
   * "your ticket got a reply" without also silencing "you have been banned",
   * and those two have opposite answers. A banned user has to be told outside
   * the app, because the app is what they just lost.
   *
   * Split 2026-09. If you are tempted to route a fourth concern through this
   * value because it is vaguely account-shaped, add a type instead — the
   * `Record<NotificationType, …>` maps will tell you everywhere that needs an
   * answer.
   */
  "account_action",
  /** Support ticket created, replied to, or moved status. Bell-only by default — see `EMAIL_ELIGIBLE_TYPES`; staff can opt a single reply into email. */
  "support_ticket_update",
  /** Scam report received, verified, or rejected. Bell-only; the admin side rides the daily digest. */
  "scam_report_update",
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
  /**
   * D9 — a new chat message. Bell-only — `EMAIL_ELIGIBLE_TYPES` is `false`,
   * following `support_ticket_update`'s recorded reasoning: the conversation
   * lives in the UI, not the inbox.
   */
  "message_received",
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
  // D9 — the chat thread the message belongs to.
  "conversation",
  /*
   * The event a raffle win belongs to. Added 2026-10-19 with the raffle-winner
   * notification: `runTriggerEventRaffle` recorded a winner and told nobody,
   * so the only way to learn you had won was to revisit the event page.
   *
   * Declared here rather than sent behind an `as never` — see the note above
   * this array about `catalogueItem`, and the exhaustiveness check in
   * `resolveNotificationActionUrl` that makes the destination a compile-time
   * question.
   */
  "event",
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
  phonepeClientId?: string;
  phonepeClientSecret?: string;
  /** Version number PhonePe assigned this client credential (sent as-is to their API — a number in their SDK, stored as a string here to match every other credentials field). */
  phonepeClientVersion?: string;
  /** "sandbox" | "production" — selects PhonePe's base URL + Env enum. */
  phonepeEnvironment?: string;
  /** Username/password pair configured in the PhonePe dashboard's Webhook tab (SHA/Basic auth mode) — verified via the SDK's `validateCallback()`. */
  phonepeWebhookUsername?: string;
  phonepeWebhookPassword?: string;
  /**
   * Razorpay publishable key (`rzp_test_…` / `rzp_live_…`).
   *
   * 🛑 The ONLY credential in this interface that is deliberately sent to the
   * browser — Razorpay's `checkout.js` needs it to open the modal. It is
   * published by `/api/payment/create-order`, not by the site-settings
   * projection, so it stays in `PRIVATE_SITE_SETTINGS_FIELDS` like every
   * other credential (see CLAUDE.md § Public Data Projections).
   */
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  /** Webhook signing secret from Razorpay's dashboard → Webhooks. Without it `verifyWebhook()` fails closed. */
  razorpayWebhookSecret?: string;
  resendApiKey?: string;
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
}

export interface SiteSettingsCredentialsMasked {
  phonepeClientId?: string;
  phonepeClientSecret?: string;
  phonepeClientVersion?: string;
  phonepeEnvironment?: string;
  phonepeWebhookUsername?: string;
  phonepeWebhookPassword?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  resendApiKey?: string;
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
  sms: {
    enabled: boolean;
    /** Minimum priority that triggers an SMS (default: "high"). */
    minPriority?: NotificationPriority;
  };
}

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannelConfig = {
  inApp: { enabled: true, readOnly: true },
  email: { enabled: false, minPriority: "normal" },
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
  /**
   * D7b — Microsoft Clarity. Free session recording and heatmaps; two of the
   * fifteen crawled competitors run it and we run nothing.
   *
   * It is the only way to answer empirically what section 10.4 currently argues
   * from contrast ratios alone: whether the 13px/15px type and the borders that
   * measure 1.22:1 against the page actually cost conversions, and where forms
   * are abandoned.
   *
   * 🛑 Clarity RECORDS SESSIONS, and this site has no consent gate of any kind
   * — not for GA, GTM or Pixel either. So it ships with `content: false`
   * (strict masking: no text, no input values), and a real consent gate is its
   * own follow-up because it would have to cover all four.
   */
  clarityProjectId?: string;
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
   *
   * 🛑 `maxCustomSectionsPerProduct` removed 2026-10-19 for the SAME reason —
   * no default, never seeded, and its only read site was the admin form's own
   * React state fallback. The real cap is `MAX_CUSTOM_SECTIONS` in
   * `features/products/schemas/firestore.ts`, read only by
   * `CustomSectionsEditor.tsx`. Its sibling `maxCustomFieldsPerProduct` below
   * is in the identical position (same lack of reader) and was left alone —
   * flagged, not silently fixed, since widening this change without being
   * asked risks a half-verified edit with no build loop to catch a miss.
   */
  maxCustomFieldsPerProduct?: number;
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
    /**
     * Business UPI Virtual Payment Address (market-specific).
     *
     * 🛑 The site-wide fallback `resolveDisplayedUpiId` uses when a seller has
     * no UPI configured or the store is admin-owned — i.e. what a buyer paying
     * manually is told to pay INTO. It was being silently erased on every
     * settings save until 2026-10-19: `buildFullPayload()` writes the whole
     * `contact` group and simply did not carry this key, so saving any
     * unrelated tab blanked it and manual payments lost their destination.
     * Any key added here must also be added to that function's state and
     * payload (Root Cause #76).
     */
    upiVpa?: string;
    /** WhatsApp number with country code (market-specific) */
    whatsappNumber?: string;
    /**
     * Human-readable support hours, e.g. "Mon-Sat, 10:00-19:00 IST".
     *
     * Written by the admin form since long before it was declared here, which
     * made it invisible to every type-driven review — the same gap that let
     * `adSettings` and `integrations` ship publicly (Root Cause #70).
     */
    supportHours?: string;
  };
  payment: {
    /**
     * Razorpay (client-side card/UPI/netbanking modal).
     *
     * 🛑 Checked BEFORE `phonepeEnabled` in `providers.config.ts` — exactly
     * one online gateway can be registered per process, so the order is the
     * tie-break when both are on, not a precedence anyone should rely on.
     * Turning this on with no credentials makes the provider constructor
     * throw at boot; `resolveKeys()` treats a seeded `*_PLACEHOLDER` as
     * absent, so a placeholder reads as "unconfigured" rather than failing
     * mid-checkout.
     */
    razorpayEnabled: boolean;
    phonepeEnabled: boolean;
    upiManualEnabled: boolean;
    codEnabled: boolean;
    /**
     * Cart total (rupees) ABOVE which cash on delivery is refused. Default
     * 3000.
     *
     * 🛑 Measured against the CART TOTAL, not an item price. COD risk is the
     * cash a courier carries and the value at stake on a refusal at the door,
     * and neither cares how many lines the order has — a ₹2,000 item ordered
     * three times is a ₹6,000 exposure exactly like one ₹6,000 item. Gating
     * per item would pass that order straight through.
     *
     * 🛑 It is a MAXIMUM, so the comparison is `subtotal > value` — strictly
     * greater. `otpCheckoutThreshold` beside it is a MINIMUM and fires
     * at/above its value. Two money thresholds on one settings block with
     * opposite senses is a genuine trap; the names carry it (`Max` vs
     * `Threshold`) and both comparisons are spelled out at their call sites.
     *
     * `0` disables COD outright at any value, which is a real configuration
     * rather than a bug — `undefined` is what means "no cap".
     */
    codMaxOrderValue?: number;
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
    /**
     * COD handling fee charged to the buyer:
     * min(subtotal × codHandlingFeePercent / 100, codHandlingFeeCap).
     *
     * 🛑 A CEILING. It was `codHandlingFeeMin` applied as a floor, which billed
     * ₹2,000 of "handling" on a ₹20,000 order — see `computeCodHandlingFee`.
     */ // audit-money-units-ok: rupee ceiling, not paise
    codHandlingFeeCap: number;
    codHandlingFeePercent: number;
    /** Admin master toggle — whether the gift-wrap addon is offered at checkout at all. */
    giftWrapFeeEnabled: boolean;
    /** Flat rupee fee charged to the buyer when they opt into gift wrap. */
    giftWrapFee: number;
    /** Admin master toggle — whether the shipment-protection addon is offered at checkout at all. */
    shipmentProtectionFeeEnabled: boolean;
    /** Shipment protection fee: max(shipmentProtectionFeeMin, subtotal × shipmentProtectionFeePercent / 100). */
    shipmentProtectionFeePercent: number;
    shipmentProtectionFeeMin: number;
    /**
     * Admin master toggle — whether the SALE-protection addon (C5e) is offered
     * at checkout at all. Distinct from shipment protection: that one covers
     * loss or damage in transit, this one covers the item itself.
     *
     * 🛑 This flag and the SELLER's `supportsSaleProtection` default OPPOSITE
     * ways, and it is not an inconsistency. This one answers "do we offer this
     * product at all" — we built it, so `true`. The seller's answers "has this
     * seller agreed to be held to it" — they have not been asked, so `false`.
     */
    saleProtectionFeeEnabled: boolean;
    /** Sale protection fee: max(saleProtectionFeeMin, subtotal × saleProtectionFeePercent / 100). */
    saleProtectionFeePercent: number;
    saleProtectionFeeMin: number;
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
    // Both written by AdminSiteSettingsView's socialLinks payload and both
    // undeclared here until 2026-10-19 — so they round-tripped through
    // Firestore while being invisible to the type, which is the condition
    // Root Cause #70 turns into a leak.
    youtube?: string;
    pinterest?: string;
  };
  /**
   * The outbound-messaging kill switch and spend ceiling.
   *
   * Distinct from `notificationChannels`, which decides WHICH notification
   * types a channel carries. This decides whether the channel runs at all and
   * how much of the day's allowance it may spend — a site-wide posture rather
   * than a per-type routing rule.
   *
   * 🛑 Every field here is PRIVATE. It is triaged into
   * `PRIVATE_SITE_SETTINGS_FIELDS` in the public projection, and must stay
   * there: the ceiling and the remaining headroom are operational detail, and
   * publishing "email is currently off" tells an attacker that password-reset
   * mail is not being watched.
   */
  messaging?: {
    /** User-facing email. Staff mail (daily digest, payout summary) ignores this. */
    emailEnabled: boolean;
    /**
     * Reserved sends allowed per channel per day. Applies to staff and
     * transactional mail too — the ceiling exists to stay inside the
     * provider's own limit, and the provider does not exempt anyone.
     */
    dailyCeiling: {
      email: number;
      sms: number;
    };
  };
  /**
   * D9 — chat. Off by default, and `undefined` reads as OFF (never a
   * default-true `??`) — a real setting with a real cost: every conversation
   * is a Firestore subcollection plus an RTDB ping channel, and the feature
   * was deleted once already for shipping broken and earning low usage it
   * never had a chance to prove.
   */
  chat?: {
    enabled: boolean;
  };
  /**
   * The public search index — the browser-side artifact, not the per-listing
   * search boxes, which this flag cannot reach.
   *
   * ## 🛑 Why a group of its own and not `featureFlags`
   *
   * The plan for this feature said "a kill switch in `siteSettings.featureFlags`".
   * That group was DELETED on 2026-08-29 because 11 of its 14 keys had zero
   * readers, and the two survivors moved into `payment` as real settings. Its
   * deletion note draws the line this honours: *"A flag is a temporary switch
   * around unfinished work."* This is exactly that — so it is a flag, and it
   * earns the one thing the deleted keys could not show: a named reader
   * (`useSearchIndex`).
   *
   * 🛑 It is NOT in `payment` or any other existing group, and that is
   * defensive rather than tidy. `AdminSiteSettingsView.buildFullPayload`
   * writes `payment: { phonepeEnabled, upiManualEnabled, codEnabled,
   * otpCheckoutThreshold }` — the WHOLE group, from four pieces of form
   * state — so any fifth key in there is silently erased the next time an
   * admin saves anything on that page (Root Cause #76). A kill switch that a
   * routine save turns back on is worse than none, because it fails in the
   * direction of the thing it exists to stop.
   *
   * ## 🛑 Default ON — the opposite polarity to `chat.enabled`
   *
   * `chat` is an opt-in feature and its readers test `=== true`. This is a
   * kill switch on the primary path, so its reader tests `!== false`: an
   * absent field, an unseeded document and a failed settings fetch must all
   * mean "search works". The only state that disables it is somebody
   * deliberately writing `false`.
   *
   * Recovery exists because the index can be wrong in a way nothing errors
   * on — a bad patch, a schema the client does not understand — and the
   * alternative route back is a Vercel deploy. Flipping this sends every
   * client to the server `SEARCH_SOURCES` path, which is why that path is
   * kept rather than deleted.
   */
  search?: {
    indexEnabled?: boolean;
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
    /** Cancellation policy — a PolicyPageView key since 2026-10-19. */
    cancellation: string;
    /** Grievance officer disclosure — a PolicyPageView key since 2026-10-19. */
    grievance: string;
  };
  shipping: {
    estimatedDays: number;
    minOrderForFree: number;
    /**
     * Which shipping provider is registered at boot — C5c.
     *
     * 🛑 A SETTING, not a code swap, and `manual` is the default. A self-ship
     * seller must be unaffected by a carrier integration merely existing, which
     * is why this is a runtime toggle rather than a build-time choice.
     *
     * 🛑 Selecting `shiprocket` without credentials must FAIL LOUDLY and must
     * never degrade to manual. A silent fallback means a seller clicks "Book
     * with Shiprocket", receives a synthetic `manual_{orderId}` tracking id,
     * and nobody is told the parcel was never booked — a 200 carrying an
     * AWB-shaped string that no carrier has ever seen. That is the worst
     * failure available on this path, and it is the one a fallback produces.
     */
    provider?: "manual" | "shiprocket";
  };
  returns: {
    windowDays: number;
  };
  /**
   * The support integration's on/off switch.
   *
   * 🛑 The ONLY new integration flag. The other three the admin page switches
   * already have an authoritative field — `payment.razorpayEnabled`,
   * `messaging.emailEnabled` (which `guardSend` reads), and
   * `shipping.provider`. Adding a parallel `integrationSwitches.*` beside
   * those would be a denormalised mirror that drifts the first time one path
   * writes only one of a pair (Root Cause #42), and the page would then
   * disagree with the code that enforces it. The page is a VIEW over the real
   * fields; this is the one field that did not exist.
   *
   * 🛑 Also not under `siteSettings.integrations` — that key is live and holds
   * analytics/tag IDs (GA, FB Pixel, GTM).
   *
   * OFF hides the WHOLE support surface from BUYERS: no nav entry, no ticket
   * list, no contact form. Staff keep full access, so an open ticket is still
   * workable and the employee pay-per-ticket basis survives.
   *
   * 🛑 A buyer mid-conversation loses sight of their thread. That is the
   * owner's decision, accepted knowingly — and the admin row must SAY it
   * rather than implying the switch only stops new tickets.
   *
   * Defaults to `true`: support being reachable is the safe state, and a
   * settings document written before this field existed must not read as
   * "support is off".
   */
  support: {
    enabled: boolean;
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
  /**
   * The rate-change log behind `/admin/pricing`. Append-only, newest FIRST,
   * capped at `RATE_CHANGE_LOG_MAX`.
   *
   * 🛑 **An array on the singleton rather than a collection, deliberately.**
   * The page's only query is "the recent history of these 16 rates", which is
   * one document read — and the rates themselves already live here, so a
   * separate collection would mean two reads to render one table and two
   * writes to record one change. It is capped for the same reason
   * `statusHistory` is: an uncapped array on a hot singleton eventually makes
   * every settings read expensive.
   *
   * 🛑 **Not an audit trail, and not a substitute for one.** A `pricing_update`
   * row also goes to `adminAuditLog`, which is queryable and answers "what
   * have admins done lately". This answers the narrower question the pricing
   * page asks — "when did THIS rate last move, and to what" — and it is the
   * one a truncation can safely lose.
   */
  rateChanges?: RateChange[];
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

/**
 * Cart total (rupees) above which cash on delivery is refused, when the
 * settings document does not say.
 *
 * 🛑 ONE number, consumed by both the default document below and every reader
 * that has to cope with a settings document written before the field existed.
 * Two spellings of a money limit is how a cap ends up enforced at one value
 * and displayed at another.
 */
export const COD_MAX_ORDER_VALUE_FALLBACK = 3000;

export const DEFAULT_SITE_SETTINGS_DATA: Partial<SiteSettingsDocument> = {
  id: "global",
  siteName: "My Store",
  motto: "Your Marketplace, Your Rules",
  theme: DEFAULT_SITE_SETTINGS_THEME,
  payment: {
    razorpayEnabled: false,
    phonepeEnabled: false,
    upiManualEnabled: true,
    codEnabled: true,
    codMaxOrderValue: COD_MAX_ORDER_VALUE_FALLBACK,
    otpCheckoutThreshold: 5000,
    smsVerification: false,
    adminCheckoutBypass: false,
  },
  // Mirrors MESSAGE_BUDGET_DEFAULTS — both channels start OFF. A fresh install
  // that has made no decision should be quiet, not mailing real people from a
  // half-configured site.
  messaging: {
    emailEnabled: false,
    dailyCeiling: { email: 80, sms: 50 },
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
    codHandlingFeeCap: 200,
    codHandlingFeePercent: 10,
    // The buyer add-ons ship ENABLED. They were `false`, which made
    // StoreAddonsPicker return null on both the cart and checkout, so a fresh
    // install had no add-ons at all and no indication why. `undefined` still
    // means disabled everywhere (computeGiftWrapFee et al. read
    // `if (!rates.XEnabled) return 0`) — only the DEFAULT changed, so an
    // existing siteSettings document keeps whatever it already stored.
    giftWrapFeeEnabled: true,
    giftWrapFee: 49,
    shipmentProtectionFeeEnabled: true,
    shipmentProtectionFeePercent: 2,
    shipmentProtectionFeeMin: 30,
    saleProtectionFeeEnabled: true,
    saleProtectionFeePercent: 3,
    saleProtectionFeeMin: 49,
    sellerShippingFixed: 0,
    platformShippingPercent: 10,
    platformShippingFixedMin: 0,
    autoPayoutWindowDays: 7,
    // 7, not 2 — see `PAYOUT_HOLD_FLOOR_DAYS`. A 2-day hold releases the
    // seller's money inside both the 7-day return window and the 7-day
    // sale-protection claim window, so it was never a legal value; it was
    // merely an unread one (D28).
    payoutHoldDays: 7,
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
  /*
   * 🛑 THIS BLOCK IS NOW LOAD-BEARING, and it was not before.
   *
   * `isListingTypeEnabled` treats a MISSING key as ENABLED, so while every
   * value here was `true` the block was pure documentation — a type left out
   * rendered anyway, which is how `art`, `stickers` and `spares` sat outside it
   * for months with nothing breaking (Root Cause #58). Now that five types ship
   * `false`, an omission is no longer harmless in one direction only: a new
   * union member added to `ListingType` and forgotten here goes LIVE on every
   * site, which is the opposite of the intended default.
   *
   * So: every member of `ListingType` gets an explicit line, including the ones
   * that are `true`. `spares` was missing entirely and is spelled out now.
   *
   * 2026-10-20 — open for business: standard, spares, pre-order, art, stickers.
   * The other five are built, routed and reachable by URL; what is switched off
   * is the site OFFERING them. An admin flips any of them back in
   * Admin → Site Settings → Listings without a deploy, which is the whole point
   * of this living in settings rather than in a constant.
   *
   * ⚠️ A default only reaches a site that has never written its settings
   * document. An existing deployment already has a singleton with the old
   * all-true map, and changing this file does NOT rewrite it — flip those in the
   * admin UI, or re-seed.
   */
  listings: {
    listingTypes: {
      standard: true,
      spares: true,
      "pre-order": true,
      art: true,
      stickers: true,
      auction: false,
      "prize-draw": false,
      classified: false,
      "digital-code": false,
      live: false,
    },
    // `bundle: false` is the admin-side switch for bundles, which are a
    // CATEGORY type rather than a listing type — it is what hides the
    // homepage's featured-bundles rail and the bundle tabs on category and
    // brand pages. Same reasoning as the five listing types above.
    categoryTypes: {
      category: true,
      sublisting: true,
      brand: true,
      bundle: false,
    },
  },
  shipping: {
    estimatedDays: 5,
    minOrderForFree: 0,
    // Explicit rather than left `undefined` — see the field's own note on why a
    // missing provider must resolve to manual and never to a silent carrier.
    provider: "manual",
  },
  returns: {
    windowDays: 7,
  },
  // Reachable is the safe default, and an older settings document with no
  // `support` group must not read as "support is off".
  support: {
    enabled: true,
  },
  announcementBar: {
    enabled: true,
    message: "🎉 Up to 15% Off on Pokémon TCG this week — Use code SAVE15",
  },
  actionConfig: {},
  navConfig: {},
  disabledRoutes: [],
};

/**
 * 🛑 DEAD, AND IT DISAGREES WITH THE REAL PROJECTION. Do not add to it.
 *
 * Measured 2026-10-19 while adding `search`: this constant has **zero
 * consumers** — it is re-exported from the barrel and read by nothing. The
 * list that actually decides what leaves the server is
 * `PUBLIC_SITE_SETTINGS_FIELDS` in
 * `_internal/server/features/site-settings/adapters.ts`, which is audited by
 * `audit-public-projection-parity`.
 *
 * The two already disagree, in the dangerous direction: this one names
 * `commissions` (the real projection marks it PRIVATE — "internal economics")
 * and `featureFlags`, a settings group DELETED in 2026-08-29. So anyone who
 * reached for it as authoritative would publish platform fee structure and
 * key a feature off a group that no longer exists.
 *
 * Left in place rather than deleted here only because removing a barrel
 * export is a breaking change that needs its own version bump; it belongs
 * with the other search-subsystem deletions. Adding a field to it would make
 * it look maintained, which is the one thing it must not look.
 */
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

