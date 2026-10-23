/**
 * Does this store accept buyer points as part-payment?
 *
 * ## Why this is a function and not a bare field read
 *
 * Decision 3 has two halves: *"the main store always accepts, others opt in"*.
 * The opt-in half is `StoreDocument.acceptsPoints`; the always half is the
 * platform's own storefront, which cannot decline to fund its own programme.
 *
 * 🛑 The platform store is resolved in CODE rather than seeded `true`, because a
 * seeded flag can be switched off by an edit, a reseed, or an admin clicking the
 * wrong toggle — and the one store that must never stop accepting is the one the
 * whole programme is advertised on. `UserPointsView` tells buyers points are
 * spendable; if the only store could opt out, that promise would be a lie that
 * nothing detected.
 *
 * ## 🛑 Absent means NOT accepted
 *
 * Matching `supportsSaleProtection`'s rule on the same document, and for the
 * same reason: the accepting store ABSORBS the redemption against its payout,
 * so defaulting absent to `true` would enrol every existing seller in funding
 * discounts they never agreed to. A tri-state would be worse still — a buyer
 * cannot tell a seller who declined from one who has not been asked.
 */

/*
 * 🛑 `PLATFORM_STORE_ID` is DECLARED in `features/stores/schemas/firestore.ts`
 * and re-exported here, not defined here.
 *
 * It is still an identity rather than a setting — that reasoning is unchanged
 * and is recorded at the declaration. What moved, and why: a brand-bearing
 * literal inside `_internal/` is what `audit-ssr-in-appkit` Rule 3 blocks,
 * because a consumer of appkit would inherit OUR store id with no seam to
 * override it. The stores schema is also where the matching `acceptsPoints`
 * docstring already explains the always-accepts rule, so the constant and its
 * justification now sit together.
 */
export { PLATFORM_STORE_ID } from "../../../../features/stores/schemas/firestore";
import { PLATFORM_STORE_ID } from "../../../../features/stores/schemas/firestore";

export function storeAcceptsPoints(
  store: { id?: string; acceptsPoints?: boolean } | null | undefined,
  storeId?: string,
): boolean {
  /*
   * The id is taken from either source so a caller holding only an id (the
   * order-group loop) and one holding the document (an admin surface) get the
   * same answer. Mismatched sources would be two rules again.
   */
  const id = store?.id ?? storeId;
  if (id === PLATFORM_STORE_ID) return true;
  return store?.acceptsPoints === true;
}
