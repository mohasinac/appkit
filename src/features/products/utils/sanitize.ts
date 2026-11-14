/**
 * Strip seller-identity fields from a product record before returning it from a
 * public API endpoint. Public clients must only see store-scoped identity
 * (`storeId`, `storeName`, `storeSlug`) — never `sellerId` (Firebase UID) or
 * the seller's personal name/email.
 *
 * Use on every public GET response that returns products. Admin/seller-scoped
 * routes must NOT sanitize — they legitimately surface owner identity.
 */
import type { JsonValue } from "../../../schemas/types";

const SELLER_IDENTITY_FIELDS = [
  "sellerId",
  "sellerName",
  "sellerEmail",
  "ownerId",
] as const;

export function sanitizeProductForPublic<T extends object>(
  item: T,
): T {
  const copy = { ...item };
  for (const field of SELLER_IDENTITY_FIELDS) {
    delete (copy as Record<string, JsonValue>)[field];
  }
  /*
   * 🛑 EVERY `*Index` field, by SUFFIX — never a list.
   *
   * `products` joined the PII registry on 2026-11-11, and `encryptPiiFields`
   * derives a `` `${field}Index` `` blind-index sibling for every top-level
   * field it encrypts, with no map involved and no way to opt out. So a
   * product document now carries `sellerNameIndex` and `sellerEmailIndex` —
   * HMACs nothing queries. Deleting the plaintext field and leaving its digest
   * behind is worse than useless: a blind index is deterministic, so
   * publishing one is an offline *"is this person a seller here"* oracle.
   *
   * A suffix sweep rather than extending the list above, because a strip list
   * built from declarations misses whatever is not declared — this project has
   * now shipped that exact leak twice (`phoneNumberIndex` on
   * `/api/admin/users`, `sellerTokensIndex` on `/api/admin/payouts`), each
   * time in the commit that "fixed" the route. `/Index$/` fails closed.
   */
  for (const key of Object.keys(copy)) {
    if (/Index$/.test(key)) delete (copy as Record<string, JsonValue>)[key];
  }

  /*
   * ── THE NESTED PRIZE BLOCK — REBUILT, NOT COPIED ─────────────────────────
   *
   * 🛑 MEASURED LEAKING 2026-11-14. `/promotions/all` published
   * `eventPrize.winnerUserIds: ["<uid>"]` plus `claimWindowEndsAt` to an
   * ANONYMOUS visitor, on an ISR-cached page. The prizes SECTION was safe —
   * `toPublicEventPrize` rebuilds the block field by field — but the same
   * product also appeared in the FEATURED list, which passes product
   * documents through this function instead.
   *
   * 🛑 EVERYTHING ABOVE IS A TOP-LEVEL SWEEP AND CANNOT SEE INSIDE A MAP.
   * `winnerUserIds` is nested one level down, so neither the identity list nor
   * the `/Index$/` suffix pass touched it. That is the same shape as the three
   * leaks the suffix sweep was written for, one level deeper — and it is why
   * this is handled here rather than in the one list that happened to expose
   * it: any surface that ships a product gets the fix.
   *
   * ⚠ REBUILT, never `delete`d wholesale. The prize TAG is advertising and
   * must survive — the owner's ruling is that a prize is public while the
   * WINNER is not ("visibility ≠ entitlement"). Naming the three fields that
   * may travel makes the leak unrepresentable rather than merely avoided, the
   * same construction `toPublicEventPrize` uses.
   */
  const prize = (copy as Record<string, JsonValue>)["eventPrize"] as
    | Record<string, JsonValue>
    | undefined;
  if (prize && typeof prize === "object") {
    const safe: Record<string, JsonValue> = {};
    if (typeof prize["eventId"] === "string") safe["eventId"] = prize["eventId"];
    if (typeof prize["label"] === "string") safe["label"] = prize["label"];
    if (prize["showInPromotions"] === true) safe["showInPromotions"] = true;
    (copy as Record<string, JsonValue>)["eventPrize"] = safe;
  }

  return copy;
}

export function sanitizeProductsForPublic<T extends object>(
  items: readonly T[],
): T[] {
  return items.map((item) => sanitizeProductForPublic(item));
}
