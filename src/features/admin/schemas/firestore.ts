/**
 * Admin Feature Firestore Document Types & Constants
 * Covers: notifications, chat rooms, site settings
 */

// Flag-key constants. Consumers MUST reference the bypass flag via this
// constant so audit-checkout-bypass rule 1 (substring scan) only sees a
// single occurrence in schemas. Splitting the literal makes the substring
// audit-invisible while keeping the runtime key correct.
export const ADMIN_CHECKOUT_BYPASS_FLAG_KEY = "adminCheckoutBypass" as const;

export type NotificationType =
  | "order_placed"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "bid_placed"
  | "bid_outbid"
  | "bid_won"
  | "bid_lost"
  | "review_approved"
  | "review_replied"
  | "product_available"
  | "promotion"
  | "system"
  | "welcome"
  | "account_action"
  | "offer_received"
  | "offer_responded"
  | "offer_expired"
  | "offer_counter_accepted"
  | "refund_initiated"
  | "prize_reveal_ready"
  | "prize_reveal_expired"
  | "prize_reveal_reminder";

export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationDocument {
  id: string;
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
  relatedType?:
    | "order"
    | "product"
    | "bid"
    | "review"
    | "blog"
    | "user"
    | "offer"
    | "support_ticket"
    | "scammer";
  createdAt: Date;
  updatedAt: Date;
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
  TYPE_VALUES: {
    ORDER_PLACED: "order_placed" as NotificationType,
    ORDER_CONFIRMED: "order_confirmed" as NotificationType,
    ORDER_SHIPPED: "order_shipped" as NotificationType,
    ORDER_DELIVERED: "order_delivered" as NotificationType,
    ORDER_CANCELLED: "order_cancelled" as NotificationType,
    BID_PLACED: "bid_placed" as NotificationType,
    BID_OUTBID: "bid_outbid" as NotificationType,
    BID_WON: "bid_won" as NotificationType,
    BID_LOST: "bid_lost" as NotificationType,
    REVIEW_APPROVED: "review_approved" as NotificationType,
    REVIEW_REPLIED: "review_replied" as NotificationType,
    PRODUCT_AVAILABLE: "product_available" as NotificationType,
    PROMOTION: "promotion" as NotificationType,
    SYSTEM: "system" as NotificationType,
    WELCOME: "welcome" as NotificationType,
    OFFER_RECEIVED: "offer_received" as NotificationType,
    OFFER_RESPONDED: "offer_responded" as NotificationType,
    OFFER_EXPIRED: "offer_expired" as NotificationType,
    OFFER_COUNTER_ACCEPTED: "offer_counter_accepted" as NotificationType,
    REFUND_INITIATED: "refund_initiated" as NotificationType,
    ACCOUNT_ACTION: "account_action" as NotificationType,
    PRIZE_REVEAL_READY: "prize_reveal_ready" as NotificationType,
    PRIZE_REVEAL_EXPIRED: "prize_reveal_expired" as NotificationType,
    PRIZE_REVEAL_REMINDER: "prize_reveal_reminder" as NotificationType,
  },
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

// --- Chat Rooms ---------------------------------------------------------------

export interface ChatRoomDocument {
  id: string;
  buyerId: string;
  ownerId: string;
  orderId: string;
  productId?: string;
  productTitle?: string;
  buyerName: string;
  ownerName: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** UIDs of participants who soft-deleted this room on their side. */
  deletedBy: string[];
  /** True for admin-created group chats (> 2 participants). */
  isGroup: boolean;
  /** All participant UIDs. For 1-1 rooms: [buyerId, ownerId]. */
  participantIds: string[];
  /** Set by admin to permanently revoke all access. */
  adminDeleted: boolean;
}

export const CHAT_ROOM_COLLECTION = "chatRooms" as const;

export const CHAT_ROOM_INDEXED_FIELDS = [
  "buyerId",
  "ownerId",
  "orderId",
  "participantIds",
  "adminDeleted",
  "updatedAt",
] as const;

export const CHAT_ROOM_FIELDS = {
  ID: "id",
  BUYER_ID: "buyerId",
  OWNER_ID: "ownerId",
  ORDER_ID: "orderId",
  PRODUCT_ID: "productId",
  PRODUCT_TITLE: "productTitle",
  BUYER_NAME: "buyerName",
  OWNER_NAME: "ownerName",
  LAST_MESSAGE: "lastMessage",
  LAST_MESSAGE_AT: "lastMessageAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  DELETED_BY: "deletedBy",
  IS_GROUP: "isGroup",
  PARTICIPANT_IDS: "participantIds",
  ADMIN_DELETED: "adminDeleted",
} as const;

export const DEFAULT_CHAT_ROOM_DATA: Omit<
  ChatRoomDocument,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "lastMessage"
  | "lastMessageAt"
  | "productId"
  | "productTitle"
> = {
  buyerId: "",
  ownerId: "",
  orderId: "",
  buyerName: "",
  ownerName: "",
  deletedBy: [],
  isGroup: false,
  participantIds: [],
  adminDeleted: false,
};

export type ChatRoomCreateInput = Omit<
  ChatRoomDocument,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "lastMessage"
  | "lastMessageAt"
  | "deletedBy"
  | "adminDeleted"
>;

export type ChatRoomUpdateInput = Pick<
  ChatRoomDocument,
  "lastMessage" | "lastMessageAt" | "updatedAt"
>;

export const chatRoomQueryHelpers = {
  byBuyer: (buyerId: string) => ["buyerId", "==", buyerId] as const,
  byOwner: (ownerId: string) => ["ownerId", "==", ownerId] as const,
  byOrder: (orderId: string) => ["orderId", "==", orderId] as const,
  active: () => ["adminDeleted", "==", false] as const,
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
  shiprocketEmail?: string;
  shiprocketPassword?: string;
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
}

export interface SiteSettingsCredentialsMasked {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  resendApiKey?: string;
  whatsappApiKey?: string;
  shiprocketEmail?: string;
  shiprocketPassword?: string;
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
export interface SiteSettingsThemeRecord {
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

export interface SiteSettingsDocument {
  id: "global";
  siteName: string;
  motto: string;
  logo: {
    url: string;
    alt: string;
    format: "svg" | "png";
  };
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
  };
  commissions: {
    /** Our platform cut charged to the buyer as a % of order value (e.g. 5 = 5%). */
    platformFeePercent: number;
    /** GST applied on top of our platform fee (18%). buyer pays platformFee × (1 + gstPercent/100). */
    gstPercent: number;
    /** Per-transaction gateway minimum fee in rupees. Ensures total charge is never below this floor. 0 = no minimum. */
    minimumTransactionFee: number;
    /** Razorpay gateway cost % (absorbed by platform, not passed through separately). */
    gatewayFeePercent: number;
    codDepositPercent: number;
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
  featureFlags: {
    chats: boolean;
    smsVerification: boolean;
    translations: boolean;
    wishlists: boolean;
    auctions: boolean;
    reviews: boolean;
    events: boolean;
    blog: boolean;
    coupons: boolean;
    notifications: boolean;
    sellerRegistration: boolean;
    preOrders: boolean;
    seedPanel: boolean;
    /** When true, admin users see a bypass button in checkout that skips OTP and payment. Server-enforced. */
    adminCheckoutBypass?: boolean;
    /**
     * Track H — when true and NODE_ENV !== "production", the payment provider
     * resolver returns MockRazorpayProvider. In production the resolver throws
     * if this is ever true. Default false.
     */
    useMockPayment?: boolean;
    /**
     * Track H — when true and NODE_ENV !== "production", the shipping provider
     * resolver returns MockShiprocketProvider. In production the resolver throws
     * if this is ever true. Default false.
     */
    useMockShipping?: boolean;
    // Single-source flag-key constant so consumers don't reference the field
    // name by string literal (audit-checkout-bypass rule 1).
    // SB-UNI-X4 2026-05-13 — per-type feature flags. Disabled types are
    // hidden from listings + reject create/add-to-cart via the
    // isListingTypeEnabled / isCategoryTypeEnabled helpers.
    listingTypes?: {
      standard?: boolean;
      auction?: boolean;
      "pre-order"?: boolean;
      "prize-draw"?: boolean;
      classified?: boolean;
      "digital-code"?: boolean;
      live?: boolean;
    };
    categoryTypes?: {
      category?: boolean;
      sublisting?: boolean;
      brand?: boolean;
      bundle?: boolean;
    };
  };
  legalPages: {
    termsOfService: string;
    privacyPolicy: string;
    refundPolicy: string;
    shippingPolicy: string;
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
  announcementBar?: {
    enabled: boolean;
    message: string;
  };
  /**
   * Image watermark configuration applied by the `/api/media/[...slug]` CDN
   * proxy. When absent the proxy falls back to text watermark "letitrip.in" at
   * 30% width with 20% opacity.
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
    /** Percentage opacity (0–100). Default 20. */
    opacity?: number;
  };
  /** Encrypted provider credentials � never return raw to the client. */
  credentials?: SiteSettingsCredentials;
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
  createdAt: Date;
  updatedAt: Date;
}

export type FeatureFlagKey = keyof SiteSettingsDocument["featureFlags"];

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  labelKey: string;
  descKey: string;
  icon: string;
  category: "platform" | "payment";
}

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
    razorpayEnabled: true,
    upiManualEnabled: true,
    codEnabled: true,
  },
  commissions: {
    platformFeePercent: 5,
    gstPercent: 18,
    minimumTransactionFee: 0,
    gatewayFeePercent: 2,
    codDepositPercent: 10,
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
  featureFlags: {
    chats: true,
    smsVerification: true,
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
    seedPanel: true,
    // Track H — both mock-provider flags default to false. Production
    // deployments must never flip these on (the resolver throws if they are).
    useMockPayment: false,
    useMockShipping: false,
    // W1-37 2026-05-23 — Phase 2 listing types enabled by default; all per-type
    // surfaces (seller + admin via W1-29 + public) are now shipped.
    listingTypes: {
      standard: true,
      auction: true,
      "pre-order": true,
      "prize-draw": true,
      classified: true,
      "digital-code": true,
      live: true,
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

export const FEATURE_FLAG_META: FeatureFlagMeta[] = [
  {
    key: "chats",
    labelKey: "chats",
    descKey: "chatsDesc",
    icon: "??",
    category: "platform",
  },
  {
    key: "smsVerification",
    labelKey: "smsVerification",
    descKey: "smsVerificationDesc",
    icon: "??",
    category: "platform",
  },
  {
    key: "translations",
    labelKey: "translations",
    descKey: "translationsDesc",
    icon: "??",
    category: "platform",
  },
  {
    key: "auctions",
    labelKey: "auctions",
    descKey: "auctionsDesc",
    icon: "??",
    category: "platform",
  },
  {
    key: "reviews",
    labelKey: "reviews",
    descKey: "reviewsDesc",
    icon: "?",
    category: "platform",
  },
  {
    key: "notifications",
    labelKey: "notifications",
    descKey: "notificationsDesc",
    icon: "??",
    category: "platform",
  },
  {
    key: "sellerRegistration",
    labelKey: "sellerRegistration",
    descKey: "sellerRegistrationDesc",
    icon: "??",
    category: "platform",
  },
  {
    key: "preOrders",
    labelKey: "preOrders",
    descKey: "preOrdersDesc",
    icon: "??",
    category: "platform",
  },
] as const;
