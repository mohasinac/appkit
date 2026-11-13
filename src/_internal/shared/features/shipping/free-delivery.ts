/**
 * ── CONFIG INHERITANCE: OVERRIDE-OR-INHERIT, ONE SNAPSHOTTED VALUE ───────────
 *
 * Owner, 2026-11-14: *"like CSS — inline listings; seller inherits to listing
 * if listing is not set, and seller inherits platform config if not set. All 3
 * are configs."* …then, on seeing the first draft: *"why do you need 3 values?
 * You can just snapshot the values on the listings when it is in cart. No need
 * for so many fields — it has a flag: config overridden, then new config; if
 * not, just use the parent's."*
 *
 * 🛑 THE CORRECTION MATTERS AND THE FIRST DRAFT WAS WORSE. It threaded three
 * separate numbers (`listingFreeAbove`, store, `platformFreeAbove`) through the
 * pricing API, so every caller had to know the whole hierarchy and every new
 * config would add another parameter to every signature. The override-flag
 * shape keeps the hierarchy OUT of the call sites: a level either overrides or
 * it does not, and resolution is one fold over the chain.
 *
 * ## The shape
 *
 *   { overridden: false }            -> inherit the parent
 *   { overridden: true, value: X }   -> X, even when X is 0 or false
 *
 * 🛑 THE FLAG IS WHY `0` SURVIVES, and that is the whole reason it beats a bare
 * `?? `-chain of optional numbers. A listing that sets **0** means *always ships
 * free*; with `value ?? parent` that zero is falsy-adjacent and the next
 * careless edit turns it into `||`, which re-inherits the parent and silently
 * charges. With an explicit flag the value is never consulted for its
 * truthiness — the precedence bug recorded for payment methods becomes
 * unrepresentable rather than merely avoided.
 *
 * ## 🛑 INHERITANCE IS LIVE — ONLY AN OVERRIDE IS STORED
 *
 * Owner, 2026-11-14: *"if not overridden, the latest values from parents auto
 * inherits."*
 *
 * So a level that does not override stores NOTHING and reads the parent's
 * CURRENT value every time. A seller raising their free-delivery threshold
 * moves every listing that never overrode it, immediately, with no backfill —
 * which is the entire point of inheriting rather than copying.
 *
 * ⚠ THE ALTERNATIVE WAS CONSIDERED AND REJECTED, so it is not re-litigated:
 * resolving once and freezing the number onto each listing would make a
 * seller's policy change a MIGRATION over their whole catalogue, and every
 * un-migrated row would keep quoting a withdrawn promise. That is the
 * stored-identifier trap this project already records — a value copied out of
 * its source drifts the moment the source moves.
 *
 * ✅ The consequence for storage, stated plainly: `product.shipping.freeAbove`
 * is present ONLY on a listing that genuinely overrides. Absent is not "zero"
 * and not "unknown" — it is *"ask my parent, now."*
 */

/**
 * One level of a config chain.
 *
 * ⚠ Generic on purpose. Owner: *"do same for every config we have"* — the same
 * three-level shape governs payment methods, listing capabilities, protection
 * and delivery, so the inheritance primitive is not shipping-specific.
 */
export type ConfigLevel<T> = { overridden: false } | { overridden: true; value: T };

/** Shorthand for the common "this level said nothing" case. */
export const INHERIT = { overridden: false } as const;

/** Shorthand for a level that speaks. */
export const override = <T,>(value: T): ConfigLevel<T> => ({ overridden: true, value });

/**
 * Resolve a chain MOST-SPECIFIC FIRST, returning the first level that overrides.
 *
 * `levels` is ordered `[listing, store, platform]` — narrowest to widest.
 *
 * ⚠ Returns `undefined` when NO level overrides. The caller decides what that
 * means, because the conservative direction differs per config: for a delivery
 * threshold it is "never free", for a grant it is "deny". A default baked in
 * here would be one of those two and silently wrong for the other.
 */
export function resolveConfigChain<T>(levels: readonly ConfigLevel<T>[]): T | undefined {
  for (const level of levels) {
    if (level.overridden) return level.value;
  }
  return undefined;
}

/** Absent at every level means "never free" — never `0`. */
export const NEVER_FREE = Number.POSITIVE_INFINITY;

/**
 * The free-delivery threshold for ONE listing.
 *
 * 🛑 `NEVER_FREE` and not `0` when nothing overrides. Zero means *free from the
 * first rupee*, so an unconfigured install would ship everything free — which
 * is not hypothetical, it is the state this store was measured in.
 */
export function resolveFreeDeliveryThreshold(
  levels: readonly ConfigLevel<number | null>[],
): number {
  const resolved = resolveConfigChain(levels);
  /*
   * 🛑 `null` IS AN OVERRIDE MEANING "NO FREE DELIVERY", and it is what makes
   * this OPT-IN rather than mandatory. Owner, 2026-11-14: *"as I said, it's
   * opt-in, not mandatory."*
   *
   * Without an expressible "off", a platform-level threshold would reach every
   * listing that had not overridden it — inheritance would impose free delivery
   * on sellers who never agreed to fund it, which is the opposite of opt-in.
   * `null` stops the chain and answers NEVER_FREE.
   *
   * ⚠ So the three states are distinct and must stay so:
   *   { overridden: false }           inherit — ask my parent, now
   *   { overridden: true, value: n }  free above n (0 = always free)
   *   { overridden: true, value: null } explicitly NOT free, whatever the parent says
   *
   * Collapsing `null` into "not overridden" would silently re-inherit the
   * parent and charge nothing — the same shape as the `||` bug this module's
   * header is about.
   */
  if (resolved === null) return NEVER_FREE;
  return typeof resolved === "number" && Number.isFinite(resolved) && resolved >= 0
    ? resolved
    : NEVER_FREE;
}

/**
 * The threshold for a whole order GROUP — the strictest of its snapshotted
 * lines.
 *
 * 🛑 STRICTEST (HIGHEST) WINS, the convention already settled for per-listing
 * config inside a group: *"every listing is checked and the strictest wins, so
 * one prepaid-only item makes its group prepaid-only."* Shipping is billed per
 * parcel and carriage cannot be apportioned, so the generous reading lets the
 * cheapest qualifying item carry an entire cart's delivery.
 *
 * ⚠ An EMPTY group answers `NEVER_FREE`. "Every line qualifies" is vacuously
 * true of no lines, and a vacuous truth on a money path is how a degenerate
 * input becomes free shipping.
 */
export function resolveGroupFreeDeliveryThreshold(
  snapshottedThresholds: readonly number[],
): number {
  if (snapshottedThresholds.length === 0) return NEVER_FREE;
  return snapshottedThresholds.reduce(
    (strictest, t) => Math.max(strictest, Number.isFinite(t) && t >= 0 ? t : NEVER_FREE),
    0,
  );
}

/**
 * Does this group's goods value clear its threshold?
 *
 * ⚠ `>=`, matching `quoteShipping`'s existing `goodsValue >= policy.freeAbove`.
 * One comparison, one meaning — a second spelling of the same rule is what this
 * module exists to avoid.
 */
export function qualifiesForFreeDelivery(goodsValue: number, threshold: number): boolean {
  if (!Number.isFinite(threshold) || !Number.isFinite(goodsValue)) return false;
  return goodsValue >= threshold;
}
