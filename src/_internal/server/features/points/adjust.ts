import { pointsRepository } from "../../../../features/points/repository/points.repository";
import { pointsExpiryFrom } from "../../../../features/points/schemas/firestore";
import { AdminAuditActionValues } from "../../../../features/audit-log/schemas/firestore";
import { recordAdminAction } from "../audit-log/actions";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import type { PointsAdjustFormValues } from "../../../../features/points/schemas/adjust-form";

/**
 * `admin_adjustment`'s first HUMAN writer.
 *
 * ## Why this is the last piece of D48 rather than the first
 *
 * `admin_adjustment` and `redemption_reversal` were both fully specified —
 * signed-amount invariant, mandatory `adminReason`, the lot — and had **zero
 * writers**. The reversal got one when cancellation was built. This is the
 * other, and it was left until last on purpose: it is the only path by which a
 * human can create spendable money from nothing, so it should not have existed
 * before the ledger could expire a batch, consume FIFO, reverse a spend and
 * reconcile against its own mirror. All four now do.
 *
 * ## 🛑 The one writer it must NOT be confused with
 *
 * `expireLapsedBatches` also appends `admin_adjustment`, with
 * `actorUid: "system:points-expiry"`, and its docstring calls that **the one
 * place a system actor may write an adjustment** — because expiry is a rule
 * with a date attached rather than a discretionary decision.
 *
 * So this function takes a REAL `actorUid` and never that sentinel. Reusing it
 * would make a human's decision indistinguishable from a scheduled rule in the
 * one record that exists to tell them apart.
 *
 * ## Credits expire; debits and the reason do not
 *
 * A positive adjustment gets `pointsExpiryFrom(now)` like any other credit — an
 * admin-granted goodwill credit is not more permanent than an earned one, and
 * leaving `expiresAt` absent would mean NEVER EXPIRES, quietly making this the
 * one way to mint a perpetual balance.
 *
 * A negative adjustment passes nothing, matching every other spend: there is
 * nothing left to expire.
 *
 * ## Two records, deliberately
 *
 * The ledger entry answers "why does this account have 53 points". The
 * `adminAuditLog` row answers "what have admins done lately". The second is the
 * one you need when the account is not yet suspected, which is why a feature
 * that already records `actorUid` on the entry still writes both.
 *
 * ## The buyer is told
 *
 * A balance that changes with no explanation is indistinguishable from a bug,
 * and the buyer is the only party who cannot query the ledger. `description` is
 * the buyer-facing line and is already mandatory in the schema; the
 * notification carries it. `adminReason` is NOT sent — it is written for the
 * next admin and may name an internal case.
 *
 * Best-effort: a notification that fails must not undo an applied adjustment,
 * because the money has already moved and the ledger is the record that
 * matters.
 */
export async function adjustUserPoints(
  input: PointsAdjustFormValues,
  actor: { uid: string; name?: string },
): Promise<{ entryId: string; balance: number }> {
  /*
   * 🛑 No validation here, on purpose. `pointsAdjustFormSchema` is parsed at
   * the route and `isPointsEntryWellFormed` is re-checked inside
   * `append()` — which THROWS rather than writing a row it knows is
   * malformed. A third copy of the rule here is the sixth-hand-rolled-copy
   * shape (Root Cause #75); what this function owns is the side effects.
   */
  const isCredit = input.amount > 0;

  const { entryId, balance } = await pointsRepository.append({
    userId: input.userId,
    kind: "admin_adjustment",
    amount: input.amount,
    description: input.description,
    adminReason: input.adminReason,
    actorUid: actor.uid,
    ...(isCredit ? { expiresAt: pointsExpiryFrom(new Date()) } : {}),
  });

  serverLogger.info("adjustUserPoints", {
    actorUid: actor.uid,
    userId: input.userId,
    amount: input.amount,
    balance,
    entryId,
  });

  void recordAdminAction({
    actorUid: actor.uid,
    actorName: actor.name,
    action: AdminAuditActionValues.POINTS_ADJUST,
    targetType: "user",
    targetId: input.userId,
    reason: input.adminReason,
    metadata: { amount: input.amount, balanceAfter: balance, entryId },
  });

  await sendNotification({
    userId: input.userId,
    type: "account_action",
    /*
     * `account_action` is email-ELIGIBLE, which is correct here: a balance that
     * changed is money news, and the buyer is the one party who cannot query
     * the ledger to find out why.
     *
     * 🛑 And the type is right rather than convenient — `account_action` means
     * "something was done TO your account by us", which is exactly this. It was
     * split away from support-ticket and scam-report activity precisely so a
     * type-level email decision could distinguish them.
     */
    priority: "normal",
    title: isCredit ? "Points added to your account" : "Points removed from your account",
    message: input.description,
    relatedType: "user",
    relatedId: input.userId,
  }).catch((err: unknown) => {
    void normalizeError(err);
    serverLogger.warn("adjustUserPoints: buyer notification failed (adjustment stands)", {
      userId: input.userId,
      entryId,
    });
  });

  return { entryId, balance };
}
