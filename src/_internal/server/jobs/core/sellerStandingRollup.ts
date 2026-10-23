/**
 * Core: MONTHLY seller-standing rollup — grants and revokes the Trusted
 * Seller tier, and with it early payout.
 *
 * ## What it writes
 *
 * `stores/{id}.standing` — the cached metrics (this IS the cache; the seller's
 * progress panel, the public badge and the admin view all read it off the
 * store document they already load, and none of them recomputes anything).
 * On a transition it also writes `sellerTier` and `trustedSeller` TOGETHER.
 *
 * 🛑 `trustedSeller` moves MONEY. It is read by both payout sweeps
 * (`weeklyPayoutEligibility`, `autoPayoutEligibility`) via
 * `storeRepository.findTrustedStoreIds()`, and it means the store is paid at
 * SHIPPING instead of at delivery — so the platform carries a lost parcel with
 * the money already gone. That is why this job is the only automatic writer,
 * why every transition gets an audit row, and why an admin can pin a store
 * with `standing.tierLockedByAdmin`.
 *
 * 🛑 The flag's author wrote, at `store.repository.ts`: *"trust is granted by
 * hand, one store at a time, on risk grounds. If this ever saturates, the
 * grant has stopped being deliberate."* Automatic granting is exactly that
 * case, accepted deliberately by the owner. The mitigations are real and must
 * not be quietly dropped: both a distinct-BUYER and a distinct-ADDRESS floor,
 * self-bought orders excluded, test data excluded, and the 500-store bound on
 * `findTrustedStoreIds` left in place so saturation is visible.
 */

import { siteSettingsRepository, storeRepository } from "../../../../repositories";
import type { StoreDocument } from "../../../../features/stores/schemas/firestore";
import { recordAdminAction } from "../../features/audit-log/actions";
import { AdminAuditActionValues } from "../../../../features/audit-log/schemas/firestore";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import {
  evaluateSellerStanding,
  resolveSellerStandingThresholds,
  SELLER_TIER,
  type SellerStandingMetrics,
  type SellerStandingThresholds,
  type SellerTier,
} from "../../../shared/features/seller-standing/config";
import type { JobContext } from "../runtime/types";

export interface SellerStandingRollupResult {
  /** Stores examined. */
  examined: number;
  /** Stores whose `standing` cache was written. */
  written: number;
  granted: string[];
  revoked: string[];
  /** Stores skipped because an admin pinned their tier. */
  locked: number;
  /** True when the month-end guard declined to run. */
  skippedNotMonthEnd: boolean;
}

const EMPTY_RESULT: SellerStandingRollupResult = {
  examined: 0,
  written: 0,
  granted: [],
  revoked: [],
  locked: 0,
  skippedNotMonthEnd: true,
};

/** Firestore page size for the two windowed scans. */
const SCAN_PAGE = 500;

// ---------------------------------------------------------------------------
// The month-end guard
// ---------------------------------------------------------------------------

/**
 * 🛑 THIS IS WHY THE CRON IS `0 2 28-31 * *` AND NOT `0 0 31 * *`.
 *
 * Cloud Scheduler uses unix-cron, which has no `L` (last-day) token. A cron on
 * day 31 **never fires in February, April, June, September or November** — it
 * would silently skip 5 of 12 months, and the symptom is not an error but a
 * tier that updates "sometimes". So the schedule fires on each of the last four
 * candidate days and this guard keeps exactly the real one.
 *
 * Uses UTC parts throughout, matching the scheduler's declared `timeZone: UTC`.
 * A local-time implementation would disagree with the trigger near midnight.
 */
export function isLastDayOfMonth(d: Date): boolean {
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
  );
  return next.getUTCMonth() !== d.getUTCMonth();
}

/** The next month-end at or after `d`, for the seller-facing `nextComputeAt`. */
export function nextLastDayOfMonth(d: Date): Date {
  // Day 0 of the following month is the last day of this one.
  const endOfThis = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  if (endOfThis.getTime() > d.getTime()) return endOfThis;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0));
}

// ---------------------------------------------------------------------------
// Per-store accumulator
// ---------------------------------------------------------------------------

interface StoreShell {
  id: string;
  ownerId?: string;
  status?: string;
  sellerTier?: SellerTier;
  trustedSeller?: boolean;
  tierLockedByAdmin?: boolean;
}

interface Tally {
  deliveredOrders: number;
  buyers: Set<string>;
  addresses: Set<string>;
  ratingSum: number;
  ratingCount: number;
}

const emptyTally = (): Tally => ({
  deliveredOrders: 0,
  buyers: new Set(),
  addresses: new Set(),
  ratingSum: 0,
  ratingCount: 0,
});

function toMetrics(t: Tally): SellerStandingMetrics {
  return {
    deliveredOrders: t.deliveredOrders,
    distinctBuyers: t.buyers.size,
    distinctAddresses: t.addresses.size,
    ratedOrders: t.ratingCount,
    /*
     * 0 when there are no ratings, never NaN. `ratingSum / 0` is NaN, and NaN
     * fails every `>=` comparison — which happens to give the right verdict
     * here but writes NaN into Firestore, where it is rejected outright on
     * some paths and renders as "NaN" in the seller's panel on others.
     */
    averageRating: t.ratingCount === 0 ? 0 : t.ratingSum / t.ratingCount,
  };
}

function isTestRow(data: Record<string, unknown>): boolean {
  /*
   * Both spellings. `isTestData` is the legacy boolean and `seedPurpose` is
   * the newer field it is derived from; a row may carry either, so testing one
   * would let the other through and let a tester fixture count toward a real
   * money-moving grant.
   */
  if (data["isTestData"] === true) return true;
  const purpose = data["seedPurpose"];
  return purpose === "test" || purpose === "tester";
}

// ---------------------------------------------------------------------------
// The job
// ---------------------------------------------------------------------------

export interface SellerStandingRollupOptions {
  /**
   * Run regardless of the date. For the admin "recompute now" path and for
   * verification — NOT for the schedule.
   */
  force?: boolean;
}

export async function runSellerStandingRollup(
  ctx: JobContext,
  opts: SellerStandingRollupOptions = {},
): Promise<SellerStandingRollupResult> {
  if (!opts.force && !isLastDayOfMonth(ctx.now)) {
    ctx.logger.info("sellerStandingRollup: not month-end, skipping", {
      now: ctx.now.toISOString(),
    });
    return { ...EMPTY_RESULT };
  }

  const settings = await siteSettingsRepository.getSingleton();
  const thresholds = resolveSellerStandingThresholds(settings.sellerStanding);
  const cutoff = new Date(
    ctx.now.getTime() - thresholds.windowDays * 24 * 60 * 60 * 1000,
  );
  const nextComputeAt = nextLastDayOfMonth(ctx.now);

  ctx.logger.info("sellerStandingRollup: starting", {
    windowDays: thresholds.windowDays,
    cutoff: cutoff.toISOString(),
    forced: Boolean(opts.force),
  });

  // ── Stores ───────────────────────────────────────────────────────────────
  /*
   * Enumerate STORES, not the orders' distinct storeIds. A store that sold
   * nothing this window must still be evaluated, because that is precisely the
   * store whose tier should be REVOKED — a reconciler built from the events
   * that exist can only ever add (Root Cause #102).
   */
  const stores = new Map<string, StoreShell>();
  const storeSnap = await ctx.db
    .collection("stores")
    .select("ownerId", "status", "sellerTier", "trustedSeller", "tierLockedByAdmin")
    .get();
  for (const doc of storeSnap.docs) {
    const d = doc.data() as Record<string, unknown>;
    stores.set(doc.id, {
      id: doc.id,
      ownerId: d["ownerId"] as string | undefined,
      status: d["status"] as string | undefined,
      sellerTier: d["sellerTier"] as SellerTier | undefined,
      trustedSeller: d["trustedSeller"] as boolean | undefined,
      tierLockedByAdmin: d["tierLockedByAdmin"] === true,
    });
  }

  const tallies = new Map<string, Tally>();
  const tally = (storeId: string): Tally => {
    let t = tallies.get(storeId);
    if (!t) {
      t = emptyTally();
      tallies.set(storeId, t);
    }
    return t;
  };

  // ── Orders in the window ─────────────────────────────────────────────────
  /*
   * 🛑 Windowed on `orderDate`, which is REQUIRED, not on `deliveryDate`,
   * which is optional and written by exactly one job (`obligationSweep`). A
   * Firestore inequality EXCLUDES every document lacking the field, so a range
   * on `deliveryDate` would silently drop every order a seller marked
   * delivered by hand — returning a confident undercount with no error
   * anywhere (Root Cause #100).
   *
   * One collection-wide windowed scan rather than a query per store: a
   * per-store `storeId == X AND orderDate >= cutoff` needs a composite index,
   * and a missing one fails as FAILED_PRECONDITION that every caller here
   * would have to not-swallow (Root Cause #2). A single-field inequality is
   * served by the automatic index. `status` is filtered in memory for the same
   * reason.
   */
  let orderCursor: unknown = null;
  let ordersScanned = 0;
  for (;;) {
    let q = ctx.db
      .collection("orders")
      .where("orderDate", ">=", cutoff)
      .orderBy("orderDate", "asc")
      .limit(SCAN_PAGE);
    if (orderCursor) q = q.startAfter(orderCursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;
      ordersScanned += 1;
      if (d["status"] !== "delivered") continue;
      if (isTestRow(d)) continue;
      const storeId = d["storeId"] as string | undefined;
      if (!storeId) continue;
      const store = stores.get(storeId);
      if (!store) continue;
      const userId = d["userId"] as string | undefined;
      /*
       * 🛑 Self-bought orders do not count. Without this a seller reaches the
       * tier — and early payout — by buying from themselves 25 times, which is
       * the cheapest possible attack on a criterion that releases money early.
       */
      if (userId && store.ownerId && userId === store.ownerId) continue;

      const t = tally(storeId);
      t.deliveredOrders += 1;
      if (userId) t.buyers.add(userId);
      /*
       * 🛑 `deliveryAddressId` — the `addresses` row this order was taken
       * from. It is a provenance pointer, NOT PII and NOT encrypted, so
       * counting distinct values needs no decryption and no fingerprint of
       * our own.
       *
       * Orders predating the delivery snapshot carry none and contribute
       * nothing to this criterion. That is forward-only by design: inventing
       * a key from `deliveryPincode` instead would count two different
       * households in one pincode as one address, and the encrypted
       * `deliveryAddressLine1` cannot be read here at all.
       *
       * Honest about its limit: a determined seller can save the same physical
       * place as several address rows. The distinct-BUYER floor is the real
       * defence; this one raises the cost.
       */
      const addressId = d["deliveryAddressId"] as string | undefined;
      if (addressId) t.addresses.add(addressId);
    }
    orderCursor = snap.docs[snap.docs.length - 1];
    if (snap.size < SCAN_PAGE) break;
  }

  // ── Reviews in the window ────────────────────────────────────────────────
  /*
   * Windowed on `createdAt`, which every document carries via `BaseDocument`.
   * `ReviewDocument` has no `publishedAt` field at all — CLAUDE.md's seed
   * table says it does, and that is stale.
   */
  let reviewCursor: unknown = null;
  for (;;) {
    let q = ctx.db
      .collection("reviews")
      .where("createdAt", ">=", cutoff)
      .orderBy("createdAt", "asc")
      .limit(SCAN_PAGE);
    if (reviewCursor) q = q.startAfter(reviewCursor);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;
      if (d["status"] !== "approved") continue;
      if (isTestRow(d)) continue;
      const storeId = d["storeId"] as string | undefined;
      if (!storeId || !stores.has(storeId)) continue;
      const rating = Number(d["rating"]);
      if (!Number.isFinite(rating)) continue;
      const t = tally(storeId);
      t.ratingSum += rating;
      t.ratingCount += 1;
    }
    reviewCursor = snap.docs[snap.docs.length - 1];
    if (snap.size < SCAN_PAGE) break;
  }

  // ── Evaluate + write ─────────────────────────────────────────────────────
  /*
   * 🛑 Through the REPOSITORY, not `ctx.db.update()`.
   *
   * `adminUpdate` runs `withStoreHistory`, and `sellerTier` / `trustedSeller`
   * are both in `STORE_TRACKED_FIELDS` — so a transition earns a
   * `statusHistory` entry stamped `actorRole: "system"`. A raw document write
   * would move money with no timeline entry, which is the one thing the
   * timeline exists for on this field.
   *
   * `prior` is the projected shell rather than a full document, which is safe
   * and deliberate: `withHistory` diffs only `tracked` fields that appear in
   * the PATCH, and the patch only ever carries `standing` (untracked),
   * `sellerTier` and `trustedSeller` — both of which the shell selects. The
   * cast says exactly that and nothing more.
   */
  const writeStore = (store: StoreShell, patch: Record<string, unknown>) =>
    storeRepository.adminUpdate(
      store.id,
      patch as Partial<StoreDocument>,
      { actor: { role: "system" }, trigger: "sellerStandingRollup" },
      store as unknown as StoreDocument,
    );

  const granted: string[] = [];
  const revoked: string[] = [];
  let written = 0;
  let locked = 0;

  for (const store of stores.values()) {
    const metrics = toMetrics(tallies.get(store.id) ?? emptyTally());
    const verdict = evaluateSellerStanding(metrics, thresholds);

    /*
     * `standing` is a pure MEASUREMENT — no admin state in it. The pin lives
     * at the top level precisely so this object can be rebuilt wholesale every
     * month without carrying a decision forward or needing to be merged.
     */
    const standing = {
      computedAt: ctx.now,
      nextComputeAt,
      windowDays: thresholds.windowDays,
      ...metrics,
      met: verdict.met,
    };

    /*
     * An admin-pinned store still gets a REFRESHED `standing` — the seller
     * should see their real figures — but its tier is left exactly where the
     * admin put it. Writing the metrics while not acting on them is the whole
     * point of the lock.
     */
    if (store.tierLockedByAdmin) {
      locked += 1;
      await writeStore(store, { standing });
      written += 1;
      continue;
    }

    /*
     * 🛑 A store that is not ACTIVE can never hold the tier. Suspension
     * already clears it immediately (see `storeRepository.setStatus`), and
     * this is the belt: a suspended store must not be re-granted early payout
     * by a month-end run just because its 90-day history still looks good.
     */
    const eligible = store.status === "active" && verdict.tier === SELLER_TIER.TRUSTED;
    const currentTier = store.sellerTier ?? SELLER_TIER.SELLER;
    const nextTier: SellerTier = eligible ? SELLER_TIER.TRUSTED : SELLER_TIER.SELLER;

    const update: Record<string, unknown> = { standing };
    const isTransition =
      nextTier !== currentTier || Boolean(store.trustedSeller) !== eligible;
    if (isTransition) {
      update["sellerTier"] = nextTier;
      update["trustedSeller"] = eligible;
      if (eligible) granted.push(store.id);
      else revoked.push(store.id);
    }

    await writeStore(store, update);
    written += 1;

    if (!isTransition) continue;

    /*
     * 🛑 Audit and notify on a REAL transition only. Re-saving the monthly
     * `standing` on an unchanged store would otherwise write an audit row
     * describing a decision nobody made and email a seller about nothing —
     * and a log of non-events is how a log stops being read. Same rule the
     * admin PATCH route applies to this exact field.
     */
    void recordAdminAction({
      actorUid: "system",
      action: AdminAuditActionValues.STORE_TRUST_CHANGE,
      targetType: "store",
      targetId: store.id,
      targetLabel: store.id,
      reason: eligible
        ? "Met every Trusted Seller criterion at the monthly recompute"
        : "Fell below a Trusted Seller criterion at the monthly recompute",
      metadata: {
        trustedSeller: eligible,
        previous: Boolean(store.trustedSeller),
        sellerTier: nextTier,
        trigger: "sellerStandingRollup",
        ...metrics,
      },
    });

    if (!store.ownerId) continue;
    /*
     * The seller is told, because the consequence is concrete in both
     * directions: gaining the tier changes when they get paid, and losing it
     * changes it back. Fire-and-forget — a notification failure must not
     * abort a sweep that has already written the tier.
     */
    void sendNotification({
      userId: store.ownerId,
      type: "system",
      priority: "normal",
      title: eligible ? "You're now a Trusted Seller" : "Trusted Seller status paused",
      message: eligible
        ? "Your store met every Trusted Seller criterion this month. Your badge is live and your payouts now start when you ship, rather than on delivery."
        : `Your store no longer meets every Trusted Seller criterion, so the badge is paused and payouts return to starting on delivery. ${verdict.unmetCount === 1 ? "One criterion" : `${verdict.unmetCount} criteria`} to regain it — see your seller guide for the current figures.`,
    }).catch((err) => {
      const e = normalizeError(err);
      ctx.logger.warn("sellerStandingRollup: notification failed", {
        storeId: store.id,
        error: e.message,
      });
    });
  }

  ctx.logger.info("sellerStandingRollup: complete", {
    examined: stores.size,
    ordersScanned,
    written,
    granted: granted.length,
    revoked: revoked.length,
    locked,
  });

  return {
    examined: stores.size,
    written,
    granted,
    revoked,
    locked,
    skippedNotMonthEnd: false,
  };
}
