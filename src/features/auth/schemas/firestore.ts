/**
 * Auth Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants,
 * and query helpers for the auth feature (users, tokens, sessions).
 */

import type { UserRole } from "../types";
import type {
  BannedAction,
  EmployeeGroup,
  Permission,
} from "../permissions/constants";
import {
  generateUserId,
  type GenerateUserIdInput,
} from "../../../utils/id-generators";

// ============================================================================
// SCHEMA DEFAULTS
// ============================================================================

/**
 * Generic schema defaults for user-related data.
 * Consumer-specific values (admin email, currency) belong in SiteConfig, not here.
 */
export const UserSchemaDefaults = {
  /** Default role assigned to newly registered users */
  USER_ROLE: "user" as UserRole,
  /** Fallback display name for users without a name set */
  DEFAULT_DISPLAY_NAME: "User",
  /** Display name for anonymous/unauthenticated users */
  ANONYMOUS_USER: "Anonymous",
  /** Fallback label when user identity cannot be resolved */
  UNKNOWN_USER: "Unknown User",
  /** Fallback user-agent string for sessions without UA detection */
  UNKNOWN_USER_AGENT: "Unknown",
} as const;

// ============================================================================
// USER DOCUMENT
// ============================================================================

export interface AvatarMetadata {
  url: string;
  position: {
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
  };
  zoom: number; // 0.1 to 3.0
}

export interface UserDocument {
  id?: string;
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  phoneVerified?: boolean;
  displayName: string | null;
  photoURL: string | null;
  avatarMetadata?: AvatarMetadata | null;
  role: UserRole;
  passwordHash?: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Store identity (populated when user is granted seller role)
  storeId?: string;
  storeSlug?: string;
  storeStatus?: "pending" | "approved" | "rejected";

  // Public profile settings
  publicProfile?: {
    isPublic: boolean;
    showEmail: boolean;
    showPhone: boolean;
    showOrders: boolean;
    showWishlist: boolean;
    bio?: string;
    location?: string;
    website?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      facebook?: string;
      linkedin?: string;
    };
    // Denormalized store info (canonical source: StoreDocument)
    storeName?: string;
    storeDescription?: string;
    storeCategory?: string;
    storeLogoURL?: string;
    storeBannerURL?: string;
    storeReturnPolicy?: string;
    storeShippingPolicy?: string;
    isVacationMode?: boolean;
    vacationMessage?: string;
  };

  stats?: {
    totalOrders: number;
    auctionsWon: number;
    itemsSold: number;
    reviewsCount: number;
    rating?: number;
  };

  metadata?: {
    lastSignInTime?: Date;
    creationTime?: string;
    loginCount?: number;
  };

  shippingConfig?: SellerShippingConfig;
  payoutDetails?: SellerPayoutDetails;

  // ── Employee permissions (only populated when role === "employee") ──────────
  /** Explicit permission set for this employee. admin role bypasses this field entirely. */
  permissions?: Permission[];
  /** Which preset group this employee was assigned at invite time (display only). */
  permissionGroup?: EmployeeGroup;

  // ── Soft bans (scoped action restrictions, independent of account disable) ──
  softBans?: UserSoftBan[];

  // ── Hard ban metadata (set alongside disabled: true) ────────────────────────
  hardBanReason?: string;
  hardBannedAt?: Date;
  hardBannedBy?: string;

  // ── Scam awareness acknowledgement ──────────────────────────────────────────
  /** Timestamp when user confirmed they read the scam awareness guide. Required before full platform access. */
  scamAwarenessAcknowledgedAt?: Date;
}

// ── Soft ban entry ─────────────────────────────────────────────────────────────

export interface UserSoftBan {
  action: BannedAction;
  reason: string;
  /** UID of the employee/admin who applied the ban. */
  bannedBy: string;
  bannedAt: Date;
  /** Null or absent = permanent. Past date = expired (treated as lifted without deletion). */
  expiresAt?: Date | null;
}

// -- Seller Shipping Config --------------------------------------------------

export type SellerShippingMethod = "custom" | "shiprocket";

export interface SellerPickupAddress {
  locationName: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isVerified: boolean;
  shiprocketAddressId?: number;
}

export interface SellerShippingConfig {
  method: SellerShippingMethod;
  customShippingPrice?: number;
  customCarrierName?: string;
  shiprocketEmail?: string;
  /** Shiprocket JWT — server-only, never returned to client. */
  shiprocketToken?: string;
  shiprocketTokenExpiry?: Date;
  pickupAddress?: SellerPickupAddress;
  isConfigured: boolean;
}

// -- Seller Payout Details ---------------------------------------------------

export type SellerPayoutMethod = "upi" | "bank_transfer";

export interface SellerBankAccount {
  accountHolderName: string;
  /** Full account number — server-side only, never returned in full to client. */
  accountNumber: string;
  /** Last 4 digits shown to client for confirmation */
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
  accountType: "savings" | "current";
}

export interface SellerPayoutDetails {
  method: SellerPayoutMethod;
  upiId?: string;
  bankAccount?: SellerBankAccount;
  isConfigured: boolean;
}

export const USER_COLLECTION = "users" as const;

export const DEFAULT_USER_DATA: Partial<UserDocument> = {
  role: "user",
  emailVerified: false,
  phoneVerified: false,
  disabled: false,
  photoURL: null,
  displayName: null,
  publicProfile: {
    isPublic: true,
    showEmail: false,
    showPhone: false,
    showOrders: true,
    showWishlist: true,
  },
  stats: {
    totalOrders: 0,
    auctionsWon: 0,
    itemsSold: 0,
    reviewsCount: 0,
  },
};

export const USER_INDEXED_FIELDS = [
  "email",
  "emailIndex",
  "phoneNumber",
  "phoneIndex",
  "role",
  "disabled",
  "emailVerified",
  "phoneVerified",
  "storeSlug",
  "storeStatus",
] as const;

export const USER_PUBLIC_FIELDS = [
  "uid",
  "displayName",
  "photoURL",
  "avatarMetadata",
  "role",
  "createdAt",
  "storeSlug",
  "publicProfile",
  "stats",
] as const;

export const USER_UPDATABLE_FIELDS = ["displayName", "photoURL"] as const;

export type UserCreateInput = Omit<
  UserDocument,
  "uid" | "id" | "createdAt" | "updatedAt"
>;

export type UserUpdateInput = Partial<
  Pick<UserDocument, "displayName" | "photoURL">
>;

export type UserAdminUpdateInput = Partial<
  Omit<UserDocument, "uid" | "id" | "createdAt">
>;

export interface UserQueryFilter {
  email?: string;
  phoneNumber?: string;
  role?: UserRole;
  emailVerified?: boolean;
  disabled?: boolean;
}

/**
 * Query helpers that accept pre-computed blind index values.
 * Call hmacBlindIndex() from @mohasinac/appkit/security on the value first.
 */
export const userQueryHelpers = {
  byEmailIndex: (emailIndex: string) =>
    ["emailIndex", "==", emailIndex] as const,
  byPhoneIndex: (phoneIndex: string) =>
    ["phoneIndex", "==", phoneIndex] as const,
  byRole: (role: UserRole) => ["role", "==", role] as const,
  verified: () => ["emailVerified", "==", true] as const,
  active: () => ["disabled", "==", false] as const,
  disabled: () => ["disabled", "==", true] as const,
} as const;

export function createUserId(input: GenerateUserIdInput): string {
  return generateUserId(input);
}

// -- User field name constants ------------------------------------------------

export const USER_FIELDS = {
  ID: "id",
  UID: "uid",
  EMAIL: "email",
  PHONE_NUMBER: "phoneNumber",
  PHONE_VERIFIED: "phoneVerified",
  DISPLAY_NAME: "displayName",
  EMAIL_INDEX: "emailIndex",
  PHONE_INDEX: "phoneIndex",
  PHOTO_URL: "photoURL",
  AVATAR_METADATA: "avatarMetadata",
  ROLE: "role",
  PASSWORD_HASH: "passwordHash",
  EMAIL_VERIFIED: "emailVerified",
  DISABLED: "disabled",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  STORE_ID: "storeId",
  STORE_SLUG: "storeSlug",
  STORE_STATUS: "storeStatus",
  AVATAR: {
    URL: "avatarMetadata.url",
    POSITION: "avatarMetadata.position",
    POSITION_X: "avatarMetadata.position.x",
    POSITION_Y: "avatarMetadata.position.y",
    ZOOM: "avatarMetadata.zoom",
  },
  PUBLIC_PROFILE: "publicProfile",
  PROFILE: {
    IS_PUBLIC: "publicProfile.isPublic",
    SHOW_EMAIL: "publicProfile.showEmail",
    SHOW_PHONE: "publicProfile.showPhone",
    SHOW_ORDERS: "publicProfile.showOrders",
    SHOW_WISHLIST: "publicProfile.showWishlist",
    BIO: "publicProfile.bio",
    LOCATION: "publicProfile.location",
    WEBSITE: "publicProfile.website",
    SOCIAL_LINKS: "publicProfile.socialLinks",
    SOCIAL: {
      TWITTER: "publicProfile.socialLinks.twitter",
      INSTAGRAM: "publicProfile.socialLinks.instagram",
      FACEBOOK: "publicProfile.socialLinks.facebook",
      LINKEDIN: "publicProfile.socialLinks.linkedin",
    },
  },
  STATS: "stats",
  STAT: {
    TOTAL_ORDERS: "stats.totalOrders",
    AUCTIONS_WON: "stats.auctionsWon",
    ITEMS_SOLD: "stats.itemsSold",
    REVIEWS_COUNT: "stats.reviewsCount",
    RATING: "stats.rating",
  },
  METADATA: "metadata",
  META: {
    LAST_SIGN_IN_TIME: "metadata.lastSignInTime",
    CREATION_TIME: "metadata.creationTime",
    LOGIN_COUNT: "metadata.loginCount",
  },
} as const;

// ============================================================================
// TOKEN DOCUMENTS
// ============================================================================

export interface EmailVerificationTokenDocument {
  id?: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PasswordResetTokenDocument {
  id?: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  usedAt?: Date;
}

export const EMAIL_VERIFICATION_COLLECTION = "emailVerificationTokens" as const;
export const PASSWORD_RESET_COLLECTION = "passwordResetTokens" as const;

export const TOKEN_INDEXED_FIELDS = [
  "userId",
  "email",
  "expiresAt",
  "used",
] as const;

export const DEFAULT_EMAIL_VERIFICATION_TOKEN_DATA: Partial<EmailVerificationTokenDocument> =
  {};

export const DEFAULT_PASSWORD_RESET_TOKEN_DATA: Partial<PasswordResetTokenDocument> =
  {
    used: false,
  };

export const TOKEN_PUBLIC_FIELDS = [] as const;
export const TOKEN_UPDATABLE_FIELDS = ["used", "usedAt"] as const;

export type EmailVerificationTokenCreateInput = Omit<
  EmailVerificationTokenDocument,
  "id" | "createdAt"
>;

export type PasswordResetTokenCreateInput = Omit<
  PasswordResetTokenDocument,
  "id" | "createdAt" | "used" | "usedAt"
>;

export const tokenQueryHelpers = {
  byUserId: (userId: string) => ["userId", "==", userId] as const,
  byEmail: (email: string) => ["email", "==", email] as const,
  byToken: (token: string) => ["token", "==", token] as const,
  unused: () => ["used", "==", false] as const,
  expired: (now: Date) => ["expiresAt", "<", now] as const,
} as const;

export const TOKEN_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  EMAIL: "email",
  EMAIL_INDEX: "emailIndex",
  TOKEN: "token",
  EXPIRES_AT: "expiresAt",
  CREATED_AT: "createdAt",
  USED: "used",
  USED_AT: "usedAt",
} as const;

// ============================================================================
// SESSION DOCUMENT
// ============================================================================

export interface SessionDocument {
  id: string;
  userId: string;
  deviceInfo?: {
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    ip?: string;
  };
  location?: {
    country?: string;
    city?: string;
  };
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
}

export const SESSION_COLLECTION = "sessions" as const;

export const SESSION_INDEXED_FIELDS = [
  "userId",
  "isActive",
  "expiresAt",
  "createdAt",
  "lastActivity",
] as const;

export const DEFAULT_SESSION_DATA: Partial<SessionDocument> = {
  isActive: true,
};

export const SESSION_PUBLIC_FIELDS = [
  "id",
  "deviceInfo",
  "location",
  "createdAt",
  "lastActivity",
  "expiresAt",
  "isActive",
] as const;

/** 5 days in milliseconds */
export const SESSION_EXPIRATION_MS = 5 * 24 * 60 * 60 * 1000;
/** 30 days — auto-cleanup threshold */
export const SESSION_CLEANUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionCreateInput = Omit<
  SessionDocument,
  "id" | "createdAt" | "lastActivity"
>;

export type SessionUpdateInput = {
  lastActivity: Date;
  location?: SessionDocument["location"];
};

export type SessionRevokeInput = {
  isActive: false;
  revokedAt: Date;
  revokedBy: string;
};

export const sessionQueryHelpers = {
  byUserId: (userId: string) => ["userId", "==", userId] as const,
  active: () => ["isActive", "==", true] as const,
  inactive: () => ["isActive", "==", false] as const,
  expired: () => ["expiresAt", "<", new Date()] as const,
  notExpired: () => ["expiresAt", ">=", new Date()] as const,
  recentActivity: (since: Date) => ["lastActivity", ">=", since] as const,
} as const;

export function parseUserAgent(
  userAgent: string,
): SessionDocument["deviceInfo"] {
  const ua = userAgent.toLowerCase();

  const BROWSER_TOKENS: [string, string][] = [
    ["chrome", "Chrome"],
    ["firefox", "Firefox"],
    ["safari", "Safari"],
    ["edge", "Edge"],
  ];
  const browser = BROWSER_TOKENS.find(([tok]) => ua.includes(tok))?.[1] ?? "Unknown";

  const OS_TOKENS: [string | string[], string][] = [
    ["windows", "Windows"],
    ["mac", "macOS"],
    ["linux", "Linux"],
    ["android", "Android"],
    [["ios", "iphone", "ipad"], "iOS"],
  ];
  const os =
    OS_TOKENS.find(([tok]) =>
      Array.isArray(tok) ? tok.some((t) => ua.includes(t)) : ua.includes(tok),
    )?.[1] ?? "Unknown";

  const device =
    ua.includes("mobile") ? "Mobile"
    : ua.includes("tablet") || ua.includes("ipad") ? "Tablet"
    : "Desktop";

  return { userAgent, browser, os, device };
}

export const SESSION_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  DEVICE_INFO: "deviceInfo",
  DEVICE: {
    USER_AGENT: "deviceInfo.userAgent",
    BROWSER: "deviceInfo.browser",
    OS: "deviceInfo.os",
    DEVICE: "deviceInfo.device",
    IP: "deviceInfo.ip",
  },
  LOCATION: "location",
  LOC: {
    COUNTRY: "location.country",
    CITY: "location.city",
  },
  CREATED_AT: "createdAt",
  LAST_ACTIVITY: "lastActivity",
  EXPIRES_AT: "expiresAt",
  IS_ACTIVE: "isActive",
  REVOKED_AT: "revokedAt",
  REVOKED_BY: "revokedBy",
} as const;

// -- SMS Counter (OTP rate-limiting) -----------------------------------------

export interface SmsCounterDocument {
  /** Calendar date string — YYYY-MM-DD (= document ID) */
  date: string;
  count: number;
  updatedAt: Date;
}

export const SMS_COUNTERS_COLLECTION = "sms_counters" as const;

export const SMS_COUNTER_FIELDS = {
  DATE: "date",
  COUNT: "count",
  UPDATED_AT: "updatedAt",
} as const;

/** Free-tier daily OTP limit (configurable at app level) */
export const SMS_DAILY_LIMIT = 1000;
