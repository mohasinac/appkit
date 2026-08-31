/*
 * WHY: Shared tester sandbox — 1 disposable test blog post so testers can exercise the
 *      blog reading flow. Auto-expires after 7 days (testerSandboxCleanup).
 * WHAT: Exports blogTesterSeedData — 1 Partial<BlogPostDocument> tagged isTestData:true.
 *
 * EXPORTS:
 *   blogTesterSeedData — Array of 1 Partial<BlogPostDocument> for the seed runner
 *
 * @tag domain:blog,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { BlogPostDocument } from "../../blog/schemas";
import { seedPhoto } from "../../../seed/_helpers/media";
import { testDataExpiresAt } from "./tester-ttl";

export const blogTesterSeedData: Partial<BlogPostDocument>[] = [
  {
    id: "blog-tester-sandbox-post",
    title: "Welcome to the Tester Sandbox",
    slug: "tester-sandbox-post",
    excerpt: "A disposable test blog post for the tester QA program — check that images, formatting, and reading flow work correctly.",
    content: `<h2>This is a test post</h2><p>It exists only for the tester QA program and will be deleted automatically after 7 days.</p><p>Check: does this render correctly? Are images loading? Is the layout readable?</p>`,
    coverImage: { type: "image", url: seedPhoto("blog-cover-tester-sandbox-post-20260101", 1200, 600), alt: "Test cover image" },
    category: "guides",
    tags: ["test"],
    isFeatured: false,
    status: "published",
    publishedAt: new Date(),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 1,
    views: 0,
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<BlogPostDocument>,
];
