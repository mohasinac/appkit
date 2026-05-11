import { z } from "zod";
import { BRAND_NAME_MAX_LENGTH, BRAND_DESCRIPTION_MAX_LENGTH } from "./config";

export const brandInputSchema = z.object({
  name: z.string().min(1).max(BRAND_NAME_MAX_LENGTH),
  slug: z.string().min(1).regex(/^brand-[a-z0-9-]+$/, "Slug must start with 'brand-' and contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(BRAND_DESCRIPTION_MAX_LENGTH).optional(),
  logoURL: z.string().url().optional(),
  bannerURL: z.string().url().optional(),
  website: z.string().url().optional(),
  country: z.string().optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const brandUpdateSchema = brandInputSchema.partial().omit({ slug: true });

export type BrandInput = z.infer<typeof brandInputSchema>;
export type BrandUpdate = z.infer<typeof brandUpdateSchema>;
