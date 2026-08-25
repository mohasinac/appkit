/*
 * WHY: The blog form's schema used to live inside `AdminBlogEditorView.tsx`.
 *      Registering it in `SCHEMAS.forms` from there would have made
 *      `schemas/registry.ts` import a `.tsx` component — and `routeHandler.ts`
 *      imports SCHEMAS, so every API route would have pulled the admin blog
 *      editor's whole React tree into the server bundle. Schemas belong in
 *      `schemas/`; that is the layering this restores.
 * WHAT: The blog editor's form schema, with its UI metadata.
 *
 * EXPORTS:
 *   blogDraftSchema
 *
 * @tag domain:blog
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminBlogEditorView,SCHEMAS.forms
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { blogPostCategorySchema } from "./index";

/**
 * The blog form's own schema. Distinct from `blogPostSchema` (blog/schemas),
 * which requires an `id` this draft cannot have before its first save and
 * models `coverImage` as a `MediaField` where the form holds a plain URL.
 *
 * ## Why `.passthrough()` is gone
 *
 * It used to name FOUR of the draft's fourteen fields and rely on passthrough
 * to keep the other ten alive. That is the single most dangerous shape in this
 * codebase — `z.object()` strips unknown keys, so the moment anyone tightened
 * it, ten fields would vanish on the next save with no error. Verified safe to
 * remove here: every one of the fourteen is now named, and the save payload
 * (below) maps each explicitly rather than spreading the draft, so there is no
 * extra key for passthrough to have been protecting.
 *
 * ## Section, row and control come from the field itself
 *
 * 🛑 `annotate()` must be the OUTERMOST call — it keys a WeakMap by schema
 * instance and every zod wrapper returns a new one, so
 * `annotate(z.string(), …).optional()` silently loses the metadata and drops
 * the field into the "advanced" fallback. `audit-field-ui-meta` blocks it.
 */
export const blogDraftSchema = z.object({
  title: annotate(z.string().min(1, "Title is required"), {
    section: "content", sectionLabel: "Content", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  /**
   * NO `blog-` prefix. Surfaced by `roundtrip-diff` in W4: the schema demanded
   * `/^blog-/`, and **all 20 stored posts fail it** — every seeded post holds
   * the bare slug (`spot-genuine-takara-tomy-beyblade`) while only the
   * DOCUMENT ID carries the prefix (`generateBlogPostId` adds it).
   *
   * `BlogRepository.findBySlug` queries this field directly, so the public URL
   * is the bare slug. The regex therefore broke the editor from both ends:
   * opening any existing post flagged its slug invalid, and "fixing" it to
   * satisfy the rule would rewrite the stored slug and 404 the live URL.
   */
  slug: annotate(
    z.string().min(1, "Slug is required"),
    {
      section: "content", quick: true, order: 2, row: "full",
      // T1 calculated: derived from the title on CREATE only, then frozen.
      // Recomputing on rename would break every inbound link and bookmark —
      // categories, brands and bundles all establish that convention.
      tier: "t1-derive",
      help: "Auto-filled from the title. Changing it after publishing breaks existing links.",
    },
  ),
  excerpt: annotate(z.string().max(300, "Keep the excerpt under 300 characters."), {
    section: "content", order: 3, row: "full",
  }),
  content: annotate(z.string().min(1, "Content is required"), {
    section: "content", quick: true, order: 4, row: "full",
  }),

  coverImage: annotate(z.string(), {
    section: "media", sectionLabel: "Media", order: 1, row: "full", kind: "media",
  }),
  youtubeId: annotate(z.string(), {
    section: "media", order: 2, row: "full",
    help: "A YouTube video id or watch URL — rendered as a privacy-mode embed.",
  }),

  category: annotate(blogPostCategorySchema, {
    section: "seo", sectionLabel: "SEO & Tags", quick: true, order: 1, row: "pair",
  }),
  tags: annotate(z.array(z.string()), {
    section: "seo", order: 2, row: "full", kind: "list",
  }),
  metaTitle: annotate(z.string().max(60, "Keep the meta title under 60 characters."), {
    section: "seo", order: 3, row: "full", tier: "t1-derive",
  }),
  metaDescription: annotate(
    z.string().max(160, "Keep the meta description under 160 characters.").or(z.literal("")),
    { section: "seo", order: 4, row: "full", tier: "t1-derive" },
  ),

  status: annotate(z.enum(["draft", "published", "archived"]), {
    section: "publish", sectionLabel: "Publish", quick: true, order: 1, row: "pair",
  }),
  publishedAt: annotate(z.string(), {
    section: "publish", order: 2, row: "pair", kind: "date",
  }),
  authorName: annotate(z.string(), { section: "publish", order: 3, row: "pair" }),
  isFeatured: annotate(z.boolean(), { section: "publish", order: 4, row: "quarter" }),
});
