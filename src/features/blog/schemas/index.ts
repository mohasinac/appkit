export * from "./firestore";
import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";
import { auditTimestampsShape, firestoreDateSchema } from "../../../schemas/firestore-helpers";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors BlogPostDocument in ./firestore.ts. Registered into SCHEMAS.firestore.blogPosts.

export const blogPostStatusEnumSchema = z.enum(["draft", "published", "archived"]);

export const blogPostFirestoreSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  content: z.string(),
  coverImage: mediaFieldSchema.optional(),
  contentImages: z.array(mediaFieldSchema).optional(),
  additionalImages: z.array(mediaFieldSchema).optional(),
  category: z.string(),
  tags: z.array(z.string()),
  isFeatured: z.boolean(),
  status: blogPostStatusEnumSchema,
  publishedAt: firestoreDateSchema.optional(),
  authorId: z.string(),
  authorName: z.string(),
  authorAvatar: z.string().optional(),
  readTimeMinutes: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ...auditTimestampsShape,
});

export type BlogPostFromSchema = z.infer<typeof blogPostFirestoreSchema>;

const blogCoverImageSchema = z
  .union([
    mediaFieldSchema,
    z
      .string()
      .url()
      .transform((url) => ({ url, type: "image" as const })),
  ])
  .nullable()
  .optional()
  .transform((value) => value ?? null);

// --- Sub-schemas --------------------------------------------------------------

export const blogPostCategorySchema = z.enum([
  "news",
  "tips",
  "guides",
  "updates",
  "community",
]);

export const blogPostStatusSchema = z.enum(["draft", "published", "archived"]);

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for a blog post.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { blogPostSchema } from "@mohasinac/feat-blog";
 *
 * const myPostSchema = blogPostSchema.extend({
 *   series: z.string().optional(),
 *   sponsoredBy: z.string().optional(),
 * });
 * type MyPost = z.infer<typeof myPostSchema>;
 */
export const blogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  coverImage: blogCoverImageSchema,
  contentImages: z.array(mediaFieldSchema).max(10).optional().default([]),
  additionalImages: z.array(mediaFieldSchema).max(5).optional().default([]),
  category: blogPostCategorySchema,
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  status: blogPostStatusSchema,
  publishedAt: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  readTimeMinutes: z.number().optional(),
  views: z.number().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** Base Zod schema for list-query parameters. */
export const blogListParamsSchema = z.object({
  category: blogPostCategorySchema.optional(),
  tags: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sort: z.string().optional(),
  featured: z.coerce.boolean().optional(),
});
