import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { config } from "./config";

export function isPreOrderProduct(doc: ProductDocument): boolean {
  return doc.listingType === "pre-order";
}

/**
 * True when the pre-order window is still open.
 *
 * ## 🛑 `config.ts` WINS. This function used to disagree with it, and it was
 * the one that was wrong — twice over.
 *
 * It read:
 *
 *     isPreOrderProduct(doc) && !doc.preOrderClosed && doc.preOrderDeliveryDate! > new Date()
 *
 * Two defects in one expression:
 *
 *  1. **The `!` assertion on an OPTIONAL field.** `preOrderDeliveryDate?: Date`,
 *     so on a dateless pre-order this evaluated `undefined > new Date()` →
 *     `false`, silently calling every such listing CLOSED. The non-null
 *     assertion is what hid it from `tsc`: the only tool that could have said
 *     so was told not to.
 *  2. **Gating availability on the delivery date at all.** That is the
 *     substantive disagreement, and `config.ts:37-48` states the right rule
 *     with its reason: *"A pre-order closes when its allocation fills, NOT when
 *     its delivery date passes — a shipped-soon pre-order is still orderable."*
 *     A pre-order due tomorrow is the most orderable it will ever be.
 *
 * So the date is **not** an availability input. It is a CHECKOUT input — the
 * 45-day rule lives in `preOrderRule.preflightChecks`, which refuses a past or
 * beyond-window date at the moment money would move, and in the write-side cap
 * that stops such a listing existing. Those are the places a date belongs:
 * availability answers "is this listing live", the rule answers "may this
 * payment be taken".
 *
 * 🛑 This now DELEGATES rather than restating the three conditions. Four
 * partial copies of one predicate, none of them the definition, is Root Cause
 * #73 — and this was copy number two. `config.isAvailable` is the per-type half
 * of the canonical predicate (`isListingRowAvailable` in `_registry.ts` pairs
 * it with the shared stock clauses), so calling it is what makes "they agree"
 * structural instead of a comment claiming they do.
 *
 * ## Callers
 *
 * None, measured at the time this was fixed — which is why correcting the
 * behaviour here is safe rather than a change of meaning somewhere unseen. If
 * you are about to add one, prefer `isListingRowAvailable(row)` from
 * `_registry.ts`: it also applies the shared sold/stock checks that this
 * type-specific half deliberately does not.
 */
export function isOpenPreOrder(doc: ProductDocument): boolean {
  if (!isPreOrderProduct(doc)) return false;
  /*
   * `as never` — the established spelling in this codebase for handing a
   * `ProductDocument` to an `AvailabilityRow` predicate
   * (`products.repository.ts:1056`, `countersReconcile.ts:156`,
   * `onProductWrite.ts:347,351` all do exactly this). An interface is not
   * assignable to `Record<string, FirestoreValue>` even when every field would
   * satisfy it, and `AvailabilityRow` is deliberately the loose shape because
   * the same row arrives as a Firestore document, as a serialised Function
   * payload and as JSON — see its own docstring. A cast at the boundary beats
   * narrowing `AvailabilityRow`, which would push one to every other caller.
   */
  return config.isAvailable(doc as never);
}
