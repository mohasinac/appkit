import { notFound } from "next/navigation";
import { safeRead } from "../../errors/safe-read";

/**
 * 404 a dynamic detail page whose record does not exist.
 *
 * ## The defect this closes
 *
 * `/admin/coupons/zzzznope-not-a-coupon-42/edit` rendered a fully editable
 * coupon form — twelve inputs, "Save changes", "Delete coupon" — because its
 * `page.tsx` was a bare shim that passed the id straight to an editor. The
 * sibling `/admin/orders/[id]/view` fetched server-side and 404'd correctly;
 * the two differed only because one never grew the check. `audit-admin-detail-notfound`
 * found **fourteen** more, and the danger is Root Cause #98's: the form looks
 * ready to save, and what it saves is a record keyed on an id nobody meant to
 * create.
 *
 * ## 🛑 A FAILED read is not an ABSENT record
 *
 * This is the whole subtlety, and it is why the helper exists rather than each
 * page writing `if (!(await repo.findById(id))) notFound()`.
 *
 * Dashboard pages sit under a layout that `await`s the session, so Next still
 * ATTEMPTS to prerender them and an unguarded throw there is **fatal to the
 * build** (§ "a dynamic API in a DASHBOARD layout is the correct lever"). The
 * read therefore has to go through `safeRead`. But `safeRead` returns its
 * fallback on failure — so a naive `fallback: null` would turn a transient
 * Firestore error, a missing composite index, or a quota exception into a
 * **404 on a record that exists**. That is strictly worse than the bug being
 * fixed: the admin is told their data is gone.
 *
 * So failure and absence are separated by a sentinel. `notFound()` fires ONLY
 * when the read succeeded and returned nothing. When the read fails the page
 * renders, the degradation is recorded as a `DEGRADED_READ` row by `safeRead`
 * itself, and the editor's own fetch surfaces whatever is really wrong.
 *
 * ## Cost
 *
 * One document read, on a route that is per-request anyway. Well inside Rule
 * #6's ~3-round-trip budget, and the editor's client fetch is unchanged — this
 * does not replace it, because the editor is also reachable from a drawer.
 */

/** Distinguishes "the read threw" from "the record is absent". */
const READ_FAILED = Symbol("read-failed");

export interface RequireRecordOptions {
  /** `route` field on the persisted degraded-read entry, e.g. "/admin/events/[id]/edit". */
  route: string;
  /** Stable identifier for the read site, e.g. "events.findById". */
  key: string;
}

/**
 * Calls `notFound()` when `read()` resolves to `null` / `undefined`.
 *
 * Returns the record when it exists, so a caller that already needs the
 * document does not pay for a second read.
 */
export async function requireRecord<T>(
  read: () => Promise<T | null | undefined>,
  opts: RequireRecordOptions,
): Promise<T | null> {
  const result = await safeRead<T | null | undefined | typeof READ_FAILED>(read, {
    route: opts.route,
    key: opts.key,
    fallback: READ_FAILED,
  });

  // The read itself broke. Render the page; `safeRead` has already recorded it.
  if (result === READ_FAILED) return null;

  if (result === null || result === undefined) notFound();
  return result;
}
