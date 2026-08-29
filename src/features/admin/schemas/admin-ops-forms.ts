/*
 * WHY: Four more admin editors rendered `<Form>` with no schema. Each writes
 *      something an admin cannot easily undo.
 *
 *      `AdminOrderEditorView` is the one that touches money: `refundAmount`
 *      was parsed with a bare `parseFloat` and guarded only by
 *      `!isNaN(amount) && amount > 0`, with no upper bound and no check
 *      against the order — so a mistyped figure went straight through as a
 *      refund instruction.
 *
 *      `AdminEmployeeEditorView` grants permissions, and `AdminUsersView`'s
 *      hard-ban takes a reason that is the entire record of why an account
 *      was destroyed.
 *
 * WHAT: One schema per editor.
 *
 * EXPORTS:
 *   adminOrderUpdateSchema, employeeInviteSchema, hardBanReasonSchema,
 *   featureFlagsUpdateSchema, adminAdFormSchema, and their value types
 *
 * @tag domain:admin
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminOrderEditorView,AdminEmployeeEditorView,AdminUsersView,AdminAdEditorView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { firestoreValueSchema } from "../../../schemas/firestore-value";
import { OrderStatusValues } from "../../orders/schemas/firestore";

/** Derived from the real 9-value union, never restated (Root Cause #36). */
const orderStatusSchema = z.enum(
  Object.values(OrderStatusValues) as [string, ...string[]],
);

export const adminOrderUpdateSchema = z.object({
  status: annotate(orderStatusSchema, {
    section: "status", sectionLabel: "Order", sectionRequired: true, quick: true, order: 1, row: "pair",
  }),
  trackingNumber: annotate(z.string().trim().max(120).optional(), {
    section: "shipping", sectionLabel: "Shipping", order: 1, row: "pair",
  }),
  carrier: annotate(z.string().trim().max(80).optional(), {
    section: "shipping", order: 2, row: "pair",
  }),
  /*
   * 🛑 Bounded. This was `parseFloat` + `> 0` with no ceiling, so a slipped
   * decimal point issued a refund an order of magnitude too large. The cap is
   * a sanity bound, not a business rule — the route still checks the amount
   * against the order itself.
   */
  refundAmount: annotate(
    z.coerce
      .number({ invalid_type_error: "Enter the refund amount as a number." })
      .positive("A refund must be greater than zero.")
      .max(10_000_000, "That looks like a typo — check the decimal point.")
      .optional(),
    { section: "shipping", order: 3, row: "pair", kind: "number" },
  ),
  notes: annotate(z.string().trim().max(2000).optional(), {
    section: "shipping", order: 4, row: "full", kind: "textarea",
  }),
});

export type AdminOrderUpdateValues = z.infer<typeof adminOrderUpdateSchema>;

/** Inviting a team member — an email plus the permissions it grants. */
export const employeeInviteSchema = z.object({
  email: annotate(
    z.string().trim().toLowerCase().min(1, "An email address is required.").email("That doesn't look like an email address."),
    { section: "member", sectionLabel: "Team member", sectionRequired: true, quick: true, order: 1, row: "pair" },
  ),
  permissionGroup: annotate(z.string().trim().min(1, "Choose a permission group."), {
    section: "member", quick: true, order: 2, row: "pair",
  }),
  permissions: annotate(z.array(z.string().min(1)).max(200).optional(), {
    section: "member", order: 3, row: "full", kind: "list",
  }),
});

export type EmployeeInviteValues = z.infer<typeof employeeInviteSchema>;

/**
 * The reason recorded against a hard ban.
 *
 * A hard ban runs an eight-stage destructive cascade; this string is the only
 * durable record of why. A 10-character floor, matching the admin offer-cancel
 * reason, because "spam" is not an audit trail.
 */
export const hardBanReasonSchema = z.object({
  reason: annotate(
    z.string().trim().min(10, "Record why this account is being banned — at least 10 characters.").max(500),
    { section: "ban", sectionLabel: "Reason", sectionRequired: true, quick: true, order: 1, row: "full", kind: "textarea" },
  ),
});

export type HardBanReasonValues = z.infer<typeof hardBanReasonSchema>;

/**
 * Feature flags.
 *
 * Deliberately open records: flags are added and removed constantly, and a
 * closed schema here would silently STRIP a newly-added flag on the next save
 * — the `productBaseSchema` failure applied to configuration. The values are
 * still constrained, which is what stops a flag being set to an object.
 */
export const featureFlagsUpdateSchema = z.object({
  flags: annotate(z.record(z.string(), z.boolean()), {
    section: "flags", sectionLabel: "Feature flags", sectionRequired: true, order: 1, row: "full", kind: "list",
  }),
  rollouts: annotate(z.record(z.string(), z.coerce.number().min(0).max(100)).optional(), {
    section: "flags", order: 2, row: "full", kind: "list",
    help: "Percentage rollout per flag, 0–100.",
  }),
});

export type FeatureFlagsUpdateValues = z.infer<typeof featureFlagsUpdateSchema>;

/** An ad placement. `priority` orders competing ads in the same slot. */
export const adminAdFormSchema = z
  .object({
    name: annotate(z.string().trim().min(2, "Give the ad a name.").max(120), {
      section: "basics", sectionLabel: "Ad", sectionRequired: true, quick: true, order: 1, row: "pair",
    }),
    provider: annotate(z.enum(["manual", "adsense", "thirdParty"]), {
      section: "basics", quick: true, order: 2, row: "pair",
    }),
    status: annotate(z.enum(["draft", "active", "scheduled", "paused"]), {
      section: "basics", quick: true, order: 3, row: "pair",
    }),
    priority: annotate(z.coerce.number().int().min(0).max(1000), {
      section: "basics", order: 4, row: "pair", kind: "number",
    }),
    placementIds: annotate(z.array(z.string().min(1)).min(1, "Choose at least one placement."), {
      section: "placement", sectionLabel: "Placement", sectionRequired: true, order: 1, row: "full", kind: "list",
    }),
    requiresConsent: annotate(z.boolean(), {
      section: "placement", order: 2, row: "quarter",
    }),
    startAt: annotate(z.string().optional(), {
      section: "schedule", sectionLabel: "Schedule", order: 1, row: "pair", kind: "date",
    }),
    endAt: annotate(z.string().optional(), {
      section: "schedule", order: 2, row: "pair", kind: "date",
    }),
    // Creative shape varies by provider, so it stays open — an AdSense slot and
    // a manual banner share almost no fields. Open to a Firestore VALUE tree,
    // not to anything: `z.unknown()` would pass a function straight to the
    // driver, which then throws at write time rather than at parse time.
    creative: annotate(z.record(firestoreValueSchema).optional(), {
      section: "creative", sectionLabel: "Creative", order: 1, row: "full", kind: "list",
    }),
  })
  .superRefine((v, ctx) => {
    // A scheduled ad with no start date never runs, and nothing would say so.
    if (v.status === "scheduled" && !v.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAt"],
        message: "A scheduled ad needs a start date.",
      });
    }
    if (v.startAt && v.endAt && v.endAt <= v.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "The end date must be after the start date.",
      });
    }
  });

export type AdminAdFormValues = z.infer<typeof adminAdFormSchema>;
