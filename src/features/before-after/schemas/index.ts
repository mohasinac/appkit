import { z } from "zod";

/**
 * Base Zod schema for a before-after item.
 *
 * @example
 * import { beforeAfterItemSchema } from "@mohasinac/feat-before-after";
 *
 * const mySchema = beforeAfterItemSchema.extend({
 *   doctorName: z.string().optional(),
 * });
 */
export const beforeAfterItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  concern: z.string().optional(),
  productId: z.string().optional(),
  beforeImageUrl: z.string().optional(),
  afterImageUrl: z.string().optional(),
  durationWeeks: z.number().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.string().optional(),
});
