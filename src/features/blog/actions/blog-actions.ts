import { z } from "zod";
import { serverLogger } from "../../../monitoring";
import { blogRepository } from "../repository/blog.repository";
import { coerceMediaField, getMediaUrl, type MediaField } from "../../../utils";
import {
  finalizeStagedMediaField,
  finalizeStagedMediaObject,
  finalizeStagedMediaObjectArray,
} from "../../media/finalize";
import type {
  BlogPostDocument,
  BlogPostCreateInput,
  BlogPostUpdateInput,
} from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

// --- Schemas --------------------------------------------------------------

const singleImageMediaSchema = z
  .union([
    z.object({
      url: z.string().url(),
      type: z.enum(["image", "video", "file"]),
      alt: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
    }),
    z
      .string()
      .url()
      .transform((url) => ({ url, type: "image" as const })),
  ])
  .nullable()
  .optional();

const mediaFieldSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video", "file"]),
  alt: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const createBlogPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(["news", "tips", "guides", "updates", "community"]),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  coverImage: singleImageMediaSchema,
  contentImages: z.array(mediaFieldSchema).max(10).optional().default([]),
  additionalImages: z.array(mediaFieldSchema).max(5).optional().default([]),
  authorId: z.string().min(1).optional(),
  authorName: z.string().min(1).optional(),
  authorAvatar: z.string().optional(),
  readTimeMinutes: z.number().int().min(1).default(5),
  publishedAt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

// --- Actions --------------------------------------------------------------

export async function createBlogPost(
  input: CreateBlogPostInput,
  author: { uid: string; name?: string; email?: string; picture?: string },
): Promise<BlogPostDocument> {
  const finalizedCoverUrl = await finalizeStagedMediaField(
    getMediaUrl(input.coverImage),
  );
  const finalizedCoverImage = await finalizeStagedMediaObject(
    coerceMediaField(
      input.coverImage ?? finalizedCoverUrl ?? null,
    ) as MediaField | null,
  );
  const finalizedContentImages = await finalizeStagedMediaObjectArray(
    input.contentImages,
  );
  const finalizedAdditionalImages = await finalizeStagedMediaObjectArray(
    input.additionalImages,
  );

  const data = {
    ...input,
    coverImage: finalizedCoverImage ?? null,
    contentImages: finalizedContentImages,
    additionalImages: finalizedAdditionalImages,
    authorId: input.authorId?.trim() || author.uid,
    authorName:
      input.authorName?.trim() ||
      author.name ||
      author.email?.split("@")[0] ||
      "Admin",
    authorAvatar: input.authorAvatar || author.picture,
  } as BlogPostCreateInput;

  const post = await blogRepository.create(data);

  serverLogger.info("createBlogPost", {
    authorId: author.uid,
    postId: post.id,
  });

  return post;
}

export async function updateBlogPost(
  id: string,
  input: UpdateBlogPostInput,
): Promise<BlogPostDocument> {
  const finalizedCoverUrl = await finalizeStagedMediaField(
    getMediaUrl(input.coverImage),
  );
  const finalizedCoverImage =
    input.coverImage === null
      ? null
      : await finalizeStagedMediaObject(
          coerceMediaField(
            input.coverImage ?? finalizedCoverUrl ?? null,
          ) as MediaField | null,
        );
  const finalizedContentImages = input.contentImages
    ? await finalizeStagedMediaObjectArray(input.contentImages)
    : undefined;
  const finalizedAdditionalImages = input.additionalImages
    ? await finalizeStagedMediaObjectArray(input.additionalImages)
    : undefined;

  const post = await blogRepository.update(id, {
    ...input,
    coverImage:
      input.coverImage === null ? null : (finalizedCoverImage ?? undefined),
    contentImages: finalizedContentImages,
    additionalImages: finalizedAdditionalImages,
  } as BlogPostUpdateInput);

  serverLogger.info("updateBlogPost", { postId: id });

  return post;
}

export async function deleteBlogPost(id: string): Promise<void> {
  await blogRepository.delete(id);
  serverLogger.info("deleteBlogPost", { postId: id });
}

export async function listBlogPosts(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<FirebaseSieveResult<BlogPostDocument>> {
  const sieve: SieveModel = {
    sorts: params?.sorts ?? "-publishedAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 10,
  };
  return blogRepository.listPublished(
    { category: params?.category as any },
    sieve,
  );
}

export async function getFeaturedBlogPosts(
  count = 3,
): Promise<BlogPostDocument[]> {
  const result = await blogRepository.listPublished(
    { featuredOnly: true },
    { sorts: "-publishedAt", page: 1, pageSize: count },
  );
  return result.items;
}

export async function getLatestBlogPosts(
  count = 5,
): Promise<BlogPostDocument[]> {
  const result = await blogRepository.listPublished(
    {},
    { sorts: "-publishedAt", page: 1, pageSize: count },
  );
  return result.items;
}

export async function getBlogPostById(
  id: string,
): Promise<BlogPostDocument | null> {
  return blogRepository.findById(id);
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPostDocument | null> {
  return blogRepository.findBySlug(slug);
}
