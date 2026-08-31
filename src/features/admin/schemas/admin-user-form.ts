/*
 * WHY: Three more forms, each writing something with a blast radius.
 *
 *      `AdminUserEditorView` edits another person's account — `displayName`
 *      and `phoneNumber` are PII, encrypted at rest, and neither was checked.
 *      `isTester`/`canTestAdmin` are the flags Recurrent Root Cause #38 was
 *      about: the list endpoint dropped them, the editor defaulted them to
 *      false, and saving any unrelated field silently stripped a real
 *      tester's access.
 *
 *      `SellerWhatsAppSettingsView` writes `accessToken` — a live Meta
 *      credential — plus the WABA and catalog ids the sync runs against. A
 *      malformed id there fails at sync time, hours later, with no obvious
 *      cause.
 *
 *      `LotteryPullForm` is a buyer-facing entry: a transaction id, a payment
 *      time and an item number, all parsed with a bare `parseInt` and a `new
 *      Date(...)` that yields `Invalid Date` on anything unparseable.
 *
 * EXPORTS:
 *   adminUserUpdateSchema, whatsappSettingsSchema, lotteryPullSchema,
 *   and their inferred value types
 *
 * @tag domain:admin,whatsapp,lottery
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminUserEditorView,SellerWhatsAppSettingsView,LotteryPullForm
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { firestoreValueSchema } from "../../../schemas/firestore-value";

const PHONE_RE = /^(\+?91[-\s]?)?[6-9]\d{9}$/;

export const adminUserUpdateSchema = z.object({
  displayName: annotate(z.string().trim().min(1).max(120).optional(), {
    section: "profile", sectionLabel: "Profile", sectionRequired: true, quick: true, order: 1, row: "pair",
  }),
  phoneNumber: annotate(
    z.string().trim().regex(PHONE_RE, "Enter a 10-digit Indian mobile number.").optional().or(z.literal("")),
    { section: "profile", order: 2, row: "pair" },
  ),
  /*
   * The tester flags. Kept OPTIONAL rather than defaulted, deliberately: a
   * PATCH that omits them must leave them alone. Defaulting either to `false`
   * here would reproduce Root Cause #38 in the schema layer — the editor
   * already did exactly that from the list row.
   */
  isTester: annotate(z.boolean().optional(), {
    section: "access", sectionLabel: "Access", order: 1, row: "quarter",
  }),
  canTestAdmin: annotate(z.boolean().optional(), {
    section: "access", order: 2, row: "quarter",
  }),
  adminNotes: annotate(z.string().trim().max(2000).optional(), {
    section: "access", order: 3, row: "full", kind: "textarea",
    help: "Internal only — never shown to the user.",
  }),
  // Open: the public profile carries per-user social links and bio fields that
  // are added over time, and a closed shape would strip a newly-added one.
  publicProfile: annotate(z.record(firestoreValueSchema).optional(), {
    section: "access", order: 4, row: "full", kind: "list",
  }),
});

export type AdminUserUpdateValues = z.infer<typeof adminUserUpdateSchema>;

/**
 * A store's WhatsApp Business connection.
 *
 * `accessToken` is optional because the form shows a masked placeholder and
 * only sends the field when the seller types a NEW value — so "absent" means
 * "unchanged", not "clear it". The `.min(20)` therefore applies only to a real
 * replacement, and is there because a truncated token fails silently at sync
 * time rather than on save.
 */
export const whatsappSettingsSchema = z.object({
  catalogSyncEnabled: annotate(z.boolean(), {
    section: "sync", sectionLabel: "Catalog sync", sectionRequired: true, quick: true, order: 1, row: "quarter",
  }),
  phoneNumber: annotate(
    z.string().trim().regex(PHONE_RE, "Enter the 10-digit WhatsApp Business number.").optional().or(z.literal("")),
    { section: "connection", sectionLabel: "Connection", order: 1, row: "pair" },
  ),
  // Meta ids are numeric strings; a pasted URL or a stray space is the usual
  // mistake and produces a sync that never runs.
  wabaId: annotate(
    z.string().trim().regex(/^\d{5,32}$/, "A WABA ID is a numeric id, not a URL.").optional().or(z.literal("")),
    { section: "connection", order: 2, row: "pair" },
  ),
  catalogId: annotate(
    z.string().trim().regex(/^\d{5,32}$/, "A catalog ID is a numeric id, not a URL.").optional().or(z.literal("")),
    { section: "connection", order: 3, row: "pair" },
  ),
  accessToken: annotate(
    z.string().trim().min(20, "That access token looks truncated.").optional().or(z.literal("")),
    { section: "connection", order: 4, row: "full", help: "Leave blank to keep the current token." },
  ),
});

export type WhatsappSettingsValues = z.infer<typeof whatsappSettingsSchema>;

/**
 * The CONNECTION form's fields — credentials only.
 *
 * `catalogSyncEnabled` is deliberately absent. Its toggle lives in a different
 * card and owns its own write (`syncToggleMutation`), because the credentials
 * form used to send it unconditionally from two cards away: a seller flipped
 * the switch, saw it move, and nothing persisted it. A field in this schema is
 * a field this form's Save button owns.
 *
 * 🛑 `.omit()` rather than a second literal, so the two cannot drift — it
 * carries the SAME field instances into the new shape, which is what keeps the
 * `annotate()` WeakMap entries alive. (A wrapper such as `.superRefine()` is
 * transparent for the same reason; a field-level re-wrap is not.)
 */
export const whatsappConnectionSchema = whatsappSettingsSchema.omit({
  catalogSyncEnabled: true,
});

export type WhatsappConnectionValues = z.infer<typeof whatsappConnectionSchema>;

/**
 * A buyer's lottery entry.
 *
 * `purchasedItemNumber` was `parseInt(itemNumber, 10)` — `NaN` for anything
 * non-numeric — and `paymentTime` was `new Date(...)`, which yields
 * `Invalid Date` and then throws on `.toISOString()`. Both are coerced and
 * checked here so the failure is an inline message rather than a crash or a
 * `NaN` written to the entry.
 */
export const lotteryPullSchema = z.object({
  /*
   * Context, not input. Whether this pull belongs to an event or a product is
   * decided by the page that mounts the form, so rendering a picker for it
   * would offer the user a choice that can only be wrong. `t2-server` keeps it
   * in the parsed payload and out of the UI.
   */
  sourceType: annotate(z.enum(["event", "product"]), {
    section: "entry", sectionLabel: "Entry", sectionRequired: true, quick: true, order: 1, row: "pair",
    derived: true, tier: "t2-server",
  }),
  transactionId: annotate(
    z.string().trim().min(4, "Enter the payment reference from your app.").max(120),
    { section: "entry", quick: true, order: 2, row: "pair" },
  ),
  paymentTime: annotate(
    z.string().trim().min(1, "When did you pay?").refine((v) => !Number.isNaN(Date.parse(v)), "That isn't a valid date and time."),
    { section: "entry", quick: true, order: 3, row: "pair", kind: "date" },
  ),
  purchasedItemNumber: annotate(
    z.coerce
      .number({ invalid_type_error: "Enter the slot number you bought." })
      .int("A slot number is a whole number.")
      .min(1, "Slot numbers start at 1."),
    { section: "entry", quick: true, order: 4, row: "pair", kind: "number" },
  ),
  userPhone: annotate(
    z.string().trim().regex(PHONE_RE, "Enter a 10-digit Indian mobile number.").optional().or(z.literal("")),
    { section: "entry", order: 5, row: "pair" },
  ),
});

export type LotteryPullValues = z.infer<typeof lotteryPullSchema>;
