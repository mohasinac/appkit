// [SCHEMA] Shared Zod helpers used by every per-feature firestore.ts schema.
//
// Firestore reads return field values as `Date` (when using `withConverter`)
// but seed code and some action surfaces accept ISO strings. Standardising
// here keeps each per-feature schema lean.

import { z } from "zod";

/**
 * Firestore date — accepts a `Date` instance OR an ISO-8601 string.
 * Use this for every `createdAt`/`updatedAt`/`*At` field in a Firestore doc.
 */
export const firestoreDateSchema = z.union([
  z.date(),
  z.string().datetime({ offset: true }),
  // Firestore Timestamp shape (firebase-admin/firestore).
  z.object({
    toDate: z.function().returns(z.date()),
  }).passthrough(),
]);

/** Common audit fields on every Firestore document. */
export const auditTimestampsShape = {
  createdAt: firestoreDateSchema,
  updatedAt: firestoreDateSchema,
} as const;

/** Money amount in paise — positive integer. */
export const paiseSchema = z.number().int().nonnegative();

/** ISO currency code (we use "INR" everywhere). */
export const currencyCodeSchema = z.string().length(3);

/** Slug — kebab-case identifier with prefix. */
export const slugSchema = z.string().min(1);
