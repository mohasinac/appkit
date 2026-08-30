/*
 * WHY: A cluster of admin editors rendered `<Form>` with no schema. Two of
 *      them write PII, and one changes a store's standing on the platform.
 *
 *      `AdminAddressEditorView` is the PII one: `fullName`, `phone` and the
 *      address lines are all encrypted at rest, and none was checked — a
 *      postal code could be any string, and `ownerId` (which decides WHOSE
 *      address this is) was free text.
 *
 *      `AdminStoreEditorView` sets `storeStatus`, `isVerified`, `isFeatured`
 *      and `capabilities`. Recurrent Root Cause #38 lived here: saving any
 *      field re-sent every other one, so an unrelated edit could silently
 *      un-verify a store.
 *
 * WHAT: One schema per editor.
 *
 * EXPORTS:
 *   adminStoreUpdateSchema, announcementBarSchema,
 *   and their inferred value types
 *
 * @tag domain:admin
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminAddressEditorView,AdminStoreEditorView,AdminSiteView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { mediaUrlSchema } from "../../../validation/schemas";
import { StoreStatusValues, type StoreStatus } from "../../stores/schemas/firestore";

const PHONE_RE = /^(\+?91[-\s]?)?[6-9]\d{9}$/;
/*
 * `adminAddressFormSchema` is DELETED (W5 / D19).
 *
 * It was a twelfth restatement of the same eleven address fields, with an
 * India-only `postalCode: /^\d{6}$/` on a form whose `country` was free text.
 * The one address shape and the one country-aware postal rule now live in
 * `features/addresses/schemas/address-form.ts`, and this editor imports
 * `adminAddressCreateSchema` from there.
 */

/**
 * An admin changing a store's standing.
 *
 * `suspensionReason` is required when — and only when — the status is
 * `suspended`: suspending a seller without a recorded reason leaves them, and
 * the next admin, with nothing to appeal or review.
 */
export const adminStoreUpdateSchema = z
  .object({
    /*
     * 🛑 DERIVED from `StoreStatusValues`, never hand-written.
     *
     * This was `["pending","active","suspended","closed"]` — and `"closed"` is
     * not a store status. The real union (`stores/schemas/firestore.ts:57`) is
     * pending · active · suspended · **rejected**, which is what
     * `AdminStoreEditorView`'s dropdown has always offered and what the API
     * has always stored. So the schema declared a value nothing can produce and
     * omitted the one the UI actually sends.
     *
     * It went unnoticed because the `<Form schema>` prop was never parsed —
     * selecting "Rejected" reached the API unchecked. Under `<SectionForm>`,
     * which parses on every change, it would have become a hard failure on a
     * legitimate value. A fifth hand-written copy of this union is exactly how
     * that happens again.
     */
    storeStatus: annotate(
      z.enum(
        Object.values(StoreStatusValues) as [StoreStatus, ...StoreStatus[]],
      ),
      {
        section: "standing", sectionLabel: "Store standing", sectionRequired: true,
        quick: true, order: 1, row: "pair", kind: "select",
      },
    ),
    isVerified: annotate(z.boolean().optional(), {
      section: "standing", order: 2, row: "quarter",
    }),
    isFeatured: annotate(z.boolean().optional(), {
      section: "standing", order: 3, row: "quarter",
    }),
    /*
     * `when` mirrors the superRefine below, which is what stops the two from
     * disagreeing. The page used to keep this textarea live at all times and
     * then drop its value unless the status was exactly "suspended" — choose
     * "rejected", write the reason, save, and it vanished silently.
     */
    suspensionReason: annotate(z.string().trim().max(500).optional(), {
      section: "standing", order: 4, row: "full", kind: "textarea",
      when: (v) => v.storeStatus === "suspended",
    }),
    capabilities: annotate(z.array(z.string().min(1)).max(50).optional(), {
      section: "capabilities", sectionLabel: "Capabilities", order: 1, row: "full", kind: "list",
    }),
    adminNotes: annotate(z.string().trim().max(2000).optional(), {
      section: "capabilities", order: 2, row: "full", kind: "textarea",
      help: "Internal only — never shown to the store owner or the public.",
    }),
  })
  .superRefine((v, ctx) => {
    if (v.storeStatus === "suspended" && !v.suspensionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["suspensionReason"],
        message: "Record why this store is being suspended.",
      });
    }
  });

export type AdminStoreUpdateValues = z.infer<typeof adminStoreUpdateSchema>;

/**
 * The homepage announcement bar.
 *
 * 🛑 `message` is the canonical key. The main admin editor saved this copy
 * under `text` until 2026-08-24 — a key no renderer has ever read — so
 * admin-authored announcements saved successfully and never appeared. Naming
 * it here is what stops that recurring.
 */
export const announcementBarSchema = z.object({
  message: annotate(z.string().trim().max(300, "Keep the announcement under 300 characters.").optional(), {
    section: "announcement", sectionLabel: "Announcement bar", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  enabled: annotate(z.boolean().optional(), {
    section: "announcement", order: 2, row: "quarter",
  }),
  link: annotate(z.string().trim().max(300).optional(), {
    section: "announcement", order: 3, row: "full",
  }),
});

export type AnnouncementBarValues = z.infer<typeof announcementBarSchema>;

/**
 * A brand, as an admin edits it.
 *
 * Lifted out of `AdminBrandEditorView`, where it was declared locally and
 * unannotated — so it could not drive a generated form, and, more to the point,
 * it never ran: the submit handler checked `name.trim()` and called the
 * mutation. `website: z.string().url()` had therefore never rejected anything,
 * and the raw `<Input>`s it would have reported on carry no `name`, so
 * `applyZodIssues` had nowhere to put an error even if it had.
 *
 * ## "Logo" is the cover image, and the labels used to say the opposite
 *
 * `logoURL` maps to `display.coverImage` — the brand page's full-bleed hero
 * banner. The form once offered a "Logo" input beside a "Banner" input, where
 * the first drove the banner and the second wrote `brandBannerImage`, a field
 * with no reader anywhere (Root Cause #51). The dead field is gone and the
 * label now describes what it controls.
 */
export const brandFormSchema = z.object({
  name: annotate(z.string().min(1, "Brand name is required").max(120), {
    section: "basics", sectionLabel: "Brand", sectionRequired: true, quick: true,
    order: 1, row: "pair", label: "Brand name",
  }),
  /*
   * Derived from the name, and create-only.
   *
   * Slug immutability after creation is the convention every other taxonomy in
   * this codebase follows (categories, bundles — Root Cause #39), and it is
   * what keeps existing links and `brand:` product references resolving. The
   * editor used to expose it as a free-text box on the EDIT form too, which is
   * a live rename waiting to orphan a whole catalogue: `BrandDetailPageView`
   * matches products by display NAME, and nothing re-points them.
   */
  slug: annotate(z.string().regex(/^[a-z0-9-]+$/i).optional().or(z.literal("")), {
    section: "basics", order: 2, row: "pair", derived: true, tier: "t1-derive",
    help: "Generated from the brand name.",
  }),
  description: annotate(z.string().max(2000).optional().or(z.literal("")), {
    section: "basics", order: 3, row: "full", kind: "textarea",
  }),
  logoURL: annotate(mediaUrlSchema.optional().or(z.literal("")), {
    section: "media", sectionLabel: "Cover image", order: 1, row: "full",
    kind: "media", sectionKeepMounted: true, label: "Cover image",
    help: "Renders as the full-bleed banner at the top of the brand page.",
  }),
  website: annotate(z.string().url("Enter a full URL, including https://").optional().or(z.literal("")), {
    section: "identity", sectionLabel: "About this brand", order: 1, row: "pair",
    inputType: "url",
  }),
  country: annotate(z.string().max(80).optional().or(z.literal("")), {
    section: "identity", order: 2, row: "pair", label: "Country of origin",
  }),
  founded: annotate(
    z.number().int().min(1800, "That is earlier than any brand on record.").max(new Date().getFullYear(), "A founding year cannot be in the future.").optional(),
    { section: "identity", order: 3, row: "pair", kind: "number", label: "Founded year" },
  ),
  isActive: annotate(z.boolean(), {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
    label: "Active",
  }),
  displayOrder: annotate(z.number().int().min(0).optional(), {
    section: "visibility", order: 2, row: "pair", kind: "number", label: "Display order",
  }),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;
