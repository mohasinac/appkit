/**
 * Core: reset OTP/phone verification state — runs when an admin flips
 * `siteSettings.featureFlags.smsVerification` from off to on (see
 * `PATCH /api/site-settings` in the consumer, which enqueues this job on
 * that specific transition).
 *
 * Re-enabling SMS verification after a period of being off means every
 * previously-verified user's `phoneVerified` flag reflects a verification
 * that happened under different rules (or none at all, if verification was
 * off when they signed up) — reset it so everyone re-verifies. The daily
 * global counter and any live per-user cooldowns are also cleared so the
 * freshly-re-enabled feature doesn't inherit rate-limit state from before
 * it was off.
 */

import { USER_COLLECTION } from "../../../../features/auth/schemas/firestore";
import { SMS_COUNTERS_COLLECTION } from "../../../../features/auth/schemas/firestore";
import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";

const BATCH_SIZE = 400;

async function resetPhoneVerifiedFlags(ctx: JobContext): Promise<{ updated: number; failed: string[] }> {
  const failed: string[] = [];
  let updated = 0;
  let lastDocId: string | null = null;

  for (;;) {
    let query = ctx.db
      .collection(USER_COLLECTION)
      .where("phoneVerified", "==", true)
      .orderBy("__name__")
      .limit(BATCH_SIZE);
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }
    const snap = await query.get();
    if (snap.empty) break;

    const batch = ctx.db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { phoneVerified: false });
    }
    try {
      await batch.commit();
      updated += snap.docs.length;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("resetOtpVerification: batch commit failed", err);
      for (const doc of snap.docs) failed.push(doc.id);
    }

    lastDocId = snap.docs[snap.docs.length - 1].id;
    if (snap.docs.length < BATCH_SIZE) break;
  }

  return { updated, failed };
}

async function clearSmsCounters(ctx: JobContext): Promise<number> {
  let removed = 0;
  for (;;) {
    const snap = await ctx.db.collection(SMS_COUNTERS_COLLECTION).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = ctx.db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    removed += snap.docs.length;
    if (snap.docs.length < BATCH_SIZE) break;
  }
  return removed;
}

export async function runResetOtpVerification(ctx: JobContext): Promise<JobRunResult> {
  ctx.logger.info("resetOtpVerification: starting (smsVerification re-enabled)");

  const { updated, failed } = await resetPhoneVerifiedFlags(ctx);
  const countersCleared = await clearSmsCounters(ctx);

  ctx.logger.info("resetOtpVerification: done", { updated, failed: failed.length, countersCleared });

  return {
    summary: {
      total: updated + failed.length,
      succeeded: updated,
      skipped: 0,
      failed: failed.length,
    },
    succeeded: [],
    skipped: [],
    failed: failed.map((id) => ({ id, reason: "batch commit failed" })),
    data: { usersReset: updated, smsCountersCleared: countersCleared },
  };
}
