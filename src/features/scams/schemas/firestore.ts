/**
 * Scam Registry Firestore Document Types & Constants
 *
 * Data model:
 *   scammerProfiles/{id}                  — canonical scammer identity (one per person)
 *   scammerProfiles/{id}/incidents/{id}   — individual victim reports linked to this profile
 *   scammerProfiles/{id}/comments/{id}    — public discussion; accused can post here
 *   scammerProfiles/{id}/contests/{id}    — dispute submissions (accused or any user)
 *
 * SEO design intent: phones, UPI IDs, and emails are stored as plaintext and
 * rendered as HTML text nodes so search engines index them. When a victim googles
 * the number/UPI they received, this page must surface.
 *
 * Submission rules (enforced server-side):
 *  - Requires authentication (no guest submissions)
 *  - Requires scamAwarenessAcknowledgedAt on UserDocument
 *  - No submission if user has report_scammers soft ban
 *  - Max 5 pending submissions per user (prevents spam flooding)
 *  - All submissions start as "pending_review" — admin must verify before public display
 *
 * Suggestion matching (duplicate detection):
 *  - On new report submission, API queries existing profiles for overlapping
 *    phones[], upiIds[], emails[], displayNames[]
 *  - If matches found → suggest linking to existing profile (new incident) instead of new profile
 *  - SCAMMER_MATCH_FIELDS lists the Firestore array-contains fields used for this query
 */

import type { ScamType } from "../constants/scam-types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

// ============================================================================
// ENUMS — SCAMMER PROFILE
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
// ENUMS — CONTESTS
// ============================================================================

export const ContestTypeValues = {
  /** The named person claims they never scammed anyone. */
  ACCUSED_CONTESTING: "accused_contesting",
  /** Any user flags the entire report as fabricated. */
  FALSE_REPORT: "false_report",
  /** A detail is wrong (wrong phone, wrong name) but the scam is real. */
  INACCURATE_DETAILS: "inaccurate_details",
  /** The name/alias matches but it's a different person entirely. */
  IDENTITY_MISTAKEN: "identity_mistaken",
} as const;

export type ContestType =
  (typeof ContestTypeValues)[keyof typeof ContestTypeValues];

export const ContestStatusValues = {
  PENDING: "pending",
  /** Contest accepted — profile edited or removed. */
  UPHELD: "upheld",
  /** Contest rejected — report stands as verified. */
  DISMISSED: "dismissed",
} as const;

export type ContestStatus =
  (typeof ContestStatusValues)[keyof typeof ContestStatusValues];

// ============================================================================
// SCAMMER DOCUMENT (canonical profile)
// ============================================================================

export interface ScammerSocialMedia {
  platform: SocialPlatform;
  /** Raw handle without @ prefix — stored as plaintext for SEO indexing. */
  handle: string;
  url?: string;
}

export interface ScammerDocument extends BaseDocument {
  /** URL-safe slug — used in /scams/[slug]. Same as id. */
  seoSlug: string;

  /**
   * Display names / aliases used by the scammer.
   * Stored as plaintext array — all are indexed for suggestion matching.
   */
  displayNames: string[];

  /**
   * Phone numbers in any format. Stored plaintext for SEO.
   * Deduplication (trim, strip spaces/dashes) done server-side on write.
   */
  phones: string[];

  /**
   * UPI IDs (e.g. 9876543210@paytm). Stored plaintext.
   * Victims often google UPI IDs before paying — critical for SEO.
   */
  upiIds: string[];

  /** Email addresses used by the scammer. Stored plaintext for SEO. */
  emails: string[];

  /** Social media profiles where the scammer operated. */
  socialMedia: ScammerSocialMedia[];

  /** Primary scam type for this profile (most common across incidents). */
  scamType: ScamType;

  /** Platform where the initial/primary scam interaction occurred. */
  scamPlatform: ScamPlatform;

  /** Reporter's narrative for the first/primary incident. */
  description: string;

  /** Amount lost in INR paise (0 if none). Optional. */
  amountLost?: number;

  /** Item involved in the scam (e.g. "Charizard PSA 9"). Optional. */
  itemInvolved?: string;

  /**
   * Evidence URLs for the primary incident.
   * Must be /media/ proxy URLs — never raw Firebase Storage URLs.
   */
  evidence: string[];

  /** UID of the user who first reported this scammer. */
  reportedBy: string;

  /**
   * If true, reporter's identity is hidden on the public page.
   * Admin records keep the uid; public page shows "Anonymous".
   */
  reportedByAnon: boolean;

  status: ScammerStatus;

  /** UID of admin/employee who verified or rejected. */
  verifiedBy?: string;
  verifiedAt?: Date;

  /** Internal note from the verifier — never shown publicly. */
  verificationNote?: string;

  /**
   * Cross-links to other profiles that are the same person under different aliases.
   * Used for "Also reported as:" links and merge context.
   */
  relatedScammerIds: string[];

  /**
   * IDs of profiles that were merged INTO this one.
   * Old profile pages redirect here; search results de-dup on these.
   */
  mergedFromIds?: string[];

  /** Admin/system tags for internal filtering (e.g. "high_value", "repeat_offender"). */
  tags: string[];

  /** Page view counter — incremented server-side. */
  views: number;

  // ── Denormalized subcollection counts (updated on subcollection writes) ──────

  /** Total verified + pending incident reports linked to this profile. */
  incidentCount: number;
  /** Total visible (non-hidden) comments on this profile. */
  commentCount: number;
  /** Total open (pending) contest submissions. */
  contestCount: number;

  /**
   * True when ≥1 pending contest exists — surfaces in admin moderation queue.
   * Reset to false when all contests are reviewed.
   */
  isContested?: boolean;
}

// ============================================================================
// SCAMMER INCIDENT (subcollection: incidents)
// ============================================================================

/**
 * One victim's report linked to an existing scammer profile.
 *
 * When a new submission matches an existing verified profile's phones/UPIs/emails,
 * it is stored here instead of creating a duplicate top-level profile.
 * The public detail page shows these in a table ("Other victims who reported this person").
 */
export interface ScammerIncidentDocument {
  /** Firestore auto-ID — incidents never get semantic slugs. */
  id: string; // audit-schema-base-ok: subcollection of scammerProfiles, not a collection root
  /** Parent ScammerDocument id. */
  scammerId: string;

  reportedBy: string;
  reportedByAnon: boolean;

  scamType: ScamType;
  scamPlatform: ScamPlatform;
  description: string;

  amountLost?: number;
  itemInvolved?: string;

  /** Evidence for this specific incident. /media/ proxy URLs only. */
  evidence: string[];

  /**
   * Which contact details from this incident matched the parent profile.
   * Stored so the admin can see why this was linked (not for public display).
   */
  matchedPhones?: string[];
  matchedUpiIds?: string[];
  matchedEmails?: string[];
  matchedNames?: string[];

  /**
   * Incidents follow the same review workflow as top-level profiles.
   * pending_review → verified | rejected
   */
  status: ScammerStatus;
  verifiedBy?: string;
  verifiedAt?: Date;

  createdAt: Date;
}

export type ScammerIncidentCreateInput = Pick<
  ScammerIncidentDocument,
  | "scammerId"
  | "reportedBy"
  | "reportedByAnon"
  | "scamType"
  | "scamPlatform"
  | "description"
  | "amountLost"
  | "itemInvolved"
  | "evidence"
  | "matchedPhones"
  | "matchedUpiIds"
  | "matchedEmails"
  | "matchedNames"
>;

export const SCAMMER_INCIDENTS_SUBCOLLECTION = "incidents" as const;

export const DEFAULT_SCAMMER_INCIDENT_DATA: Partial<ScammerIncidentDocument> = {
  status: "pending_review",
  evidence: [],
  reportedByAnon: false,
};

// ============================================================================
// SCAMMER COMMENT (subcollection: comments)
// ============================================================================

/**
 * Public comment on a scammer profile page.
 *
 * Purpose: victims share additional context; the accused person can post their
 * side of the story (isAccused flag); admins can post official notes.
 *
 * Rules:
 *  - Requires authentication — no anonymous comments
 *  - Max 500 chars per comment
 *  - isAccused is self-declared — admin reviews and can set isAccusedVerified
 *  - Hidden comments are still stored but not rendered to public
 */
export interface ScammerCommentDocument {
  /** Firestore auto-ID. */
  id: string; // audit-schema-base-ok: subcollection of scammerProfiles, not a collection root
  scammerId: string;

  authorId: string;
  /** Denormalized — shown on comment. Anonymous if user deleted account. */
  authorDisplayName: string;
  authorRole: "user" | "support" | "admin";

  /**
   * Self-declared flag: commenter claims to be the person named in this profile.
   * Admin should review before surfacing with visual "Accused" badge.
   */
  isAccused: boolean;
  /** Set by admin after verification. Governs the public "Accused" badge. */
  isAccusedVerified?: boolean;

  /**
   * True when the commenter had an order matching this scammer's identity
   * and the orderId is linked — shows "Verified Victim" badge.
   */
  isVerifiedVictim: boolean;
  /** Order ID used to verify victim status. Never shown on public page. */
  linkedOrderId?: string;

  /** Plain text, max 500 chars. */
  body: string;

  /** Simple upvote count — incremented server-side, never decremented. */
  upvotes: number;

  /** Admin moderation — hidden comments stay in DB for audit. */
  isHidden: boolean;
  hiddenBy?: string;
  hiddenReason?: string;

  createdAt: Date;
  updatedAt?: Date;
}

export type ScammerCommentCreateInput = Pick<
  ScammerCommentDocument,
  | "scammerId"
  | "authorId"
  | "authorDisplayName"
  | "authorRole"
  | "isAccused"
  | "isVerifiedVictim"
  | "linkedOrderId"
  | "body"
>;

export const SCAMMER_COMMENTS_SUBCOLLECTION = "comments" as const;

export const DEFAULT_SCAMMER_COMMENT_DATA: Partial<ScammerCommentDocument> = {
  upvotes: 0,
  isHidden: false,
  isAccused: false,
  isAccusedVerified: false,
  isVerifiedVictim: false,
};

/** Max comment length enforced at API level. */
export const MAX_COMMENT_BODY_LENGTH = 500;

// ============================================================================
// SCAMMER CONTEST (subcollection: contests)
// ============================================================================

/**
 * Dispute submission against a scammer profile.
 *
 * Two entry points on the public page:
 *  1. "I am falsely accused" → type: accused_contesting (the named person)
 *  2. "Report as inaccurate / false" → type: false_report | inaccurate_details | identity_mistaken
 *
 * All contests start as "pending" and surface in the admin moderation queue
 * (scammerProfiles.isContested = true). Admin upholds or dismisses.
 * On uphold: admin edits profile manually before marking upheld.
 * On dismiss: profile status is unchanged; contest is archived.
 */
export interface ScammerContestDocument {
  /** Firestore auto-ID. */
  id: string; // audit-schema-base-ok: subcollection of scammerProfiles, not a collection root
  scammerId: string;

  contestType: ContestType;

  contestedBy: string;
  /**
   * If true, contest submitter is anonymous on public-facing displays.
   * UID is always stored for admin audit.
   */
  contestedByAnon: boolean;

  /** Contestant's explanation. Plain text, max 2000 chars. */
  explanation: string;

  /**
   * Supporting evidence (e.g. proof of identity, transaction records).
   * /media/ proxy URLs only.
   */
  evidence: string[];

  status: ContestStatus;

  /** UID of admin/employee who reviewed. */
  reviewedBy?: string;
  reviewedAt?: Date;
  /** Internal note — never shown to contest submitter or public. */
  reviewNote?: string;

  createdAt: Date;
}

export type ScammerContestCreateInput = Pick<
  ScammerContestDocument,
  | "scammerId"
  | "contestType"
  | "contestedBy"
  | "contestedByAnon"
  | "explanation"
  | "evidence"
>;

export const SCAMMER_CONTESTS_SUBCOLLECTION = "contests" as const;

export const DEFAULT_SCAMMER_CONTEST_DATA: Partial<ScammerContestDocument> = {
  status: "pending",
  evidence: [],
  contestedByAnon: false,
};

export const CONTEST_TYPE_LABELS: Record<ContestType, string> = {
  accused_contesting: "I am falsely accused",
  false_report: "This report is fabricated",
  inaccurate_details: "Some details are wrong",
  identity_mistaken: "Wrong person — same name/number",
};

export const CONTEST_STATUS_LABELS: Record<ContestStatus, string> = {
  pending: "Pending Review",
  upheld: "Upheld — Profile Updated",
  dismissed: "Dismissed — Report Stands",
};

// ============================================================================
// SUGGESTION MATCHING
// ============================================================================

/**
 * Fields used to detect duplicate scammer profiles when a new report is submitted.
 * API queries array-contains on each of these fields against the new report's values.
 * Results are returned as "suggested existing profiles" for the reporter to confirm.
 *
 * Priority order: phones > upiIds > emails > displayNames
 * A match on phones or upiIds is considered a strong match (likely same person).
 * A match on displayNames only is a weak match (shown as "possibly same person").
 */
export const SCAMMER_MATCH_FIELDS = [
  "phones",
  "upiIds",
  "emails",
  "displayNames",
] as const;

export type ScammerMatchField = (typeof SCAMMER_MATCH_FIELDS)[number];

/** Match strength returned by the suggestion API. */
export type ScammerMatchStrength = "strong" | "weak";

export interface ScammerSuggestion {
  scammerId: string;
  seoSlug: string;
  displayNames: string[];
  status: ScammerStatus;
  /** Which fields caused this suggestion. */
  matchedOn: ScammerMatchField[];
  matchStrength: ScammerMatchStrength;
}

// ============================================================================
// PRIMARY COLLECTION CONSTANTS
// ============================================================================

export const SCAMMER_COLLECTION = "scammerProfiles" as const;

export const SCAMMER_ID_PREFIX = "scammer-" as const;

export const SCAMMER_INDEXED_FIELDS = [
  "status",
  "scamType",
  "scamPlatform",
  "reportedBy",
  "verifiedBy",
  "isContested",
  "views",
  "incidentCount",
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
  mergedFromIds: [],
  tags: [],
  views: 0,
  incidentCount: 0,
  commentCount: 0,
  contestCount: 0,
  isContested: false,
  reportedByAnon: false,
};

/** Max pending submissions per user — prevents spam flooding. */
export const MAX_PENDING_SCAMMER_REPORTS_PER_USER = 5;

// ============================================================================
// INPUT / UPDATE TYPES
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
    | "mergedFromIds"
    | "tags"
    | "displayNames"
    | "phones"
    | "upiIds"
    | "emails"
    | "socialMedia"
    | "isContested"
  >
>;

// ============================================================================
// FIELD CONSTANTS
// ============================================================================

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
  MERGED_FROM_IDS: "mergedFromIds",
  TAGS: "tags",
  VIEWS: "views",
  INCIDENT_COUNT: "incidentCount",
  COMMENT_COUNT: "commentCount",
  CONTEST_COUNT: "contestCount",
  IS_CONTESTED: "isContested",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

// ============================================================================
// LABEL MAPS
// ============================================================================

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
