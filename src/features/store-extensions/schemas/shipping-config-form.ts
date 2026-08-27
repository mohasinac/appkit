/*
 * WHY: `POST /api/store/shipping-configs` spread the raw request body into
 *      `.create()` and the PATCH handed it straight to `.update()` — no Zod on
 *      either, and neither page validated anything. A shipping rule is money:
 *      a `flatRate` of `"abc"`, a negative `freeAbove`, or an invented key are
 *      all things that were persisted verbatim.
 * WHAT: One schema for the pages AND the routes.
 *
 * ## The numeric fields are `.coerce` on purpose
 *
 * The pages hold them as strings from `<input type="number">`. Coercing here
 * rather than at each call site means every consumer gets a real number and
 * no page has to remember a `Number()` cast — the kind of per-callsite
 * conversion that produces a `NaN` in Firestore the first time someone forgets.
 *
 * EXPORTS:
 *   shippingConfigFormSchema, shippingConfigCreateSchema,
 *   shippingConfigUpdateSchema, type ShippingConfigFormValues
 *
 * @tag domain:store-extensions
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:store/shipping-configs pages,/api/store/shipping-configs
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { ShippingMethod } from "./firestore";

/*
 * Method labels, keyed on the real union.
 *
 * This was a hand-written `z.enum([...])` with a comment saying it "mirrors
 * ShippingMethod" — the shape that always eventually stops mirroring. Keyed
 * `Record<ShippingMethod, string>`, a value added to the union is now a
 * compile error here, and the enum and the dropdown options both derive from
 * this one map rather than from two separate literals (the edit page carried
 * its own copy of the six options inline).
 */
const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  free: "Free",
  flat: "Flat rate",
  weight: "By weight",
  express: "Express",
  pickup: "Pickup",
  custom: "Custom",
};

const SHIPPING_METHODS = Object.keys(SHIPPING_METHOD_LABEL) as [ShippingMethod, ...ShippingMethod[]];

const shippingMethodSchema = z.enum(SHIPPING_METHODS);

/** Dropdown options for any surface that picks a shipping method. */
export const SHIPPING_METHOD_OPTIONS = SHIPPING_METHODS.map((value) => ({
  value,
  label: SHIPPING_METHOD_LABEL[value],
}));

/** A non-negative money/threshold amount, coerced from the form's string. */
const amount = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number.` }).min(0, `${label} cannot be negative.`);

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const shippingConfigFormSchema = z
  .object({
    label: annotate(z.string().min(1, "Give this rule a name.").max(80), {
      section: "basics", sectionLabel: "Shipping Rule", sectionRequired: true,
      quick: true, order: 1, row: "pair",
    }),
    method: annotate(shippingMethodSchema, {
      section: "basics", quick: true, order: 2, row: "pair",
    }),

    /*
     * Each rate field shows only for the method it belongs to. A flat-rate
     * rule has no price-per-kg, and showing one invites a seller to fill in a
     * number the checkout will never read.
     *
     * These pair with the `superRefine` below, which requires the field under
     * the SAME condition — hiding a required field would otherwise fail
     * validation invisibly.
     */
    flatRate: annotate(amount("Flat rate").optional(), {
      section: "rates", sectionLabel: "Rates", order: 1, row: "pair",
      when: (v) => v.method === "flat",
    }),
    pricePerKg: annotate(amount("Price per kg").optional(), {
      section: "rates", order: 2, row: "pair",
      when: (v) => v.method === "weight",
    }),
    freeAbove: annotate(amount("Free above").optional(), {
      section: "rates", order: 3, row: "pair",
      when: (v) => v.method === "free",
    }),
    expressSurcharge: annotate(amount("Express surcharge").optional(), {
      section: "rates", order: 4, row: "pair",
      when: (v) => v.method === "express",
    }),
    estimatedDays: annotate(
      z.coerce.number().int("Estimated days must be a whole number.").min(0).max(365).optional(),
      { section: "rates", order: 5, row: "pair" },
    ),

    isDefault: annotate(z.boolean(), {
      section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
    }),
    isActive: annotate(z.boolean(), {
      section: "visibility", order: 2, row: "quarter",
    }),
  })
  .superRefine((v, ctx) => {
    // A rate rule with no rate is not a rule. Checked per method, because the
    // required field differs and a blanket `.min(1)` would make every rate
    // mandatory for a free/pickup rule that has none.
    const need = (path: "flatRate" | "pricePerKg", label: string) => {
      if (v[path] == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: `A "${label}" rule needs a ${path === "flatRate" ? "flat rate" : "price per kg"}.`,
        });
      }
    };
    if (v.method === "flat") need("flatRate", "flat");
    if (v.method === "weight") need("pricePerKg", "weight");
  });

export type ShippingConfigFormValues = z.infer<typeof shippingConfigFormSchema>;

/** `storeId` is absent — the route sets it from the session, never the body. */
export const shippingConfigCreateSchema = shippingConfigFormSchema;

/**
 * Update contract — partial, and `.strict()` so an unknown key is a 400 rather
 * than a silent write. The per-method completeness rules do not apply: a PATCH
 * may legitimately carry only `isActive`.
 */
export const shippingConfigUpdateSchema = z
  .object({
    label: z.string().min(1).max(80).optional(),
    method: shippingMethodSchema.optional(),
    flatRate: amount("Flat rate").optional(),
    pricePerKg: amount("Price per kg").optional(),
    freeAbove: amount("Free above").optional(),
    expressSurcharge: amount("Express surcharge").optional(),
    estimatedDays: z.coerce.number().int().min(0).max(365).optional(),
    zones: z.array(z.string()).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
