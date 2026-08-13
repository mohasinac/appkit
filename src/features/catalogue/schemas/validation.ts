import { z } from "zod";

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
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  mainImage: z.string().optional(),
  condition: productConditionSchema.optional(),
  categorySlugs: z.array(z.string()).optional(),
  brandSlug: z.string().optional(),
  price: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).default(1),
  visibility: z.enum(["public", "private"]).default("public"),
});
export const updateCatalogueItemSchema = createCatalogueItemSchema.partial();

export type CreateCatalogueItemInput = z.infer<typeof createCatalogueItemSchema>;
export type UpdateCatalogueItemInput = z.infer<typeof updateCatalogueItemSchema>;
