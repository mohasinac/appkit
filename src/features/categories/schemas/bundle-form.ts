/*
 * WHY: `AdminBundleEditorView` declared a seven-field `.passthrough()` schema
 *      inside the component, passed it to `<Form schema>`, and never parsed it
 *      — the submit handler ran two hand-written `if` checks instead. So the
 *      only rules that ever ran were "name is non-empty" and "price parses",
 *      and the member-count bounds the form DISPLAYS (`min 3, max 16`) were
 *      rendered as red hint text under the picker with nothing stopping a save.
 *      A bundle with one member, or with twenty, saved cleanly.
 * WHAT: The bundle editor's schema — the real field set, annotated for
 *       `buildSectionsFromSchema`, with the member-count bounds as a
 *       `superRefine` keyed on the rule type.
 *
 * ## `dynamicRule` is a field, not a side-car
 *
 * The editor held it in component state beside the schema, so `visibleValues`
 * could not see it and the payload builder had to restate the static/dynamic
 * branch by hand. Declaring it here is what makes "a hidden control is not
 * sent" structural: `ruleType` switches which of the two member sources is on
 * screen, and the same predicate decides which reaches the payload.
 *
 * ## Prices stay strings
 *
 * `priceRupees` comes from an `<input>`, so it is a string here and coerced
 * once, in the payload builder. Coercing inside the schema would put a
 * `Number()` at every call site, which is how a `NaN` reaches Firestore.
 *
 * EXPORTS:
 *   bundleFormSchema, type BundleFormValues, BUNDLE_RULE_TYPE_OPTIONS
 *
 * @tag domain:categories
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminBundleEditorView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";
import {
  BUNDLE_MIN_ITEMS,
  BUNDLE_MAX_ITEMS,
} from "../../../_internal/shared/features/categories/bundle-config";

/** The two member sources, as the rule-type select offers them. */
export const BUNDLE_RULE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "static", label: BUNDLE_COPY.adminEditor.ruleTypeStatic },
  { value: "dynamic", label: BUNDLE_COPY.adminEditor.ruleTypeDynamic },
];

/**
 * The dynamic rule, as `BundleDynamicRuleEditor` edits it.
 *
 * Mirrors the `type: "dynamic"` arm of `BundleQueryRule` so the draft can be
 * handed to the API without a cast.
 */
const dynamicRuleSchema = z.object({
  type: z.literal("dynamic"),
  filter: z.object({
    categorySlug: z.string().optional(),
    brandSlug: z.string().optional(),
    tags: z.array(z.string()).optional(),
    listingType: z.enum(["standard", "pre-order", "prize-draw"]).optional(),
  }),
  orderBy: z.enum(["price-asc", "price-desc", "createdAt-desc"]).optional(),
  limit: z.number().int().min(1).max(50),
});

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const bundleFormSchema = z
  .object({
    name: annotate(
      z
        .string()
        .min(1, BUNDLE_COPY.adminEditor.errors.nameRequired)
        .max(150, "Keep the name under 150 characters."),
      {
        section: "basics", sectionLabel: "Bundle", sectionRequired: true,
        quick: true, order: 1, row: "pair", label: "Name",
      },
    ),
    priceRupees: annotate(
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, BUNDLE_COPY.adminEditor.errors.priceInvalid)
        .refine((v) => Number(v) > 0, BUNDLE_COPY.adminEditor.errors.priceInvalid),
      {
        section: "basics", quick: true, order: 2, row: "pair",
        kind: "number", label: "Bundle price (₹)",
        help: "What the buyer pays for the whole bundle — normally less than the members' total.",
      },
    ),
    description: annotate(z.string().max(2000).optional().or(z.literal("")), {
      section: "basics", order: 3, row: "full", kind: "textarea",
      label: BUNDLE_COPY.adminEditor.fields.descriptionLabel,
    }),

    ruleType: annotate(z.enum(["static", "dynamic"]), {
      section: "members", sectionLabel: BUNDLE_COPY.picker.title,
      order: 1, row: "full", kind: "select",
      label: BUNDLE_COPY.adminEditor.ruleTypeLabel,
    }),
    /*
     * Bounded in the `superRefine` rather than with `.min()/.max()` here,
     * because an empty picker on a DYNAMIC bundle is correct — the resolver
     * fills the mirror. A flat `.min(3)` would block every dynamic save.
     */
    productIds: annotate(z.array(z.string()), {
      section: "members", order: 2, row: "full", kind: "list",
      label: `${BUNDLE_COPY.adminEditor.ruleTypeStatic} (${BUNDLE_MIN_ITEMS}–${BUNDLE_MAX_ITEMS})`,
      when: (v) => v.ruleType !== "dynamic",
    }),
    dynamicRule: annotate(dynamicRuleSchema, {
      section: "members", order: 3, row: "full",
      label: BUNDLE_COPY.adminEditor.dynamic.title,
      help: BUNDLE_COPY.adminEditor.dynamic.hint,
      when: (v) => v.ruleType === "dynamic",
    }),

    coverImage: annotate(
      z
        .string()
        .url("Enter a full image URL, starting with http.")
        .optional()
        .or(z.literal("")),
      {
        section: "media", sectionLabel: "Presentation", order: 1, row: "full",
        inputType: "url", label: BUNDLE_COPY.adminEditor.fields.coverImageLabel,
      },
    ),
    brandSlug: annotate(z.string().optional().or(z.literal("")), {
      section: "media", order: 2, row: "pair", kind: "select", label: "Brand",
      help: "The bundle's own brand tag — independent of how its members resolve.",
    }),

    isActive: annotate(z.boolean(), {
      section: "visibility", sectionLabel: "Visibility", order: 1, row: "full",
      label: BUNDLE_COPY.adminEditor.fields.activeLabel,
    }),
  })
  .superRefine((v, ctx) => {
    /*
     * The bounds the picker has always DISPLAYED, now enforced. They were two
     * `<Text color="danger">` hints under the multi-select and nothing read
     * them — a two-member bundle saved, and `listBundleMembers` rendered it as
     * a "bundle" of two.
     */
    if (v.ruleType !== "static") return;
    if (v.productIds.length < BUNDLE_MIN_ITEMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productIds"],
        message: `Select at least ${BUNDLE_MIN_ITEMS} products (currently ${v.productIds.length}).`,
      });
    } else if (v.productIds.length > BUNDLE_MAX_ITEMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productIds"],
        message: `Maximum ${BUNDLE_MAX_ITEMS} products allowed (currently ${v.productIds.length}).`,
      });
    }
  });

export type BundleFormValues = z.infer<typeof bundleFormSchema>;
