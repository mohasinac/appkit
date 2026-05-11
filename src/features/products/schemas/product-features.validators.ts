/**
 * Zod validators shared by the admin and store `/api/.../features` route handlers.
 *
 * Kept alongside the schema so the enum sources of truth (category/scope/
 * productType) live in one place. Route handlers compose from these instead
 * of hand-rolling parallel schemas.
 */

import { z } from "zod";

export const PRODUCT_FEATURE_PRODUCT_TYPE_ENUM = z.enum([
  "product",
  "auction",
  "preorder",
  "all",
]);

export const PRODUCT_FEATURE_CATEGORY_ENUM = z.enum([
  "shipping",
  "seller",
  "condition",
  "platform",
  "auction",
  "preorder",
  "custom",
]);

export const PRODUCT_FEATURE_SCOPE_ENUM = z.enum(["platform", "store"]);

const FEATURE_LABEL_MAX = 80;
const FEATURE_DESCRIPTION_MAX = 500;
const FEATURE_ICON_MAX = 2000;
const FEATURE_ICON_COLOR_MAX = 80;
const FEATURE_DISPLAY_ORDER_MAX = 10_000;

/** Shape for POST /api/admin/features — admin creates either scope. */
export const productFeatureAdminCreateSchema = z.object({
  label: z.string().min(1).max(FEATURE_LABEL_MAX),
  description: z.string().max(FEATURE_DESCRIPTION_MAX).optional(),
  icon: z.string().min(1).max(FEATURE_ICON_MAX),
  iconColor: z.string().max(FEATURE_ICON_COLOR_MAX).optional(),
  category: PRODUCT_FEATURE_CATEGORY_ENUM,
  scope: PRODUCT_FEATURE_SCOPE_ENUM,
  productTypes: z.array(PRODUCT_FEATURE_PRODUCT_TYPE_ENUM).min(1),
  storeId: z.string().optional(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0).max(FEATURE_DISPLAY_ORDER_MAX),
});

/** Shape for POST /api/store/features — store-scope only, storeId set server-side. */
export const productFeatureStoreCreateSchema = z.object({
  label: z.string().min(1).max(FEATURE_LABEL_MAX),
  description: z.string().max(FEATURE_DESCRIPTION_MAX).optional(),
  icon: z.string().min(1).max(FEATURE_ICON_MAX),
  iconColor: z.string().max(FEATURE_ICON_COLOR_MAX).optional(),
  category: PRODUCT_FEATURE_CATEGORY_ENUM,
  productTypes: z.array(PRODUCT_FEATURE_PRODUCT_TYPE_ENUM).min(1),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0).max(FEATURE_DISPLAY_ORDER_MAX),
});

/** Shape for PUT /api/admin/features/[id] and /api/store/features/[id]. */
export const productFeatureUpdateSchema = z.object({
  label: z.string().min(1).max(FEATURE_LABEL_MAX).optional(),
  description: z.string().max(FEATURE_DESCRIPTION_MAX).optional(),
  icon: z.string().min(1).max(FEATURE_ICON_MAX).optional(),
  iconColor: z.string().max(FEATURE_ICON_COLOR_MAX).optional(),
  category: PRODUCT_FEATURE_CATEGORY_ENUM.optional(),
  productTypes: z.array(PRODUCT_FEATURE_PRODUCT_TYPE_ENUM).min(1).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(FEATURE_DISPLAY_ORDER_MAX).optional(),
});

export type ProductFeatureAdminCreatePayload = z.infer<
  typeof productFeatureAdminCreateSchema
>;
export type ProductFeatureStoreCreatePayload = z.infer<
  typeof productFeatureStoreCreateSchema
>;
export type ProductFeatureUpdatePayload = z.infer<
  typeof productFeatureUpdateSchema
>;
