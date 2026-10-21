import { z } from "zod";
import { BRAND_NAME_MAX_LENGTH, BRAND_DESCRIPTION_MAX_LENGTH } from "./config";
import { mediaUrlSchema } from "../../../../validation/schemas";

export const brandInputSchema = z.object({
  name: z.string().min(1).max(BRAND_NAME_MAX_LENGTH),
  slug: z.string().min(1).regex(/^brand-[a-z0-9-]+$/, "Slug must start with 'brand-' and contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(BRAND_DESCRIPTION_MAX_LENGTH).optional(),
  logoURL: mediaUrlSchema.optional(),
  // `website` is a genuine EXTERNAL link, not stored media — stays `.url()`.
  website: z.string().url().optional(),
  country: z.string().optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  /*
   * Editorial content, rendered by `CategoryHighlightsAndFaqSection` on the
   * brand page and previously unauthorable — the form did not carry them, so
   * this schema did not need them either.
   *
   * 🛑 CAPPED, both of them. These render in a fixed block above the fold on
   * a public page, and an unbounded list is how a form becomes a way to break
   * the page it feeds. The numbers match what the category editor already
   * enforces for the same two fields on the same renderer.
   */
  highlights: z.array(z.string().min(1).max(200)).max(8).optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(1).max(300),
        answer: z.string().min(1).max(2000),
      }),
    )
    .max(8)
    .optional(),
});

export const brandUpdateSchema = brandInputSchema.partial().omit({ slug: true });

export type BrandInput = z.infer<typeof brandInputSchema>;
export type BrandUpdate = z.infer<typeof brandUpdateSchema>;
