/**
 * The ONE write path for a platform rate.
 *
 * ## Why there is exactly one
 *
 * Rates live on `siteSettings`, which `PUT /api/admin/site` can already write
 * — so this is not the only way the numbers CAN move. It is the only way they
 * move with a recorded reason, an effective date and an `adminAuditLog` row,
 * and that difference is the whole point of `/admin/pricing`.
 *
 * The general settings form stays able to write them. Locking it out would
 * mean an admin fixing a typo in the COD ceiling gets a 400 from the page that
 * has always owned it, and the fix would be to come here — which is a worse
 * outcome than an occasional unlogged edit. What this buys is that the
 * DELIBERATE act of repricing has one door with a record behind it.
 *
 * ## 🛑 Forward-only, enforced at the WRITE
 *
 * `rejectRateChange` is a pure function and lives in the registry so the form
 * can run it too — but the form running it is a courtesy, and this is the
 * enforcement. A backdated change here would restate figures already invoiced
 * and already paid out; see the registry header.
 */

import { getAdminDb } from "../../../../providers/db-firebase";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import {
  SITE_SETTINGS_COLLECTION,
  type SiteSettingsDocument,
} from "../../../../features/admin/schemas/firestore";
import {
  canEditRate,
  rateByPath,
  rejectRateChange,
  type RateChange,
} from "../../../shared/features/pricing/rate-registry";
import { recordAdminAction } from "../audit-log/actions";
import { AdminAuditActionValues } from "../../../../features/audit-log/schemas/firestore";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { ValidationError } from "../../../../errors/validation-error";

const SINGLETON_ID = "global";

/**
 * How many changes the log keeps, newest first.
 *
 * Sized so a year of ordinary repricing fits: 16 rates changed a few times
 * each is well under this, and the page shows only the most recent per rate
 * anyway. The cap exists because the array rides on a document every request
 * reads, not because 200 entries is a lot of data.
 */
export const RATE_CHANGE_LOG_MAX = 200;

export interface ApplyRateChangeInput {
  path: string;
  newValue: number;
  /** Omit for "now". Never earlier than now — see `rejectRateChange`. */
  effectiveFrom?: Date;
  reason?: string;
}

export interface ApplyRateChangeResult {
  path: string;
  previousValue: number | null;
  newValue: number;
  effectiveFrom: Date;
}

/** Read a dotted path off the settings document. `null` when absent. */
function readRate(settings: SiteSettingsDocument, path: string): number | null {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
      settings,
    );
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Change one rate.
 *
 * 🛑 **One rate per call, on purpose.** A bulk form would need one reason
 * covering a heterogeneous set, which is the same argument that removed the
 * bulk offer-cancel: one shared reason across unlike records is worse audit
 * data than no bulk action. Repricing three things is three decisions.
 */
export async function applyRateChange(
  input: ApplyRateChangeInput,
  actor: { uid: string; name?: string; isAdmin: boolean },
  now: Date = new Date(),
): Promise<ApplyRateChangeResult> {
  const descriptor = rateByPath(input.path);
  if (!descriptor) {
    throw new ValidationError("That is not a rate this platform charges.", {
      path: `Unknown rate: ${input.path}`,
    });
  }

  if (!canEditRate(descriptor.tier, actor.isAdmin)) {
    /*
     * A statutory rate reaches this branch for EVERYONE, admins included —
     * which is why the message names the real destination rather than
     * implying the caller lacks a permission they could be granted.
     */
    throw new ValidationError(
      descriptor.tier === "statutory"
        ? "Statutory rates are not set here — they are sourced per HSN code in Tax codes."
        : "Only an administrator can change a policy ceiling.",
      { path: descriptor.label },
    );
  }

  const settings = await siteSettingsRepository.getSingleton();
  const previousValue = readRate(settings, descriptor.path);
  const effectiveFrom = input.effectiveFrom ?? now;

  const problem = rejectRateChange(
    { effectiveFrom, previousValue, newValue: input.newValue, reason: input.reason },
    descriptor.tier,
    now,
  );
  if (problem) {
    throw new ValidationError(problem, { newValue: problem });
  }

  const entry: RateChange = {
    path: descriptor.path,
    previousValue,
    newValue: input.newValue,
    effectiveFrom,
    changedByUid: actor.uid,
    changedByName: actor.name ?? "",
    ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    changedAt: now,
  };

  /*
   * 🛑 A DOTTED path for the rate, and a whole-array write for the log.
   *
   * `update()` replaces a nested map wholesale (D13, recorded at length in
   * `updateSingleton`), so writing `{ commissions: { platformFeePercent: 2 } }`
   * would delete every other commission. The dotted form touches one leaf.
   *
   * The log cannot use `arrayUnion` because that cannot enforce the cap — the
   * same reason `withHistory`'s batch paths fold in memory. Newest first, so
   * the slice drops the OLDEST.
   */
  const nextLog = [entry, ...(settings.rateChanges ?? [])].slice(0, RATE_CHANGE_LOG_MAX);

  await getAdminDb()
    .collection(SITE_SETTINGS_COLLECTION)
    .doc(SINGLETON_ID)
    .update({
      [descriptor.path]: input.newValue,
      rateChanges: nextLog,
      updatedAt: now,
    });

  /*
   * Best-effort, never fails the change — the same contract every other
   * `recordAdminAction` caller has. The rate has already moved; refusing to
   * acknowledge it because the log write failed would leave the admin
   * believing it had not.
   */
  try {
    await recordAdminAction({
      actorUid: actor.uid,
      actorName: actor.name,
      action: AdminAuditActionValues.PRICING_UPDATE,
      targetType: "siteSettings",
      targetId: descriptor.path,
      targetLabel: descriptor.label,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
      metadata: {
        tier: descriptor.tier,
        unit: descriptor.unit,
        previousValue,
        newValue: input.newValue,
        effectiveFrom: effectiveFrom.toISOString(),
      },
    });
  } catch (err) {
    const normalized = normalizeError(err);
    serverLogger.warn("applyRateChange: audit log write failed", {
      path: descriptor.path,
      message: normalized.message,
    });
  }

  return { path: descriptor.path, previousValue, newValue: input.newValue, effectiveFrom };
}
