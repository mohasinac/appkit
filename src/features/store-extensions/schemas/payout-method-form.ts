/*
 * WHY: A seller's payout method is where their money goes, and it was
 *      validated at ZERO layers. Measured 2026-08-24:
 *        · `store/payout-methods/new` — `accountNumber` and `ifscCode` are
 *          bare <Input>s with no `required` and no pattern; `onSave` has no
 *          validation at all and posts `form as Record<string, unknown>`.
 *          Both default to `""`, so an empty bank payout method saved cleanly.
 *        · `.../[id]/edit` — `onSave` has no validation either, and does not
 *          even render the account-number/IFSC inputs.
 *        · `POST /api/store/payout-methods` — `parseJsonBody` then `...body`
 *          spread into `.create()`. No Zod.
 *        · `PATCH .../[id]` — the raw body passed straight to `.update()`.
 *          No Zod, no field filtering.
 *      A payout method with a blank account number is not a validation nicety;
 *      it is a payout that cannot be made, discovered at payout time.
 * WHAT: One schema for the pages AND the routes.
 *
 * ## The rules are per TYPE, which is why this needs a superRefine
 *
 * A UPI method needs a VPA and no bank fields; a bank method needs an account
 * number, an IFSC and a holder name and no VPA. Per-field `.min(1)` cannot
 * express that — it would make every field mandatory for every type.
 *
 * The IFSC and UPI patterns are the ones already used by
 * `SellerPayoutSettingsView` (`^[A-Z]{4}0[A-Z0-9]{6}$` and the VPA shape), not
 * a second pair invented here — two regexes for one format is how they come to
 * disagree about what a valid IFSC is.
 *
 * EXPORTS:
 *   payoutMethodFormSchema, payoutMethodCreateSchema,
 *   payoutMethodUpdateSchema, type PayoutMethodFormValues
 *
 * @tag domain:store-extensions
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:store/payout-methods pages,/api/store/payout-methods
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/** Same pattern `SellerPayoutSettingsView` enforces. */
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** Same pattern `SellerPayoutSettingsView` enforces. */
const UPI_VPA_RE = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const payoutMethodFormSchema = z
  .object({
    type: annotate(z.enum(["upi", "bank", "card", "other"]), {
      section: "method", sectionLabel: "Payout Method", sectionRequired: true,
      quick: true, order: 1, row: "pair",
    }),
    label: annotate(z.string().min(1, "Give this method a name you'll recognise.").max(80), {
      section: "method", quick: true, order: 2, row: "pair",
    }),

    upiVpa: annotate(z.string().max(256).optional(), {
      section: "method", order: 3, row: "full",
      help: "For UPI methods, e.g. name@bank.",
    }),

    accountHolderName: annotate(z.string().max(120).optional(), {
      section: "bank", sectionLabel: "Bank Account", order: 1, row: "full",
    }),
    accountNumber: annotate(z.string().max(34).optional(), {
      section: "bank", order: 2, row: "pair",
    }),
    ifscCode: annotate(z.string().max(11).optional(), {
      section: "bank", order: 3, row: "pair",
    }),
    bankName: annotate(z.string().max(120).optional(), {
      section: "bank", order: 4, row: "pair",
    }),

    isDefault: annotate(z.boolean(), {
      section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
    }),
    isActive: annotate(z.boolean(), {
      section: "visibility", order: 2, row: "quarter",
    }),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    /**
     * "Required, and if present the right shape" — the same two-part check
     * every one of these fields needs. One helper rather than a required
     * branch plus a format branch per field, which is what turned this into
     * an unreadable if/else chain.
     */
    const require = (
      path: string,
      raw: string | undefined,
      missing: string,
      format?: { re: RegExp; message: string; normalise?: (s: string) => string },
    ) => {
      const value = raw?.trim() ?? "";
      if (!value) return issue(path, missing);
      if (!format) return;
      const candidate = format.normalise ? format.normalise(value) : value;
      if (!format.re.test(candidate)) issue(path, format.message);
    };

    // Per-type rules by lookup, not by branching. A new payout type adds an
    // entry here rather than another arm of a chain.
    const RULES: Record<string, () => void> = {
      upi: () =>
        require("upiVpa", v.upiVpa, "A UPI ID is required for a UPI payout method.", {
          re: UPI_VPA_RE,
          message: "Please enter a valid UPI ID, e.g. name@bank.",
        }),
      // These four are what make a payout actually possible. Every one of them
      // could previously be left blank and saved.
      bank: () => {
        require("accountHolderName", v.accountHolderName, "The account holder's name is required.");
        require("accountNumber", v.accountNumber, "An account number is required.", {
          re: /^\d{6,18}$/,
          message: "An account number is 6–18 digits.",
        });
        require("ifscCode", v.ifscCode, "An IFSC code is required.", {
          re: IFSC_RE,
          message: "Please enter a valid IFSC code, e.g. HDFC0001234.",
          normalise: (x) => x.toUpperCase(),
        });
        require("bankName", v.bankName, "The bank name is required.");
      },
      // `card` and `other` carry no extra requirements today — the label is
      // enough to identify them, and inventing rules for them would reject
      // methods sellers can legitimately record.
    };

    RULES[v.type]?.();
  });

export type PayoutMethodFormValues = z.infer<typeof payoutMethodFormSchema>;

/**
 * Create contract. `sellerId`/`storeId` are absent on purpose — the route sets
 * both from the session, so a caller cannot file a payout method against
 * another seller by adding fields to the body.
 */
export const payoutMethodCreateSchema = payoutMethodFormSchema;

/**
 * Update contract.
 *
 * The per-type rules deliberately do NOT apply here: a PATCH may carry a
 * single field (`isDefault`, say) and requiring the whole bank block on every
 * partial update would make toggling the default impossible. The bounds still
 * apply to whatever IS sent, and the create path is where completeness is
 * enforced.
 */
export const payoutMethodUpdateSchema = z
  .object({
    type: z.enum(["upi", "bank", "card", "other"]).optional(),
    label: z.string().min(1).max(80).optional(),
    upiVpa: z.string().max(256).regex(UPI_VPA_RE, "Please enter a valid UPI ID.").optional(),
    accountHolderName: z.string().max(120).optional(),
    accountNumber: z.string().regex(/^\d{6,18}$/, "An account number is 6–18 digits.").optional(),
    ifscCode: z.string().regex(IFSC_RE, "Please enter a valid IFSC code.").optional(),
    bankName: z.string().max(120).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
