import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

const productConditionSchema = z.enum([
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
  "used",
  "refurbished",
  "broken",
  "graded",
]);

export const createCatalogueItemSchema = z.object({
  title: annotate(z.string().min(1, "Title is required"), {
    section: "basics", sectionLabel: "Item", sectionRequired: true,
    order: 1, row: "full", label: "Title",
  }),
  description: annotate(z.string().optional(), {
    section: "basics", order: 2, row: "full", kind: "textarea", label: "Description",
  }),
  condition: annotate(productConditionSchema.optional(), {
    section: "basics", order: 3, row: "pair", kind: "select", label: "Condition",
  }),
  quantity: annotate(z.number().int().min(1).default(1), {
    section: "basics", order: 4, row: "pair", kind: "number", label: "Quantity",
  }),
  /*
   * `kind: "media"` is inferred from the field NAME (field-ui-meta.ts:336),
   * which also sets `sectionKeepMounted` — mandatory here, because a collapsed
   * section unmounts and would discard an in-flight upload. Declared anyway so
   * the section id and order are not left to inference.
   */
  images: annotate(z.array(z.string()).default([]), {
    section: "media", sectionLabel: "Photos", order: 1, row: "full", kind: "media",
    sectionKeepMounted: true, label: "Photos",
  }),
  mainImage: annotate(z.string().optional(), {
    section: "media", order: 2, row: "full", kind: "media", label: "Main photo",
  }),
  categorySlugs: annotate(z.array(z.string()).optional(), {
    section: "classification", sectionLabel: "Filing", order: 1, row: "pair",
    label: "Categories",
  }),
  brandSlug: annotate(z.string().optional(), {
    section: "classification", order: 2, row: "pair", kind: "select", label: "Brand",
  }),
  price: annotate(z.number().min(0).optional(), {
    section: "pricing", sectionLabel: "Value", order: 1, row: "pair", kind: "number",
    label: "Estimated value (₹)",
  }),
  visibility: annotate(z.enum(["public", "private"]).default("public"), {
    section: "visibility", order: 1, row: "pair", kind: "select", label: "Visibility",
  }),
});
export const updateCatalogueItemSchema = createCatalogueItemSchema.partial();

export type CreateCatalogueItemInput = z.infer<typeof createCatalogueItemSchema>;
export type UpdateCatalogueItemInput = z.infer<typeof updateCatalogueItemSchema>;
