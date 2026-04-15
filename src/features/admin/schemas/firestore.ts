/**
 * Admin Feature Firestore Document Types & Constants
 * Covers: notifications, chat rooms, site settings
 */

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
  | "offer_received"
  | "offer_responded"
  | "offer_counter_accepted"
  | "refund_initiated";

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
    | "offer";
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
    OFFER_COUNTER_ACCEPTED: "offer_counter_accepted" as NotificationType,
    REFUND_INITIATED: "refund_initiated" as NotificationType,
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
  sellerId: string;
  orderId: string;
  productId?: string;
  productTitle?: string;
  buyerName: string;
  sellerName: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** UIDs of participants who soft-deleted this room on their side. */
  deletedBy: string[];
  /** True for admin-created group chats (> 2 participants). */
  isGroup: boolean;
  /** All participant UIDs. For 1-1 rooms: [buyerId, sellerId]. */
  participantIds: string[];
  /** Set by admin to permanently revoke all access. */
  adminDeleted: boolean;
}

export const CHAT_ROOM_COLLECTION = "chatRooms" as const;

export const CHAT_ROOM_INDEXED_FIELDS = [
  "buyerId",
  "sellerId",
  "orderId",
  "participantIds",
  "adminDeleted",
  "updatedAt",
] as const;

export const CHAT_ROOM_FIELDS = {
  ID: "id",
  BUYER_ID: "buyerId",
  SELLER_ID: "sellerId",
  ORDER_ID: "orderId",
  PRODUCT_ID: "productId",
  PRODUCT_TITLE: "productTitle",
  BUYER_NAME: "buyerName",
  SELLER_NAME: "sellerName",
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
  sellerId: "",
  orderId: "",
  buyerName: "",
  sellerName: "",
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
  bySeller: (sellerId: string) => ["sellerId", "==", sellerId] as const,
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
    razorpayFeePercent: number;
    codDepositPercent: number;
    sellerShippingFixed: number;
    platformShippingPercent: number;
    platformShippingFixedMin: number;
    processingFeePercent?: number;
    gstPercent?: number;
    gatewayFeePercent?: number;
    autoPayoutWindowDays?: number;
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
  /** Encrypted provider credentials � never return raw to the client. */
  credentials?: SiteSettingsCredentials;
  featuredResults?: FeaturedResult[];
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

export const DEFAULT_SITE_SETTINGS_DATA: Partial<SiteSettingsDocument> = {
  id: "global",
  siteName: "My Store",
  motto: "Your Marketplace, Your Rules",
  payment: {
    razorpayEnabled: true,
    upiManualEnabled: true,
    codEnabled: true,
  },
  commissions: {
    razorpayFeePercent: 5,
    codDepositPercent: 10,
    sellerShippingFixed: 0,
    platformShippingPercent: 10,
    platformShippingFixedMin: 0,
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
    preOrders: false,
  },
  shipping: {
    estimatedDays: 5,
    minOrderForFree: 0,
  },
  returns: {
    windowDays: 7,
  },
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
