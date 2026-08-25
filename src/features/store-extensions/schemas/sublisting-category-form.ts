/*
 * WHY: Both sub-listing-category pages (`new` and `[id]/edit`) rendered
 *      `<Form>` with no schema and guarded only on `!name.trim()`. A
 *      sub-listing category groups the same real-world collectible across
 *      grades and conditions, so its `itemCode` is the identifier buyers match
 *      against — and it was unbounded free text.
 *
 * WHAT: One schema for both pages.
 *
 * `slug`/`seo` are absent: the route derives them, and the sibling route
 * already recomputes `seo.title`/`seo.description` on rename (verified, not
 * assumed — it is one of the RC #39 instances that turned out already fixed).
 *
 * EXPORTS: sublistingCategoryFormSchema, type SublistingCategoryFormValues
 *
 * @tag domain:store-extensions
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:store/sublisting-categories pages
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

export const sublistingCategoryFormSchema = z.object({
  name: annotate(z.string().trim().min(2, "A name is required.").max(160), {
    section: "basics", sectionLabel: "Sub-listing", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  /*
   * The catalogue identifier buyers match on — e.g. "108/120". Bounded and
   * trimmed so it stays comparable; a stray space made two otherwise identical
   * codes distinct.
   */
  itemCode: annotate(z.string().trim().max(80, "Keep the item code under 80 characters.").optional(), {
    section: "basics", quick: true, order: 2, row: "pair",
  }),
  description: annotate(z.string().trim().max(1000, "Keep the description under 1000 characters.").optional(), {
    section: "basics", order: 3, row: "full", kind: "textarea",
  }),
});

export type SublistingCategoryFormValues = z.infer<typeof sublistingCategoryFormSchema>;
