/**
 * Core: hard-ban cascade — disables Auth login, marks the user banned,
 * revokes sessions, suspends any owned store + archives its products,
 * cancels active bids, and cascades the ban across any address / payment
 * clusters shared with other accounts (fraud-ring containment).
 *
 * Extracted verbatim (stage-for-stage) from the former synchronous
 * `POST /api/admin/users/[uid]/hard-ban` route body — that route now only
 * runs the cheap pre-flight guards (self-ban / target-exists / admin-target)
 * and enqueues this as a `hardBanCascade` job (see `./jobRunners.ts`) so the
 * cascade runs inside a Firebase Function instead of the Vercel 10s sync
 * ceiling (CLAUDE.md Rule #6).
 *
 * Each stage keeps its original non-fatal try/catch-log-continue behavior,
 * EXCEPT stage 2 (marking the user banned on Firestore), which is the one
 * write that must succeed for the ban to take effect — if it throws, the job
 * is marked failed so an admin can retry.
 */

import { normalizeError } from "../../../../errors/normalize";
import {
  userRepository,
  sessionRepository,
  storeRepository,
  productRepository,
  bidRepository,
  addressesRepository,
  savedPaymentMethodsRepository,
  siteSettingsRepository,
} from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { isSellerUser } from "../../../../features/auth/role-predicates";
import { getAdminAuth } from "../../../../providers/db-firebase";
import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";

export interface HardBanCascadeInput {
  uid: string;
  reason: string;
  bannedBy: string;
}

async function cascadeAddressClusterBan(
  uid: string,
  banData: { banReason: string; bannedBy: string },
): Promise<void> {
  const userAddresses = await addressesRepository.listByOwner("user", uid);
  const uniqueHashes = [...new Set(userAddresses.map((a) => a.addressHash).filter(Boolean))] as string[];
  for (const hash of uniqueHashes) {
    const cluster = await addressesRepository.listByAddressHash(hash);
    const hasBannedAccount = cluster.some((a) => a.ownerId !== uid && a.banStatus === "banned");
    if (!hasBannedAccount) continue;
    const otherOwners = [...new Set(cluster.filter((a) => a.ownerId !== uid).map((a) => `${a.ownerType}|${a.ownerId}`))];
    for (const ownerKey of otherOwners) {
      const [ownerType, ownerId] = ownerKey.split("|");
      await addressesRepository.banAllForOwner(ownerType as "user" | "store", ownerId, banData);
    }
  }
}

async function cascadePaymentClusterBan(
  uid: string,
  banData: { banReason: string; bannedBy: string },
): Promise<void> {
  const userMethods = await savedPaymentMethodsRepository.listByUser(uid);
  for (const method of userMethods) {
    if (!method.identifierHash) continue;
    const cluster = await savedPaymentMethodsRepository.listByIdentifierHash(method.identifierHash);
    const hasBannedAccount = cluster.some((m) => m.userId !== uid && m.banStatus === "banned");
    if (!hasBannedAccount) continue;
    const otherUserIds = [...new Set(cluster.filter((m) => m.userId !== uid).map((m) => m.userId))];
    for (const otherId of otherUserIds) {
      await savedPaymentMethodsRepository.banAllForUser(otherId, banData);
    }
  }
}

export async function runHardBanCascade(
  input: HardBanCascadeInput,
  ctx: JobContext,
): Promise<JobRunResult> {
  const { uid, reason, bannedBy } = input;
  const target = await userRepository.findById(uid);
  if (!target) {
    return {
      summary: { total: 1, succeeded: 0, skipped: 1, failed: 0 },
      succeeded: [],
      skipped: [uid],
      failed: [],
    };
  }

  // 1. Disable Firebase Auth login
  try {
    await getAdminAuth().updateUser(uid, { disabled: true });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("hard-ban: Auth disable failed (user may lack Auth record)", {
      uid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Mark banned on Firestore doc — the one write that must succeed for the
  // ban to take effect. Left unguarded so a failure here marks the whole job
  // failed (matches the original route's behavior of surfacing a 500).
  await userRepository.update(uid, {
    isDisabled: true,
    hardBanReason: reason,
    hardBannedAt: new Date(),
    hardBannedBy: bannedBy,
  } as never);

  // 3. Delete active sessions
  try {
    const sessions = await sessionRepository.findActiveByUser(uid);
    await Promise.all(sessions.map((s) => sessionRepository.delete(s.id)));
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("hard-ban: session cleanup failed (non-fatal)", {
      uid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 4. Cascade to store if seller
  if (isSellerUser(target)) {
    try {
      const store = await storeRepository.findByOwnerId(uid);
      if (store) {
        await storeRepository.update(store.id, { status: "suspended" } as never);
        const products = await productRepository.findByStore(store.id);
        await Promise.all(
          products.map((p) => productRepository.update(p.id, { status: "archived" } as never)),
        );
      }
    } catch (err) {
      void normalizeError(err);
      ctx.logger.warn("hard-ban: store/product cascade failed (non-fatal)", {
        uid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 5. Cancel active bids
  try {
    const bids = await bidRepository.findBy("bidderId", uid);
    const activeBids = bids.filter((b) => b.status === "active");
    await Promise.all(activeBids.map((b) => bidRepository.update(b.id, { status: "cancelled" } as never)));
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("hard-ban: bid cancellation failed (non-fatal)", {
      uid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 6. Cascade address ban + cross-account cluster ban
  try {
    const banData = { banReason: `User hard-banned: ${reason}`, bannedBy };
    await addressesRepository.banAllForOwner("user", uid, banData);
    await cascadeAddressClusterBan(uid, banData);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("hard-ban: address cluster ban failed (non-fatal)", {
      uid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 7. Cascade payment method ban + cross-account cluster ban
  try {
    const banData = { banReason: `User hard-banned: ${reason}`, bannedBy };
    await savedPaymentMethodsRepository.banAllForUser(uid, banData);
    await cascadePaymentClusterBan(uid, banData);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("hard-ban: payment method cluster ban failed (non-fatal)", {
      uid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 8. Notify user
  try {
    const siteSettings = await siteSettingsRepository.getSingleton();
    const supportEmail = siteSettings.contact?.email || "support@example.com";
    await sendNotification({
      userId: uid,
      type: "account_action",
      priority: "high",
      title: "Account permanently suspended",
      message: `Your account has been permanently suspended. Reason: ${reason}. You may appeal by emailing ${supportEmail}.`,
      relatedId: uid,
      relatedType: "user",
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("hard-ban: user notification failed (non-fatal)", {
      uid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    summary: { total: 1, succeeded: 1, skipped: 0, failed: 0 },
    succeeded: [uid],
    skipped: [],
    failed: [],
  };
}
