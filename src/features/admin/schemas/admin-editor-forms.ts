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
 *   adminAddressFormSchema, adminStoreUpdateSchema, announcementBarSchema,
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

const PHONE_RE = /^(\+?91[-\s]?)?[6-9]\d{9}$/;
/** Indian PIN: six digits, never starting at zero. */
const PIN_RE = /^[1-9]\d{5}$/;

/**
 * An address written by an admin on someone's behalf.
 *
 * Shapes match `AddressDocument` (`addressLine1`, not `line1`) — deliberately
 * NOT `userAddressSchema`, which is the account-side view of the same data
 * under different field names. Reusing that one here would have meant
 * translating on every write.
 */
export const adminAddressFormSchema = z.object({
  ownerType: annotate(z.enum(["user", "store"]), {
    section: "owner", sectionLabel: "Belongs to", sectionRequired: true, quick: true, order: 1, row: "pair",
  }),
  ownerId: annotate(z.string().trim().min(1, "Choose who this address belongs to."), {
    section: "owner", quick: true, order: 2, row: "pair",
  }),

  label: annotate(z.string().trim().max(60, "Keep the label short — e.g. Home, Warehouse.").optional(), {
    section: "address", sectionLabel: "Address", order: 1, row: "pair",
  }),
  fullName: annotate(z.string().trim().min(2, "A recipient name is required.").max(120), {
    section: "address", sectionRequired: true, quick: true, order: 2, row: "pair",
  }),
  phone: annotate(z.string().trim().regex(PHONE_RE, "Enter a 10-digit Indian mobile number."), {
    section: "address", quick: true, order: 3, row: "pair",
  }),
  addressLine1: annotate(z.string().trim().min(3, "Street address is required.").max(200), {
    section: "address", quick: true, order: 4, row: "full",
  }),
  addressLine2: annotate(z.string().trim().max(200).optional(), {
    section: "address", order: 5, row: "full",
  }),
  landmark: annotate(z.string().trim().max(120).optional(), {
    section: "address", order: 6, row: "pair",
  }),
  city: annotate(z.string().trim().min(2, "City is required.").max(80), {
    section: "address", order: 7, row: "pair",
  }),
  state: annotate(z.string().trim().min(2, "State is required.").max(80), {
    section: "address", order: 8, row: "pair",
  }),
  // A wrong PIN is the single most common reason a parcel is undeliverable,
  // and it was previously any string at all.
  postalCode: annotate(z.string().trim().regex(PIN_RE, "Enter a 6-digit PIN code."), {
    section: "address", order: 9, row: "pair",
  }),
  country: annotate(z.string().trim().min(2).max(60), {
    section: "address", order: 10, row: "pair",
  }),
  isDefault: annotate(z.boolean().optional(), {
    section: "address", order: 11, row: "quarter",
  }),
});

export type AdminAddressFormValues = z.infer<typeof adminAddressFormSchema>;

/**
 * An admin changing a store's standing.
 *
 * `suspensionReason` is required when — and only when — the status is
 * `suspended`: suspending a seller without a recorded reason leaves them, and
 * the next admin, with nothing to appeal or review.
 */
export const adminStoreUpdateSchema = z
  .object({
    storeStatus: annotate(z.enum(["pending", "active", "suspended", "closed"]), {
      section: "standing", sectionLabel: "Store standing", sectionRequired: true, quick: true, order: 1, row: "pair",
    }),
    isVerified: annotate(z.boolean().optional(), {
      section: "standing", order: 2, row: "quarter",
    }),
    isFeatured: annotate(z.boolean().optional(), {
      section: "standing", order: 3, row: "quarter",
    }),
    suspensionReason: annotate(z.string().trim().max(500).optional(), {
      section: "standing", order: 4, row: "full", kind: "textarea",
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
