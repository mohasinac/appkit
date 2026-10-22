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

/**
 * The platform's own storefront.
 *
 * Hard-coded deliberately: this is an identity, not a setting. It is the same
 * id `realListingsOnly` and the seed's `REAL_STORE_IDS` already treat as the
 * platform's own.
 */
export const PLATFORM_STORE_ID = "store-letitrip-official";

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
