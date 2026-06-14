// [SCHEMA] scams feature — Firestore document schemas.
//
// Mirrors ScammerDocument + subcollection documents (incidents, comments,
// contests) in ./firestore.ts. Registered into:
//   SCHEMAS.firestore.scammerProfiles            — top-level profile
//   SCHEMAS.firestore.scammerIncidents           — subcollection
//   SCHEMAS.firestore.scammerComments            — subcollection
//   SCHEMAS.firestore.scammerContests            — subcollection

import { z } from "zod";
import { firestoreDateSchema, auditTimestampsShape } from "../../../schemas/firestore-helpers";

export * from "./firestore";

export const scammerStatusSchema = z.enum([
  "pending_review",
  "verified",
  "rejected",
  "removed",
]);

export const scamPlatformSchema = z.enum([
  "whatsapp",
  "instagram",
  "facebook",
  "telegram",
  "twitter",
  "olx",
  "facebook_marketplace",
  "letitrip",
  "in_person",
  "phone_call",
  "other",
]);

export const socialPlatformSchema = z.enum([
  "instagram",
  "facebook",
  "twitter",
  "youtube",
  "telegram",
  "whatsapp",
  "linkedin",
  "olx",
  "other",
]);

export const contestTypeSchema = z.enum([
  "accused_contesting",
  "false_report",
  "inaccurate_details",
  "identity_mistaken",
]);

export const contestStatusSchema = z.enum(["pending", "upheld", "dismissed"]);

export const scammerSocialMediaSchema = z.object({
  platform: socialPlatformSchema,
  handle: z.string(),
  url: z.string().optional(),
});

// The scamType enum lives in ../constants/scam-types — keeping it loose at the
// boundary here to avoid an import cycle. The full enum is enforced by the
// constants module.
const scamTypeSchema = z.string();

export const scammerFirestoreSchema = z.object({
  id: z.string(),
  seoSlug: z.string(),
  displayNames: z.array(z.string()),
  phones: z.array(z.string()),
  upiIds: z.array(z.string()),
  emails: z.array(z.string()),
  socialMedia: z.array(scammerSocialMediaSchema),
  scamType: scamTypeSchema,
  scamPlatform: scamPlatformSchema,
  description: z.string(),
  amountLost: z.number().int().nonnegative().optional(),
  itemInvolved: z.string().optional(),
  evidence: z.array(z.string()),
  reportedBy: z.string(),
  reportedByAnon: z.boolean(),
  status: scammerStatusSchema,
  verifiedBy: z.string().optional(),
  verifiedAt: firestoreDateSchema.optional(),
  verificationNote: z.string().optional(),
  relatedScammerIds: z.array(z.string()),
  mergedFromIds: z.array(z.string()).optional(),
  tags: z.array(z.string()),
  views: z.number().int().nonnegative(),
  incidentCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  contestCount: z.number().int().nonnegative(),
  isContested: z.boolean().optional(),
  ...auditTimestampsShape,
});

export const scammerIncidentFirestoreSchema = z.object({
  id: z.string(),
  scammerId: z.string(),
  reportedBy: z.string(),
  reportedByAnon: z.boolean(),
  scamType: scamTypeSchema,
  scamPlatform: scamPlatformSchema,
  description: z.string(),
  amountLost: z.number().int().nonnegative().optional(),
  itemInvolved: z.string().optional(),
  evidence: z.array(z.string()),
  matchedPhones: z.array(z.string()).optional(),
  matchedUpiIds: z.array(z.string()).optional(),
  matchedEmails: z.array(z.string()).optional(),
  matchedNames: z.array(z.string()).optional(),
  status: scammerStatusSchema,
  verifiedBy: z.string().optional(),
  verifiedAt: firestoreDateSchema.optional(),
  createdAt: firestoreDateSchema,
});

export const scammerCommentFirestoreSchema = z.object({
  id: z.string(),
  scammerId: z.string(),
  authorId: z.string(),
  authorDisplayName: z.string(),
  authorRole: z.enum(["user", "support", "admin"]),
  isAccused: z.boolean(),
  isAccusedVerified: z.boolean().optional(),
  isVerifiedVictim: z.boolean(),
  linkedOrderId: z.string().optional(),
  body: z.string().max(500),
  upvotes: z.number().int().nonnegative(),
  isHidden: z.boolean(),
  hiddenBy: z.string().optional(),
  hiddenReason: z.string().optional(),
  createdAt: firestoreDateSchema,
  updatedAt: firestoreDateSchema.optional(),
});

export const scammerContestFirestoreSchema = z.object({
  id: z.string(),
  scammerId: z.string(),
  contestType: contestTypeSchema,
  contestedBy: z.string(),
  contestedByAnon: z.boolean(),
  explanation: z.string().max(2000),
  evidence: z.array(z.string()),
  status: contestStatusSchema,
  reviewedBy: z.string().optional(),
  reviewedAt: firestoreDateSchema.optional(),
  reviewNote: z.string().optional(),
  createdAt: firestoreDateSchema,
});

export type ScammerFromSchema = z.infer<typeof scammerFirestoreSchema>;
export type ScammerIncidentFromSchema = z.infer<typeof scammerIncidentFirestoreSchema>;
export type ScammerCommentFromSchema = z.infer<typeof scammerCommentFirestoreSchema>;
export type ScammerContestFromSchema = z.infer<typeof scammerContestFirestoreSchema>;
