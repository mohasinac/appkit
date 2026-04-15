import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const faqCategorySchema = z.enum([
  "orders_payment",
  "shipping_delivery",
  "returns_refunds",
  "product_information",
  "account_security",
  "technical_support",
  "general",
]);

export const faqAnswerFormatSchema = z.enum(["plain", "markdown", "html"]);

export const faqAnswerSchema = z.object({
  text: z.string(),
  format: faqAnswerFormatSchema,
});

export const faqStatsSchema = z.object({
  views: z.number().optional(),
  helpful: z.number().optional(),
  notHelpful: z.number().optional(),
});

// ─── Base item schema ─────────────────────────────────────────────────────────

/**
 * Base Zod schema for a FAQ item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { faqSchema } from "@mohasinac/feat-faq";
 *
 * const myFaqSchema = faqSchema.extend({
 *   productId: z.string().optional(),
 *   videoUrl: z.string().optional(),
 * });
 * type MyFaq = z.infer<typeof myFaqSchema>;
 */
export const faqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: faqAnswerSchema,
  category: faqCategorySchema,
  showOnHomepage: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  order: z.number().optional(),
  priority: z.number().optional(),
  tags: z.array(z.string()).optional(),
  relatedFAQs: z.array(z.string()).optional(),
  stats: faqStatsSchema.optional(),
  seo: z.object({ slug: z.string().optional() }).optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** Base schema for list-query parameters. */
export const faqListParamsSchema = z.object({
  category: faqCategorySchema.optional(),
  homepage: z.coerce.boolean().optional(),
  q: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
});

export * from "./firestore";
