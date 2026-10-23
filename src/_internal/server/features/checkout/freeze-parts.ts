/**
 * Freezing a composed listing's PARTS onto its order line — Part 14.
 *
 * ## 🛑 Why this is a separate pass, and not inside `expand-order-items`
 *
 * `expandCartLineToOrderRows` is PURE: it takes a product map and returns
 * rows, with no I/O. Composition is not on the product — it lives in
 * `modelCompositions`, keyed by the model's CATEGORY leaf (a named model *is*
 * a category leaf, per the parts schema). So freezing it needs a read, and a
 * read inside that function would make the one piece of checkout arithmetic
 * that can be reasoned about locally depend on Firestore.
 *
 * ## 🛑 Bounded, and usually free
 *
 * Two gates, in this order, because the first one is what keeps the budget:
 *
 * 1. **`LISTING_TYPE_HAS_COMPOSITION`** — most listing types have none, so a
 *    typical order does zero reads. This is checked before anything else.
 * 2. **Distinct category leaves**, capped. Several lines of the same model
 *    share one read; `getCompositionsForCategory` is `React.cache`-wrapped, so
 *    a repeat within one request is free anyway.
 *
 * Rule #6 budgets ~3 sequential round trips for a server action. The cap is
 * what stops a 20-line order of distinct models turning checkout into twenty.
 *
 * ## 🛑 Failure is SILENT BY DESIGN here, which is unusual and deliberate
 *
 * `getCompositionsForCategory` already swallows and warns. A composition we
 * could not read must never fail a checkout: the buyer is paying, the parts
 * list is descriptive, and an order placed without it is complete in every
 * way that matters. The absence is recoverable — the live category still has
 * the data — while a refused payment is not.
 */

import { getCompositionsForCategory } from "../parts/data";
import { LISTING_TYPE_HAS_COMPOSITION } from "../../../../features/parts/schemas/firestore";
import type { OrderDocumentItem } from "../../../../features/orders/schemas/firestore";

/**
 * How many distinct models one order may resolve composition for.
 *
 * Past this the order is a bulk purchase and the parts list stops being the
 * thing anyone disputes. Exceeding it drops the extra lines' parts rather
 * than failing — see the header.
 */
export const COMPOSITION_LOOKUP_MAX = 8;

/**
 * Attach `parts` to every line whose listing type has a composition.
 *
 * Returns a NEW array; the input rows are not mutated, because they are built
 * by a pure function and keeping them pure is what lets that function be
 * reasoned about on its own.
 */
export async function freezePartsOnItems(
  items: readonly OrderDocumentItem[],
): Promise<OrderDocumentItem[]> {
  const eligible = items.filter(
    (i) => i.listingType && LISTING_TYPE_HAS_COMPOSITION[i.listingType] && i.categorySlug,
  );
  if (eligible.length === 0) return [...items];

  const leaves = [...new Set(eligible.map((i) => i.categorySlug as string))].slice(
    0,
    COMPOSITION_LOOKUP_MAX,
  );

  const byLeaf = new Map<string, Array<{ code: string; name: string }>>();
  await Promise.all(
    leaves.map(async (leaf) => {
      const comps = await getCompositionsForCategory(leaf);
      /*
       * One category can carry several compositions (a model released in
       * variants). Flattened and de-duplicated by code: the order records
       * which parts were CLAIMED, and two variants naming the same ring is
       * one fact, not two.
       */
      const seen = new Map<string, string>();
      for (const c of comps) {
        /*
         * 🛑 `slots`, not `parts`. The first draft read `c.parts` — a field
         * `ModelCompositionDocument` does not have — which would have
         * silently frozen an empty list onto every composed line while every
         * other part of the flow behaved correctly. Measured against the
         * schema before shipping, not after.
         */
        for (const slot of c.slots ?? []) {
          /*
           * `slotKey` is the stable identity (`partId` is absent whenever a
           * part did not resolve to a glossary row, which is common in the
           * corpus). `partName` is what a human reads in a dispute.
           */
          const code = String(slot.partId ?? slot.slotKey ?? "");
          if (!code || seen.has(code)) continue;
          seen.set(code, String(slot.partName ?? slot.slotLabel ?? code));
        }
      }
      if (seen.size > 0) {
        byLeaf.set(leaf, [...seen].map(([code, name]) => ({ code, name })));
      }
    }),
  );

  return items.map((i) => {
    const parts = i.categorySlug ? byLeaf.get(i.categorySlug) : undefined;
    return parts?.length ? { ...i, parts } : i;
  });
}
