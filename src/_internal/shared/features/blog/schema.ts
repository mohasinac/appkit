import { z } from "zod";
import { BLOG_TITLE_MAX_LENGTH, BLOG_EXCERPT_MAX_LENGTH } from "./config";

export const blogPostInputSchema = z.object({
  title: z.string().min(3).max(BLOG_TITLE_MAX_LENGTH),
  slug: z.string().min(1).regex(/^blog-[a-z0-9-]+$/, "Slug must start with 'blog-'"),
  excerpt: z.string().max(BLOG_EXCERPT_MAX_LENGTH).optional(),
  content: z.string().max(100000),
  coverImage: z.string().url().optional(),
  youtubeId: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).max(10).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
});

export const blogPostUpdateSchema = blogPostInputSchema.partial().omit({ slug: true });

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
export type BlogPostUpdate = z.infer<typeof blogPostUpdateSchema>;
