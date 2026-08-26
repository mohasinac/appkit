/*
 * WHY: Support tickets had THREE validation rules in three places that did not
 *      agree. `/user/support/new` hand-rolled a `canSubmit` boolean;
 *      `UserSupportView`'s drawer checked nothing at all; and
 *      `POST /api/support/tickets` declared its own inline schema.
 * WHAT: One schema for both surfaces AND the route.
 *
 * ## The page was STRICTER than the route, which is the interesting part
 *
 * `/user/support/new` required an `orderId` when the category is
 * `order_issue` — a real rule, since an order complaint with no order is
 * unactionable and support has to go back and ask. The route never enforced
 * it, and the drawer never enforced anything, so the same ticket was
 * acceptable or not depending on which surface the user happened to open.
 *
 * That rule is a `.superRefine` here, so it now holds on all three. Deleting
 * it to "match the route" would have been the easy read of consolidation and
 * the wrong one: the stricter rule was the correct one.
 *
 * EXPORTS: supportTicketCreateSchema, type SupportTicketCreateValues
 *
 * @tag domain:support
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/user/support/new,UserSupportView,/api/support/tickets
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { TicketCategoryValues, type TicketCategory } from "./firestore";

/*
 * `Object.values(...)` rather than `z.enum(TicketCategoryValues)`. The object
 * form of `z.enum` is Zod 4 syntax, and appkit compiles against zod 3 while
 * the app is on 4 — the two-zod split this repo carries. The tuple form works
 * in both, and still DERIVES from the one map, so a twelfth category cannot be
 * omitted here (Root Cause #61).
 */
const CATEGORY_TUPLE = Object.values(TicketCategoryValues) as [
  TicketCategory,
  ...TicketCategory[],
];

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const supportTicketCreateSchema = z
  .object({
    category: annotate(z.enum(CATEGORY_TUPLE), {
      section: "ticket",
      sectionLabel: "What do you need help with?",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    subject: annotate(
      z
        .string()
        .min(3, "Give the ticket a subject of at least 3 characters.")
        .max(200, "Keep the subject under 200 characters."),
      { section: "ticket", quick: true, order: 2, row: "full" },
    ),
    description: annotate(
      z
        .string()
        .min(10, "Describe the problem in at least 10 characters.")
        .max(5000, "Keep the description under 5000 characters."),
      { section: "ticket", quick: true, order: 3, row: "full", kind: "textarea" },
    ),
    orderId: annotate(z.string().max(120).optional(), {
      section: "ticket",
      order: 4,
      row: "pair",
      help: "Required when the category is an order issue.",
    }),
  })
  .superRefine((v, ctx) => {
    /*
     * The rule only `/user/support/new` enforced. An order complaint with no
     * order id cannot be actioned — support has to reply asking for it, which
     * is a round trip the form can prevent.
     */
    if (v.category === TicketCategoryValues.ORDER_ISSUE && !v.orderId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orderId"],
        message: "Which order is this about? An order id is required.",
      });
    }
  });

export type SupportTicketCreateValues = z.infer<typeof supportTicketCreateSchema>;
