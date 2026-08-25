/**
 * Zod validators shared by the admin and store `/api/.../features` route handlers.
 *
 * Kept alongside the schema so the enum sources of truth (category/scope/
 * productType) live in one place. Route handlers compose from these instead
 * of hand-rolling parallel schemas.
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

export const PRODUCT_FEATURE_PRODUCT_TYPE_ENUM = z.enum([
  "product",
  "auction",
  "preorder",
  "prize-draw",
  "classified",
  "digital-code",
  "live",
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

/**
 * The FORM schema for the product-feature editor, with UI metadata.
 *
 * `AdminFeatureEditorView` had **no validation whatsoever** before W5 — ten
 * `useState` fields, `required` on the inputs (an HTML attribute any
 * programmatic submit bypasses), and nothing else. Meanwhile these validators
 * had existed all along and simply were not wired: the "schema exists, the
 * consumer ignores it" case the plan catalogues.
 *
 * It reuses `productFeatureAdminCreateSchema`'s field shapes rather than
 * restating them — a second copy of the same bounds is how the two would come
 * to disagree. Only the annotations are new.
 *
 * 🛑 `annotate()` must be the OUTERMOST call — it keys a WeakMap by schema
 * instance and every zod wrapper returns a new one.
 */
export const productFeatureFormSchema = z.object({
  label: annotate(productFeatureAdminCreateSchema.shape.label, {
    section: "basics", sectionLabel: "Feature", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  description: annotate(productFeatureAdminCreateSchema.shape.description, {
    section: "basics", order: 2, row: "full",
  }),
  icon: annotate(productFeatureAdminCreateSchema.shape.icon, {
    section: "basics", quick: true, order: 3, row: "pair",
  }),
  iconColor: annotate(productFeatureAdminCreateSchema.shape.iconColor, {
    section: "basics", order: 4, row: "pair",
  }),

  category: annotate(productFeatureAdminCreateSchema.shape.category, {
    section: "scope", sectionLabel: "Scope & Applicability",
    quick: true, order: 1, row: "pair",
  }),
  scope: annotate(productFeatureAdminCreateSchema.shape.scope, {
    section: "scope", quick: true, order: 2, row: "pair",
  }),
  productTypes: annotate(productFeatureAdminCreateSchema.shape.productTypes, {
    section: "scope", order: 3, row: "full", kind: "list",
  }),
  storeId: annotate(productFeatureAdminCreateSchema.shape.storeId, {
    section: "scope", order: 4, row: "pair",
    help: "Only used when scope is \"store\".",
  }),

  isActive: annotate(productFeatureAdminCreateSchema.shape.isActive, {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
  }),
  displayOrder: annotate(productFeatureAdminCreateSchema.shape.displayOrder, {
    section: "visibility", order: 2, row: "pair",
  }),
}).superRefine((v, ctx) => {
  // The one rule no per-field bound can state: a store-scoped feature must
  // name its store. The server enforces it too — this exists so the admin is
  // told before submitting rather than by a 400.
  if (v.scope === "store" && !v.storeId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeId"],
      message: "A store-scoped feature must name a store.",
    });
  }
});

export type ProductFeatureFormValues = z.infer<typeof productFeatureFormSchema>;

export type ProductFeatureAdminCreatePayload = z.infer<
  typeof productFeatureAdminCreateSchema
>;
export type ProductFeatureStoreCreatePayload = z.infer<
  typeof productFeatureStoreCreateSchema
>;
export type ProductFeatureUpdatePayload = z.infer<
  typeof productFeatureUpdateSchema
>;
