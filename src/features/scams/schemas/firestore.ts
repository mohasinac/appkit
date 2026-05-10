/**
 * Scam Registry Firestore Document Types & Constants
 *
 * Canonical types for the scammerProfiles collection. Each document represents
 * a verified or pending scammer report submitted by users or admins.
 *
 * Collection: scammerProfiles
 * Document ID prefix: scammer- (semantic slug, no auto-ID)
 *
 * SEO design intent: phone numbers, UPI IDs, and emails are stored as plaintext
 * and rendered in HTML so search engines can index them. When a victim googles
 * a number or UPI handle they received, this page should surface.
 *
 * Submission rules (enforced server-side):
 *  - Requires authentication (no guest submissions)
 *  - Requires scamAwarenessAcknowledgedAt on UserDocument
 *  - No submission if user has report_scammers soft ban
 *  - Max 5 pending submissions per user (prevents spam flooding)
 *  - All submissions start as "pending_review" — admin must verify
 */

import type { ScamType } from "../constants/scam-types";

// ============================================================================
// ENUMS
// ============================================================================

export const ScammerStatusValues = {
  PENDING_REVIEW: "pending_review",
  VERIFIED: "verified",
  REJECTED: "rejected",
  REMOVED: "removed",
} as const;

export type ScammerStatus =
  (typeof ScammerStatusValues)[keyof typeof ScammerStatusValues];

export const ScamPlatformValues = {
  WHATSAPP: "whatsapp",
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  TELEGRAM: "telegram",
  TWITTER: "twitter",
  OLX: "olx",
  FACEBOOK_MARKETPLACE: "facebook_marketplace",
  LETITRIP: "letitrip",
  IN_PERSON: "in_person",
  PHONE_CALL: "phone_call",
  OTHER: "other",
} as const;

export type ScamPlatform =
  (typeof ScamPlatformValues)[keyof typeof ScamPlatformValues];

export const SocialPlatformValues = {
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  TWITTER: "twitter",
  YOUTUBE: "youtube",
  TELEGRAM: "telegram",
  WHATSAPP: "whatsapp",
  LINKEDIN: "linkedin",
  OLX: "olx",
  OTHER: "other",
} as const;

export type SocialPlatform =
  (typeof SocialPlatformValues)[keyof typeof SocialPlatformValues];

// ============================================================================
// SCAMMER DOCUMENT
// ============================================================================

export interface ScammerSocialMedia {
  platform: SocialPlatform;
  /** Raw handle without @ prefix — stored as plaintext for SEO indexing. */
  handle: string;
  /** Full profile URL if known. */
  url?: string;
}

export interface ScammerDocument {
  id: string;
  /** URL-safe slug — used in /scams/[slug] page. Same as id. */
  seoSlug: string;

  /**
   * Display name(s) used by the scammer. May be aliases — scammers use many.
   * Array so multiple known aliases are all searchable.
   */
  displayNames: string[];

  /**
   * Phone numbers in any format. Stored plaintext for SEO indexing.
   * Deduplication handled server-side (trim, remove spaces/dashes).
   */
  phones: string[];

  /**
   * UPI IDs (e.g. 9876543210@paytm). Stored plaintext for SEO indexing.
   * Critical: victims often google the UPI ID before paying.
   */
  upiIds: string[];

  /**
   * Email addresses used. Stored plaintext for SEO indexing.
   */
  emails: string[];

  /** Social media profiles where the scammer operated. */
  socialMedia: ScammerSocialMedia[];

  /** Primary scam type — used for filtering and scam-type page cross-links. */
  scamType: ScamType;

  /** Platform where the scam interaction took place. */
  scamPlatform: ScamPlatform;

  /** Reporter's description of what happened. Plain text, max 2000 chars. */
  description: string;

  /** Amount lost in INR paise (0 if none lost). Optional — not all scams involve money lost. */
  amountLost?: number;

  /**
   * The item involved if it was a product scam (e.g. "Charizard PSA 9",
   * "Hot Wheels India Exclusive"). Optional.
   */
  itemInvolved?: string;

  /**
   * Evidence URLs — screenshots, receipts, chat exports.
   * Must be /media/ proxy URLs, never raw Firebase Storage URLs.
   */
  evidence: string[];

  /** UID of the reporting user. */
  reportedBy: string;

  /**
   * If true, the reporter's identity is hidden on the public page.
   * Stored for admin records; public page shows "Anonymous" instead.
   */
  reportedByAnon: boolean;

  status: ScammerStatus;

  /** UID of admin/employee who verified or rejected. */
  verifiedBy?: string;
  verifiedAt?: Date;

  /** Optional internal note from the verifier (never shown publicly). */
  verificationNote?: string;

  /** Cross-links to related scammer profiles (same scammer, different aliases). */
  relatedScammerIds: string[];

  /** Admin/system tags for internal filtering (e.g. "high_value", "repeat_offender"). */
  tags: string[];

  /** Page view counter — incremented server-side, used for "most searched" sorting. */
  views: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export type ScammerCreateInput = Pick<
  ScammerDocument,
  | "displayNames"
  | "phones"
  | "upiIds"
  | "emails"
  | "socialMedia"
  | "scamType"
  | "scamPlatform"
  | "description"
  | "amountLost"
  | "itemInvolved"
  | "evidence"
  | "reportedBy"
  | "reportedByAnon"
>;

export type ScammerAdminUpdateInput = Partial<
  Pick<
    ScammerDocument,
    | "status"
    | "verifiedBy"
    | "verifiedAt"
    | "verificationNote"
    | "relatedScammerIds"
    | "tags"
    | "displayNames"
    | "phones"
    | "upiIds"
    | "emails"
    | "socialMedia"
  >
>;

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

export const SCAMMER_COLLECTION = "scammerProfiles" as const;

export const SCAMMER_ID_PREFIX = "scammer-" as const;

export const SCAMMER_INDEXED_FIELDS = [
  "status",
  "scamType",
  "scamPlatform",
  "reportedBy",
  "verifiedBy",
  "views",
  "createdAt",
  "updatedAt",
] as const;

export const DEFAULT_SCAMMER_DATA: Partial<ScammerDocument> = {
  status: "pending_review",
  phones: [],
  upiIds: [],
  emails: [],
  socialMedia: [],
  evidence: [],
  relatedScammerIds: [],
  tags: [],
  views: 0,
  reportedByAnon: false,
};

/** Max pending submissions per user — prevents spam flooding during review backlog. */
export const MAX_PENDING_SCAMMER_REPORTS_PER_USER = 5;

export const SCAMMER_FIELDS = {
  ID: "id",
  SEO_SLUG: "seoSlug",
  DISPLAY_NAMES: "displayNames",
  PHONES: "phones",
  UPI_IDS: "upiIds",
  EMAILS: "emails",
  SOCIAL_MEDIA: "socialMedia",
  SCAM_TYPE: "scamType",
  SCAM_PLATFORM: "scamPlatform",
  DESCRIPTION: "description",
  AMOUNT_LOST: "amountLost",
  ITEM_INVOLVED: "itemInvolved",
  EVIDENCE: "evidence",
  REPORTED_BY: "reportedBy",
  REPORTED_BY_ANON: "reportedByAnon",
  STATUS: "status",
  VERIFIED_BY: "verifiedBy",
  VERIFIED_AT: "verifiedAt",
  VERIFICATION_NOTE: "verificationNote",
  RELATED_SCAMMER_IDS: "relatedScammerIds",
  TAGS: "tags",
  VIEWS: "views",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const SCAM_PLATFORM_LABELS: Record<ScamPlatform, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  twitter: "X (Twitter)",
  olx: "OLX",
  facebook_marketplace: "Facebook Marketplace",
  letitrip: "LetItRip",
  in_person: "In Person",
  phone_call: "Phone Call",
  other: "Other",
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  youtube: "YouTube",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  olx: "OLX",
  other: "Other",
};

export const SCAMMER_STATUS_LABELS: Record<ScammerStatus, string> = {
  pending_review: "Pending Review",
  verified: "Verified",
  rejected: "Rejected",
  removed: "Removed",
};
