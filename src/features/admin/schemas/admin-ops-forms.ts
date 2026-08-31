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
import { normalizeError } from "../../../errors/normalize";
import { OrderStatusValues } from "../../orders/schemas/firestore";

/** Derived from the real 9-value union, never restated (Root Cause #36). */
const orderStatusSchema = z.enum(
  Object.values(OrderStatusValues) as [string, ...string[]],
);

export const adminOrderUpdateSchema = z.object({
  status: annotate(orderStatusSchema, {
    section: "status", sectionLabel: "Order", sectionRequired: true, quick: true,
    order: 1, row: "pair", kind: "select",
  }),
  trackingNumber: annotate(z.string().trim().max(120).optional(), {
    section: "shipping", sectionLabel: "Shipping", order: 1, row: "pair",
  }),
  carrier: annotate(z.string().trim().max(80).optional(), {
    // `kind: "select"` is explicit because the field is a free string in the
    // schema — the route accepts any carrier name — while the ADMIN form offers
    // a fixed list. Without it the inferred control is a text input and the
    // `options` passed by the view would be ignored.
    section: "shipping", order: 2, row: "pair", kind: "select",
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
    {
      section: "shipping", order: 3, row: "pair", kind: "number",
      // Only meaningful on a refunding status, which is the condition the page
      // already used to decide whether to render the input.
      when: (v) => v.status === "refunded" || v.status === "return_requested",
    },
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
 * Editing an existing team member's access.
 *
 * Derived by omission rather than declared, so the two cannot drift: it is the
 * invite form minus the one field that only makes sense while inviting. The
 * editor rendered the email input under `mode === "invite"` and parsed the
 * full schema regardless, so an edit could only ever have failed validation on
 * a control that was not on screen — which nothing noticed, because nothing
 * parsed it.
 */
export const employeePermissionsSchema = employeeInviteSchema.omit({ email: true });

export type EmployeePermissionsValues = z.infer<typeof employeePermissionsSchema>;

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
    /*
     * The creative, FLAT.
     *
     * It was one open `z.record(firestoreValueSchema)` — "the shape varies by
     * provider, so it stays open" — which is true of the STORED shape and was
     * the wrong conclusion for the FORM. Open meant the seven inputs the
     * editor renders were validated by nothing, and the two provider-specific
     * ones were filtered out of the payload by a hand-written ternary instead
     * of by the predicate that hides them. The nested shape is reassembled at
     * the payload boundary, where the API wants it.
     */
    creativeTitle: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
      section: "creative", sectionLabel: "Creative", order: 1, row: "pair",
      label: "Creative title",
    }),
    creativeBody: annotate(z.string().trim().max(500).optional().or(z.literal("")), {
      section: "creative", order: 2, row: "pair", label: "Creative body",
    }),
    creativeImageUrl: annotate(z.string().trim().max(2000).optional().or(z.literal("")), {
      section: "creative", order: 3, row: "pair", label: "Image URL", inputType: "url",
    }),
    ctaLabel: annotate(z.string().trim().max(80).optional().or(z.literal("")), {
      section: "creative", order: 4, row: "pair", label: "CTA label",
    }),
    ctaHref: annotate(z.string().trim().max(2000).optional().or(z.literal("")), {
      section: "creative", order: 5, row: "pair", label: "CTA URL",
    }),
    adsenseSlot: annotate(z.string().trim().max(120).optional().or(z.literal("")), {
      section: "creative", order: 6, row: "pair", label: "AdSense slot",
      when: (v) => v.provider === "adsense",
    }),
    thirdPartyUrl: annotate(z.string().trim().max(2000).optional().or(z.literal("")), {
      section: "creative", order: 7, row: "pair", label: "Third-party URL",
      when: (v) => v.provider === "thirdParty",
    }),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    // A scheduled ad with no start date never runs, and nothing would say so.
    if (v.status === "scheduled" && !v.startAt) {
      issue("startAt", "A scheduled ad needs a start date.");
    }
    if (v.startAt && v.endAt && v.endAt <= v.startAt) {
      issue("endAt", "The end date must be after the start date.");
    }

    /*
     * The three provider rules, moved off the page's `publishIssues` list.
     *
     * There they were strings in a warning banner that only appeared once the
     * status was already `active` or `scheduled` — so a DRAFT AdSense ad could
     * be saved with no slot, and the omission surfaced later, as a block on
     * publishing, far from the empty field. Stated here they reach the field
     * that is wrong, whatever the status.
     *
     * The rest of that list stays on the page: it depends on the live
     * placements and on whether the provider's credentials are configured,
     * neither of which a schema can see.
     */
    if (v.provider === "manual") {
      const hasCreative =
        v.creativeTitle?.trim() ||
        v.creativeBody?.trim() ||
        v.creativeImageUrl?.trim() ||
        v.ctaHref?.trim();
      if (!hasCreative) {
        issue(
          "creativeTitle",
          "A manual ad needs at least one of: title, body, image or CTA URL.",
        );
      }
    }
    if (v.provider === "adsense" && !v.adsenseSlot?.trim()) {
      issue("adsenseSlot", "An AdSense ad needs a slot id.");
    }
    if (v.provider === "thirdParty") {
      const url = v.thirdPartyUrl?.trim();
      if (!url) {
        issue("thirdPartyUrl", "A third-party ad needs a URL.");
      } else {
        let parsed: URL | null = null;
        try {
          parsed = new URL(url);
        } catch (err) {
          void normalizeError(err);
          parsed = null;
        }
        if (!parsed) issue("thirdPartyUrl", "That is not a valid URL.");
        else if (parsed.protocol !== "https:") {
          issue("thirdPartyUrl", "A third-party ad URL must use https.");
        }
      }
    }
  });

export type AdminAdFormValues = z.infer<typeof adminAdFormSchema>;

/**
 * Ad SETTINGS — the provider credentials and the global consent switch.
 *
 * Distinct from `adminAdFormSchema`, which is one ad record. This is the
 * platform-level configuration every ad renders under, and it was validated by
 * a hand-written `localCredentialIssues` array that computed the same two rules
 * on every keystroke and rendered them as a banner headed "Fix settings before
 * saving" — never on the field that was wrong.
 *
 * Both credentials are optional and BLANK MEANS UNCHANGED: the route stores
 * them encrypted and returns only a masked form, so the input starts empty on
 * every load and an empty submit must leave the stored value alone. That is why
 * neither field has a `.min()` — an empty string here is not an omission.
 */
export const adsConfigSchema = z.object({
  consentRequired: annotate(z.boolean(), {
    section: "consent", sectionLabel: "Consent", sectionRequired: true,
    quick: true, order: 1, row: "full",
    label: "Require consent globally for ad rendering",
  }),
  adsenseClientId: annotate(
    z
      .string()
      .trim()
      .regex(/^ca-pub-[0-9]{10,20}$/, "An AdSense client id looks like ca-pub-XXXXXXXXXX.")
      .optional()
      .or(z.literal("")),
    {
      section: "credentials", sectionLabel: "Provider credentials",
      order: 1, row: "pair", label: "AdSense client id",
      help: "Leave blank to keep the stored value.",
    },
  ),
  thirdPartyScriptUrl: annotate(
    z.string().trim().max(2000).optional().or(z.literal("")),
    {
      section: "credentials", order: 2, row: "pair",
      label: "Third-party script URL", inputType: "url",
      help: "Must be https. Leave blank to keep the stored value.",
    },
  ),
})
  .superRefine((v, ctx) => {
    const url = v.thirdPartyScriptUrl?.trim();
    if (!url) return;
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch (err) {
      void normalizeError(err);
      parsed = null;
    }
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["thirdPartyScriptUrl"],
        message: "That is not a valid URL.",
      });
    } else if (parsed.protocol !== "https:") {
      // A third-party ad script runs in the page's own origin; http would let
      // any network hop rewrite it.
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["thirdPartyScriptUrl"],
        message: "A third-party script URL must use https.",
      });
    }
  });

export type AdsConfigValues = z.infer<typeof adsConfigSchema>;

/**
 * The support-ticket triage form — what an admin CHANGES about a ticket, as
 * distinct from what they SAY on it (the reply box, which is its own write to
 * a different endpoint and carries the ticket's new status with it).
 *
 * The five linked-party ids are FLAT here and reassembled into
 * `relatedParties` at the payload boundary, the same call the ad creative and
 * the user's public profile make: the stored shape is one nested object, and
 * the form has always offered five discrete inputs.
 */
export const supportTicketUpdateSchema = z.object({
  status: annotate(
    z.enum(["open", "in_progress", "waiting_on_user", "resolved", "closed"]),
    {
      section: "triage", sectionLabel: "Triage", sectionRequired: true,
      quick: true, order: 1, row: "pair", kind: "select",
    },
  ),
  priority: annotate(z.enum(["low", "normal", "high", "urgent"]), {
    section: "triage", quick: true, order: 2, row: "pair", kind: "select",
  }),
  internalNotes: annotate(z.string().trim().max(4000).optional().or(z.literal("")), {
    section: "triage", order: 3, row: "full", kind: "textarea",
    label: "Internal notes (staff only)",
    help: "Visible only to admins and employees.",
  }),
  userId: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "parties", sectionLabel: "Linked parties", order: 1, row: "pair",
    label: "User slug",
    help: "Tag the buyer, store, order, product or bid this ticket concerns.",
  }),
  storeId: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "parties", order: 2, row: "pair", label: "Store slug",
  }),
  orderId: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "parties", order: 3, row: "pair", label: "Order ID",
  }),
  productId: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "parties", order: 4, row: "pair", label: "Product slug",
  }),
  bidId: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
    section: "parties", order: 5, row: "pair", label: "Bid ID",
  }),
});

export type SupportTicketUpdateValues = z.infer<typeof supportTicketUpdateSchema>;

/**
 * The five flat id fields, back into the nested `relatedParties` the ticket
 * stores. Blank fields are dropped, and an entirely empty set returns
 * `undefined` so the key is omitted rather than written as `{}`.
 */
export function toRelatedPartiesPayload(
  v: SupportTicketUpdateValues,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const key of ["userId", "storeId", "orderId", "productId", "bidId"] as const) {
    const value = v[key]?.trim();
    if (value) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
