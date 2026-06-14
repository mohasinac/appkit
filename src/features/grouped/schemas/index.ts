// [SCHEMA] grouped-listings feature — Firestore document schema.
//
// Mirrors GroupedListingDocument in ./firestore.ts. Registered into
// SCHEMAS.firestore.groupedListings.

import { z } from "zod";
import { auditTimestampsShape } from "../../../schemas/firestore-helpers";

export * from "./firestore";

export const groupThemeSchema = z.enum([
  "related",
  "character",
  "lineage",
  "set",
  "generic",
]);

export const groupVisibilitySchema = z.enum(["visible", "hidden"]);

export const groupedListingFirestoreSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  productIds: z.array(z.string()),
  coverImage: z.string().optional(),
  groupTheme: groupThemeSchema,
  minActiveMembers: z.number().int().nonnegative(),
  activeMemberCount: z.number().int().nonnegative(),
  visibilityStatus: groupVisibilitySchema,
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  storeId: z.string().optional(),
  brandSlug: z.string().optional(),
  categorySlug: z.string().optional(),
  createdBy: z.string(),
  ...auditTimestampsShape,
});

export type GroupedListingFromSchema = z.infer<typeof groupedListingFirestoreSchema>;
