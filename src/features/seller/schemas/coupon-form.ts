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
export const sellerCouponFormSchema = z
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
  })
  .superRefine((v, ctx) => {
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
  });

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
