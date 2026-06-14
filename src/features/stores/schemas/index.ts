export * from "./firestore";

import { z } from "zod";
import { StoreStatusValues } from "./firestore";
import { auditTimestampsShape, firestoreDateSchema, paiseSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors StoreDocument in ./firestore.ts. Registered into SCHEMAS.firestore.stores.

export const shippingProviderTypeSchema = z.enum([
  "shiprocket",
  "self-courier",
  "store-pickup",
  "custom",
]);

export const shippingProviderConfigSchema = z.object({
  providerId: z.string(),
  label: z.string(),
  type: shippingProviderTypeSchema,
  fee: z.object({
    flatInPaise: paiseSchema.optional(),
    perKgInPaise: paiseSchema.optional(),
    percentOfOrder: z.number().min(0).max(100).optional(),
    freeAboveInPaise: paiseSchema.optional(),
    minInPaise: paiseSchema.optional(),
  }),
  etaDaysMin: z.number().int().nonnegative(),
  etaDaysMax: z.number().int().nonnegative(),
  regions: z.array(z.string()).optional(),
  requiresAwbUpload: z.boolean().optional(),
});

export const storeShippingConfigSchema = z.object({
  providers: z.array(shippingProviderConfigSchema),
  defaultProviderId: z.string(),
});

export const storeFirestoreSchema = z.object({
  id: z.string(),
  storeSlug: z.string(),
  ownerId: z.string(),
  storeName: z.string(),
  storeDescription: z.string().optional(),
  storeCategory: z.string().optional(),
  storeLogoURL: z.string().optional(),
  storeBannerURL: z.string().optional(),
  status: z.enum([
    StoreStatusValues.PENDING,
    StoreStatusValues.ACTIVE,
    StoreStatusValues.SUSPENDED,
    StoreStatusValues.REJECTED,
  ]),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  socialLinks: z
    .object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
  returnPolicy: z.string().optional(),
  shippingPolicy: z.string().optional(),
  isPublic: z.boolean(),
  isFeatured: z.boolean().optional(),
  isVacationMode: z.boolean().optional(),
  vacationMessage: z.string().optional(),
  vacationReturnDate: z.union([firestoreDateSchema, z.string()]).optional(),
  stats: z
    .object({
      totalProducts: z.number().int().nonnegative(),
      itemsSold: z.number().int().nonnegative(),
      totalReviews: z.number().int().nonnegative(),
      averageRating: z.number().optional(),
    })
    .optional(),
  capabilities: z.array(z.string()).optional(),
  customCommissionRate: z.number().min(0).max(100).optional(),
  googleReviews: z
    .object({
      placeId: z.string(),
      enabled: z.boolean(),
      maxReviews: z.number().int().optional(),
      minRating: z.number().optional(),
      layout: z.enum(["grid", "carousel"]).optional(),
    })
    .optional(),
  shippingConfig: storeShippingConfigSchema.optional(),
  whatsappConfig: z
    .object({
      phoneNumber: z.string().optional(),
      wabaId: z.string().optional(),
      catalogId: z.string().optional(),
      accessToken: z.string().optional(),
      catalogSyncEnabled: z.boolean(),
      lastCatalogSyncAt: firestoreDateSchema.optional(),
      lastSyncCount: z.number().int().optional(),
      lastSyncStatus: z.enum(["success", "partial", "failed"]).optional(),
      connected: z.boolean(),
      connectedAt: firestoreDateSchema.optional(),
    })
    .optional(),
  ...auditTimestampsShape,
});

export type StoreFromSchema = z.infer<typeof storeFirestoreSchema>;

/** Zod schema for store status — use instead of inline `z.enum(["pending",...])`. */
export const storeStatusSchema = z.enum([
  StoreStatusValues.PENDING,
  StoreStatusValues.ACTIVE,
  StoreStatusValues.SUSPENDED,
  StoreStatusValues.REJECTED,
]);

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for a store list item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { storeListItemSchema } from "@mohasinac/feat-stores";
 *
 * const myStoreSchema = storeListItemSchema.extend({
 *   tier: z.enum(["basic", "pro", "enterprise"]).optional(),
 *   verifiedBadge: z.boolean().optional(),
 * });
 * type MyStore = z.infer<typeof myStoreSchema>;
 */
export const storeListItemSchema = z.object({
  id: z.string(),
  storeSlug: z.string(),
  ownerId: z.string(),
  storeName: z.string(),
  storeDescription: z.string().optional(),
  storeCategory: z.string().optional(),
  storeLogoURL: z.string().optional(),
  storeBannerURL: z.string().optional(),
  status: z.string(),
  isPublic: z.boolean(),
  totalProducts: z.number().optional(),
  itemsSold: z.number().optional(),
  totalReviews: z.number().optional(),
  averageRating: z.number().optional(),
  createdAt: z.string().optional(),
});

export const storeListParamsSchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  sort: z.string().optional(),
  filters: z.string().optional(),
});
