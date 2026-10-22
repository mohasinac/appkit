"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { blogRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { blogPostInputSchema, blogPostUpdateSchema } from "../../../shared/features/blog/schema";
import { assertBlogPostExists, assertBlogSlugUnique, computeReadTime } from "./service";
import { ValidationError } from "../../../shared/errors/index";
import type { FirestoreDocument } from "@mohasinac/appkit";

export async function createBlogPostAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);
      const parsed = blogPostInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid blog post input");
      await assertBlogSlugUnique(parsed.data.slug);
      const readTime = computeReadTime(parsed.data.content);
      return blogRepository.createWithId(parsed.data.slug, {
        ...(parsed.data as any),
        authorId: user.uid,
        authorName: user.name ?? "Editorial Team",
        readTimeMinutes: readTime,
        views: 0,
        publishedAt: parsed.data.status === "published" ? new Date() : undefined,
      });
  });
}

export async function updateBlogPostAction(postId: string, input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);
      const post = await assertBlogPostExists(postId);
      const parsed = blogPostUpdateSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid blog post input");
      const updates: FirestoreDocument = { ...parsed.data };
      if (parsed.data.content) updates.readTimeMinutes = computeReadTime(parsed.data.content);
      if (parsed.data.status === "published" && post.status !== "published") {
        updates.publishedAt = new Date();
      }
      return blogRepository.update(postId, updates as any);
  });
}

export async function deleteBlogPostAction(postId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      await assertBlogPostExists(postId);
      return blogRepository.delete(postId);
  });
}

export async function publishBlogPostAction(postId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);
      await assertBlogPostExists(postId);
      return blogRepository.update(postId, { status: "published", publishedAt: new Date() } as any);
  });
}

export async function unpublishBlogPostAction(postId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);
      await assertBlogPostExists(postId);
      return blogRepository.update(postId, { status: "draft" } as any);
  });
}
