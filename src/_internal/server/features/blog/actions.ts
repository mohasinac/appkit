"use server";

import { blogRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { blogPostInputSchema, blogPostUpdateSchema } from "../../../shared/features/blog/schema";
import { assertBlogPostExists, assertBlogSlugUnique, computeReadTime } from "./service";
import { ValidationError } from "../../../shared/errors/index";

export async function createBlogPostAction(input: unknown) {
  const user = await requireRoleUser(["admin", "moderator"]);
  const parsed = blogPostInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid blog post input");
  await assertBlogSlugUnique(parsed.data.slug);
  const readTime = computeReadTime(parsed.data.content);
  return blogRepository.createWithId(parsed.data.slug, {
    ...(parsed.data as any),
    authorId: user.uid,
    authorName: user.name ?? "LetItRip Team",
    readTimeMinutes: readTime,
    views: 0,
    publishedAt: parsed.data.status === "published" ? new Date() : undefined,
  });
}

export async function updateBlogPostAction(postId: string, input: unknown) {
  await requireRoleUser(["admin", "moderator"]);
  const post = await assertBlogPostExists(postId);
  const parsed = blogPostUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid blog post input");
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.content) updates.readTimeMinutes = computeReadTime(parsed.data.content);
  if (parsed.data.status === "published" && post.status !== "published") {
    updates.publishedAt = new Date();
  }
  return blogRepository.update(postId, updates as any);
}

export async function deleteBlogPostAction(postId: string) {
  await requireRoleUser("admin");
  await assertBlogPostExists(postId);
  return blogRepository.delete(postId);
}

export async function publishBlogPostAction(postId: string) {
  await requireRoleUser(["admin", "moderator"]);
  await assertBlogPostExists(postId);
  return blogRepository.update(postId, { status: "published", publishedAt: new Date() } as any);
}

export async function unpublishBlogPostAction(postId: string) {
  await requireRoleUser(["admin", "moderator"]);
  await assertBlogPostExists(postId);
  return blogRepository.update(postId, { status: "draft" } as any);
}
