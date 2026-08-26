/*
 * WHY: `LotteryAdminEditView` rendered `<Form>` with no schema. A lottery
 *      config is priced money: `uniformPrice` was
 *      `Math.round(parseFloat(x) * 100) / 100 || 0`, which turns any
 *      unparseable input into **zero** rather than an error — so a typo in the
 *      price box published a free lottery.
 *
 *      `slots` is the other half: each row carries a `slotNumber`, a name and
 *      a price, and a duplicate slot number makes two buyers think they own
 *      the same slot.
 *
 * WHAT: The config contract.
 *
 * @tag domain:lottery
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:LotteryAdminEditView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../../../features/shell/field-ui-meta";

const slotSchema = z.object({
  slotNumber: z.coerce.number().int().min(1, "Slot numbers start at 1."),
  name: z.string().trim().max(120).optional(),
  price: z.coerce.number().min(0, "A slot price cannot be negative.").optional(),
  image: z.string().trim().optional(),
});

export const lotteryConfigFormSchema = z
  .object({
    pricingMode: annotate(z.enum(["uniform", "variable"]), {
      section: "pricing", sectionLabel: "Pricing", sectionRequired: true, quick: true, order: 1, row: "pair",
    }),
    /*
     * 🛑 Coerced with a real error, NOT `|| 0`. The previous
     * `parseFloat(x) || 0` silently turned "12,00" or "twelve" into a free
     * lottery — the failure was indistinguishable from deliberately pricing
     * it at zero.
     */
    uniformPrice: annotate(
      z.coerce
        .number({ invalid_type_error: "Enter the slot price as a number." })
        .min(0, "A price cannot be negative.")
        .max(10_000_000, "That looks like a typo.")
        .optional(),
      { section: "pricing", order: 2, row: "pair", kind: "number" },
    ),
    slots: annotate(z.array(slotSchema).min(1, "A lottery needs at least one slot.").max(1000), {
      section: "slots", sectionLabel: "Slots", sectionRequired: true, order: 1, row: "full", kind: "list",
    }),
  })
  .superRefine((v, ctx) => {
    // Uniform pricing with no price is the free-lottery case the `|| 0` used
    // to create silently.
    if (v.pricingMode === "uniform" && (v.uniformPrice === undefined || v.uniformPrice <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uniformPrice"],
        message: "Set a slot price above zero, or switch to variable pricing.",
      });
    }
    // Two buyers cannot own the same slot number.
    const seen = new Set<number>();
    for (const [i, s] of v.slots.entries()) {
      if (seen.has(s.slotNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slots", i, "slotNumber"],
          message: `Slot ${s.slotNumber} appears more than once.`,
        });
      }
      seen.add(s.slotNumber);
    }
  });

export type LotteryConfigFormValues = z.infer<typeof lotteryConfigFormSchema>;
