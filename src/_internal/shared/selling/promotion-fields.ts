/**
 * Who may mark their own listing promoted or featured.
 *
 * ── The defect this closes ────────────────────────────────────────────────
 *
 * `isPromoted` and `featured` sit in the SELLER product form schema
 * (`features/seller/schemas/product-form.ts`), in the product WRITE allowlist
 * and in the PUBLIC allowlist — with nothing in between checking anything. So
 * a seller could set either to `true` on their own listing and land it in the
 * homepage deals rail (`useFeaturedProducts` queries `isPromoted: true`), for
 * free, by ticking a box.
 *
 * Meanwhile `featured_placement` has existed as a `StoreCapability` all along:
 * declared, grantable from `AdminStoreEditorView`, granted to one store in the
 * seed, and PROMISED to sellers in `StoreCapabilitiesGuideView` — *"Your store
 * is eligible to appear in featured store sections on the homepage."* It had
 * **zero enforcement readers**. The guide described a gate that did not exist.
 *
 * ── Why STRIP and not THROW ───────────────────────────────────────────────
 *
 * 🛑 Refusing the write would lock a seller out of editing a listing an ADMIN
 * promoted. Every product edit form re-sends the whole document, so the next
 * typo fix would carry `isPromoted: true` back and be rejected — the exact
 * trap `assertListingTypeAllowed` documents for per-type edit pages.
 *
 * So the escalation is dropped and the rest of the write proceeds. The seller's
 * edit succeeds; the flag simply does not move. An admin-granted promotion
 * survives a seller's edit untouched, which is the behaviour that makes the
 * feature sellable.
 *
 * ⚠ Dropping is not the same as lying. This never SETS a flag the caller did
 * not ask for, and it never clears one that is already stored — it only
 * declines to RAISE one. A seller lowering their own promotion is allowed:
 * giving up placement needs no entitlement.
 */

const PROMOTION_CAPABILITY = "featured_placement";

/** The fields a store must be entitled to raise. */
export const PROMOTION_FIELDS = ["isPromoted", "featured"] as const;
export type PromotionField = (typeof PROMOTION_FIELDS)[number];

export interface PromotionGateContext {
  /** The store's capability array, as stored. */
  capabilities?: readonly string[] | undefined;
  /**
   * Admin and equivalent. ⚠ Unlike the selling gate — which refuses privilege
   * on purpose because no amount of authority makes third-party settlement
   * lawful — this one DOES honour it. Promotion is a commercial decision an
   * admin is entitled to make; there is no external rule being satisfied.
   */
  isPrivileged?: boolean | undefined;
}

/** May this store raise a promotion flag on its own listing? */
export function canPromoteOwnListing(ctx: PromotionGateContext = {}): boolean {
  if (ctx.isPrivileged === true) return true;
  return (ctx.capabilities ?? []).includes(PROMOTION_CAPABILITY);
}

/**
 * Drop any promotion flag the caller is raising without the entitlement.
 *
 * `stored` is the document as it currently exists — absent on create. A value
 * that merely REPEATS what is already stored is not an escalation and passes
 * through, so re-saving an admin-promoted listing is not an attempt to
 * self-promote.
 *
 * ⚠ Mutates nothing. Returns a new object when something was dropped and the
 * SAME reference when nothing was, so callers can cheaply tell whether the
 * write was altered (and log it) without diffing field by field.
 */
export function stripUnearnedPromotion<T extends Record<string, unknown>>(
  input: T,
  ctx: PromotionGateContext = {},
  stored?: Partial<Record<PromotionField, unknown>> | null,
): { value: T; dropped: PromotionField[] } {
  if (canPromoteOwnListing(ctx)) return { value: input, dropped: [] };

  const dropped: PromotionField[] = [];
  for (const field of PROMOTION_FIELDS) {
    if (!(field in input)) continue;
    // Only a RAISE is an escalation. `false`, or a value equal to what is
    // already stored, is not.
    if (input[field] !== true) continue;
    if (stored?.[field] === true) continue;
    dropped.push(field);
  }
  if (dropped.length === 0) return { value: input, dropped: [] };

  const value = { ...input };
  for (const field of dropped) delete (value as Record<string, unknown>)[field];
  return { value, dropped };
}
