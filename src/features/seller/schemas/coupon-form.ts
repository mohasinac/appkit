/*
 * WHY: `SellerCouponEditorView` rendered `<Form onSubmit noValidate>` with no
 *      schema at all, while `AdminCouponEditorView` — the same entity, one
 *      portal over — has a Zod schema wired through `<Form schema>`. The
 *      seller side relied on four hand-rolled `if` checks that covered
 *      presence and date order and nothing else, so a coupon could be saved
 *      with a **500% discount**, a non-numeric value, a negative minimum spend
 *      or a per-user limit above the total limit. Every failure surfaced in a
 *      single banner rather than on the field that caused it.
 * WHAT: The seller coupon form's schema.
 *
 * ## Everything is a string, on purpose
 *
 * `CouponEditorDraft` holds every numeric field as a string because they come
 * from `<input>`s. Coercing inside the schema keeps that boundary in one place
 * — the alternative is a `Number()` at each call site, which is how a `NaN`
 * reaches Firestore the first time one is forgotten.
 *
 * ## Why the rules are conditional
 *
 * `free_shipping` has no discount value, `percentage` is bounded 1–100, and
 * `fixed` is any positive amount. A flat per-field rule cannot say that, so
 * the cross-field rules live in one `superRefine` keyed by type.
 *
 * EXPORTS:
 *   sellerCouponFormSchema, type SellerCouponFormValues
 *
 * @tag domain:seller,promotions
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:SellerCouponEditorView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/** A blank optional numeric string — the form's "not set". */
const numericString = (label: string) =>
  z
    .string()
    .refine((v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: `${label} must be a number of zero or more.`,
    });

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
/**
 * The fields both coupon editors share, before either adds its own rules.
 *
 * Split out of `sellerCouponFormSchema` so the ADMIN editor can extend it.
 * It could not before: that schema ends in `.superRefine`, which returns a
 * ZodEffects with no `.extend()` — which is a large part of why the admin
 * editor ended up declaring its own five-field `.passthrough()` stub locally
 * and validating nothing at all.
 */
export const couponFormBase = z
  .object({
    code: annotate(
      z
        .string()
        .min(2, "A coupon code needs at least 2 characters.")
        .max(40, "Keep the code under 40 characters.")
        .regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, hyphens and underscores only."),
      {
        section: "basics", sectionLabel: "Coupon", sectionRequired: true,
        quick: true, order: 1, row: "pair",
      },
    ),
    type: annotate(z.enum(["percentage", "fixed", "free_shipping"]), {
      section: "basics", quick: true, order: 2, row: "pair",
    }),
    /*
     * `when` carries what the editor held as JSX conditionals, so a field the
     * form hides is one the payload cannot carry — see `couponDraftToPayload`.
     */
    value: annotate(numericString("The discount value"), {
      section: "basics", quick: true, order: 3, row: "pair",
      when: (v) => v.type !== "free_shipping",
    }),

    minPurchase: annotate(numericString("Minimum purchase"), {
      section: "limits", sectionLabel: "Limits", order: 1, row: "pair",
    }),
    /*
     * A percentage cap is meaningless on a fixed or free-shipping coupon. The
     * input was already hidden for those, and the value was SENT anyway — so a
     * cap typed while the type was "percentage" persisted after switching to
     * free shipping, invisibly.
     */
    maxDiscount: annotate(numericString("Maximum discount"), {
      section: "limits", order: 2, row: "pair",
      when: (v) => v.type === "percentage",
    }),
    totalLimit: annotate(numericString("Total uses"), {
      section: "limits", order: 3, row: "pair",
    }),
    perUserLimit: annotate(numericString("Uses per customer"), {
      section: "limits", order: 4, row: "pair",
    }),

    startDate: annotate(z.string().min(1, "A start date is required."), {
      section: "validity", sectionLabel: "Validity", quick: true, order: 1, row: "pair", kind: "date",
    }),
    endDate: annotate(z.string().min(1, "An end date is required."), {
      section: "validity", quick: true, order: 2, row: "pair", kind: "date",
    }),
    isActive: annotate(z.boolean(), {
      section: "validity", order: 3, row: "quarter",
    }),

    applicableProducts: annotate(z.array(z.string()), {
      section: "scope", sectionLabel: "Applies to", order: 1, row: "full", kind: "list",
    }),
    applicableCategories: annotate(z.array(z.string()), {
      section: "scope", order: 2, row: "full", kind: "list",
    }),
  });

/**
 * The cross-field rules both editors need. Shared for the same reason the
 * fields are: a percentage over 100 is the store paying the customer whichever
 * portal typed it.
 */
export function refineCouponCommon(
  v: {
    type: string;
    value: string;
    startDate: string;
    endDate: string;
    totalLimit: string;
    perUserLimit: string;
  },
  ctx: z.RefinementCtx,
): void {
  {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    // A discount value is required for everything except free shipping, and
    // a percentage above 100 is not a discount — it is the store paying the
    // customer. Nothing bounded this before.
    if (v.type !== "free_shipping") {
      const amount = Number(v.value);
      if (v.value.trim() === "") issue("value", "A discount value is required.");
      else if (amount <= 0) issue("value", "The discount must be greater than zero.");
      else if (v.type === "percentage" && amount > 100) {
        issue("value", "A percentage discount cannot exceed 100%.");
      }
    }

    if (v.startDate && v.endDate && v.startDate > v.endDate) {
      issue("endDate", "The end date must be after the start date.");
    }

    // A per-customer limit above the total makes the total unreachable — the
    // coupon reads as more generous than it can ever be.
    const total = Number(v.totalLimit);
    const perUser = Number(v.perUserLimit);
    if (v.totalLimit.trim() && v.perUserLimit.trim() && perUser > total) {
      issue("perUserLimit", "Uses per customer cannot exceed the total uses.");
    }
  }
}

export const sellerCouponFormSchema = couponFormBase.superRefine(refineCouponCommon);

export type SellerCouponFormValues = z.infer<typeof sellerCouponFormSchema>;

/**
 * What `POST /api/store/coupons` accepts.
 *
 * The index signature is what lets it pass as a JSON body without a cast at the
 * callsite — the named fields still constrain what may be set.
 */
export interface SellerCouponPayload {
  [key: string]: string | number | boolean | string[] | undefined;
  code: string;
  type: SellerCouponFormValues["type"];
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  totalLimit: number;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

/**
 * The draft, as the route wants it.
 *
 * 🛑 One implementation because the conditions have to match the form's, and a
 * per-callsite conversion is how they stopped matching: the create client
 * correctly zeroed `value` for a free-shipping coupon and then sent
 * `maxDiscount` for EVERY type — so a cap typed while the type was
 * "percentage" survived a switch to fixed or free-shipping, invisibly, because
 * the input that would have shown it was no longer rendered.
 *
 * The rule is now stated once, here, next to the `when` predicates it mirrors:
 * a field the form hides is a field the payload omits.
 */
export function couponDraftToPayload(draft: SellerCouponFormValues): SellerCouponPayload {
  const isPercentage = draft.type === "percentage";
  const hasValue = draft.type !== "free_shipping";
  return {
    code: draft.code,
    type: draft.type,
    value: hasValue ? Number(draft.value) || 0 : 0,
    minPurchase: draft.minPurchase ? Number(draft.minPurchase) : undefined,
    maxDiscount: isPercentage && draft.maxDiscount ? Number(draft.maxDiscount) : undefined,
    totalLimit: Number(draft.totalLimit) || 0,
    perUserLimit: Number(draft.perUserLimit) || 0,
    startDate: draft.startDate,
    endDate: draft.endDate,
    isActive: draft.isActive,
    ...(draft.applicableProducts?.length ? { applicableProducts: draft.applicableProducts } : {}),
    ...(draft.applicableCategories?.length
      ? { applicableCategories: draft.applicableCategories }
      : {}),
  };
}

/**
 * A coupon as an ADMIN edits it — the seller's fields plus the ones only the
 * platform can set.
 *
 * `AdminCouponEditorView` declared its own schema locally: five fields, two of
 * them `.passthrough()`, against nineteen rendered controls. It was passed to
 * `<Form schema>` and never parsed, so none of the seventeen unlisted controls
 * was checked by anything — `value` could be 500%, `endDate` could precede
 * `startDate`, and `buyQuantity` could be zero.
 *
 * Extending the shared base rather than restating it is what keeps the two
 * portals' rules from drifting; that they had already drifted is Root Cause
 * #59's shape on the validation axis.
 */
export const adminCouponFormSchema = couponFormBase
  .extend({
    /*
     * Widened past the seller's three. Only the platform runs buy-x-get-y —
     * a seller offering one would be spending another seller's stock.
     */
    type: annotate(z.enum(["percentage", "fixed", "free_shipping", "buy_x_get_y"]), {
      section: "basics", quick: true, order: 2, row: "pair", label: "Coupon type",
    }),
    name: annotate(z.string().min(1, "Give the campaign a name.").max(120), {
      section: "basics", quick: true, order: 4, row: "pair", label: "Campaign name",
    }),
    description: annotate(z.string().max(500).optional().or(z.literal("")), {
      section: "basics", order: 5, row: "full", kind: "textarea",
    }),

    buyQuantity: annotate(numericString("Buy quantity"), {
      section: "basics", order: 6, row: "pair", kind: "number",
      when: (v) => v.type === "buy_x_get_y",
    }),
    getQuantity: annotate(numericString("Get quantity"), {
      section: "basics", order: 7, row: "pair", kind: "number",
      when: (v) => v.type === "buy_x_get_y",
    }),

    /*
     * Written by orders, never by this form. `t3-mirror` renders it read-only
     * instead of as a box an admin could set to whatever they liked — which is
     * what "Current usage" was, `disabled` by an attribute a programmatic
     * submit ignores.
     */
    currentUsage: annotate(z.number().int().min(0).optional(), {
      section: "limits", order: 5, row: "pair", derived: true, tier: "t3-mirror",
      label: "Current usage", help: "Updated by orders.",
    }),

    firstTimeUserOnly: annotate(z.boolean(), {
      section: "scope", order: 3, row: "quarter", label: "First-time users only",
    }),
    appliesToAuctions: annotate(z.boolean(), {
      section: "scope", order: 4, row: "quarter", label: "Applies to auctions",
    }),
  })
  .superRefine((v, ctx) => {
    refineCouponCommon(v, ctx);

    // A buy-x-get-y with a zero on either side is not an offer.
    if (v.type === "buy_x_get_y") {
      for (const key of ["buyQuantity", "getQuantity"] as const) {
        const n = Number(v[key]);
        if (v[key].trim() === "" || !Number.isFinite(n) || n < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: "Enter a whole number of one or more.",
          });
        }
      }
    }
  });

export type AdminCouponFormValues = z.infer<typeof adminCouponFormSchema>;
