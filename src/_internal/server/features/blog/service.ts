import { blogRepository } from "../../../../repositories";
import { BlogPostNotFoundError, BlogSlugConflictError } from "../../../shared/features/blog/errors";

export async function assertBlogPostExists(slugOrId: string) {
  const post = await blogRepository.findBySlug(slugOrId).catch(() => null)
    ?? await blogRepository.findById(slugOrId).catch(() => null);
  if (!post) throw new BlogPostNotFoundError(slugOrId);
  return post;
}

export async function assertBlogSlugUnique(slug: string): Promise<void> {
  const existing = await blogRepository.findBySlug(slug).catch(() => null);
  if (existing) throw new BlogSlugConflictError(slug);
}

export function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
