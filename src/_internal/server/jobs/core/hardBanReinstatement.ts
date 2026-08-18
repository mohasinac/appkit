import { normalizeError } from "../../../../errors/normalize";
import { userRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { getAdminAuth } from "../../../../providers/db-firebase";
import type { JobContext } from "../runtime/types";

/**
 * Reinstatement sweep for temporary hard-bans (Tier PP — 7-day fraud-reject
 * bans) whose `hardBanExpiresAt` has passed. Reversal scope is deliberately
 * narrow — only what the ban itself directly controlled:
 *   - Re-enable Firebase Auth login.
 *   - Clear `isDisabled`, stamp `hardBanReinstatedAt` (keeps `hardBanReason`/
 *     `hardBannedAt`/`hardBannedBy`/`hardBanExpiresAt` as historical record).
 * Deliberately NOT reversed — these need separate admin/appeal action:
 *   - The seller's store stays `suspended` (hardBanCascade stage 4).
 *   - Cancelled bids stay cancelled (stage 5).
 *   - Cross-account address/payment-method cluster bans stay banned
 *     (stages 6/7 — independent fraud-ring findings, not solely contingent
 *     on this user's temporary status).
 */
export async function runHardBanReinstatement(ctx: JobContext): Promise<void> {
  ctx.logger.info("Scanning temporary hard-bans past their expiry");

  const expired = await userRepository.getExpiredHardBans();
  if (expired.length === 0) {
    ctx.logger.info("No expired hard bans found");
    return;
  }

  let reinstated = 0;
  for (const user of expired) {
    try {
      try {
        await getAdminAuth().updateUser(user.uid, { disabled: false });
      } catch (err) {
        void normalizeError(err);
        ctx.logger.warn("hard-ban reinstatement: Auth re-enable failed (non-fatal)", {
          uid: user.uid,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      await userRepository.update(user.uid, {
        isDisabled: false,
        hardBanReinstatedAt: ctx.now,
      } as never);
      reinstated += 1;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to reinstate expired hard ban", err, { uid: user.uid });
    }
  }

  await Promise.allSettled(
    expired.map((user) =>
      sendNotification({
        userId: user.uid,
        type: "account_action",
        priority: "normal",
        title: "Account access restored",
        message:
          "Your account access has been restored. If your seller store was suspended, contact support to reactivate it.",
        relatedId: user.uid,
        relatedType: "user",
      }),
    ),
  );

  ctx.logger.info("Hard ban reinstatement sweep complete", {
    scanned: expired.length,
    reinstated,
  });
}
