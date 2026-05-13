import type { JobContext } from "../runtime/types";

interface BanHistoryEntry {
  type: "hard_ban" | "hard_unban" | "soft_ban" | "soft_unban";
  reason?: string;
  action?: string;
  performedBy?: string;
  at: Date;
}

export interface HandleUserBanChangeInput {
  uid: string;
  before: {
    isDisabled?: boolean;
    hardBanReason?: string;
    hardBannedBy?: string;
    softBans?: unknown[];
  } | null;
  after: {
    isDisabled?: boolean;
    hardBanReason?: string;
    hardBannedBy?: string;
    softBans?: unknown[];
  } | null;
}

export async function handleUserBanChange(
  input: HandleUserBanChangeInput,
  ctx: JobContext,
): Promise<void> {
  const { uid, before, after } = input;
  if (!after) return;

  const entries: BanHistoryEntry[] = [];
  const wasDisabled = Boolean(before?.isDisabled);
  const isNowDisabled = Boolean(after.isDisabled);

  // Hard ban applied
  if (!wasDisabled && isNowDisabled && after.hardBanReason) {
    entries.push({
      type: "hard_ban",
      reason: after.hardBanReason,
      performedBy: after.hardBannedBy,
      at: new Date(),
    });
  }

  // Hard ban lifted
  if (wasDisabled && !isNowDisabled) {
    entries.push({
      type: "hard_unban",
      at: new Date(),
    });
  }

  // Soft ban changes — detect additions
  const prevSoftBans = (before?.softBans as Array<Record<string, unknown>> | undefined) ?? [];
  const nextSoftBans = (after.softBans as Array<Record<string, unknown>> | undefined) ?? [];
  const prevActions = new Set(prevSoftBans.map((b) => b.action as string));
  const nextActions = new Set(nextSoftBans.map((b) => b.action as string));

  for (const nextBan of nextSoftBans) {
    if (!prevActions.has(nextBan.action as string)) {
      entries.push({
        type: "soft_ban",
        action: nextBan.action as string,
        reason: nextBan.reason as string | undefined,
        performedBy: nextBan.bannedBy as string | undefined,
        at: new Date(),
      });
    }
  }

  for (const action of prevActions) {
    if (!nextActions.has(action)) {
      entries.push({ type: "soft_unban", action, at: new Date() });
    }
  }

  if (entries.length === 0) return;

  const banHistoryRef = ctx.db.collection("users").doc(uid).collection("banHistory");
  const batch = ctx.db.batch();
  for (const entry of entries) {
    batch.set(banHistoryRef.doc(), entry);
  }

  try {
    await batch.commit();
    ctx.logger.info("onUserBanChange: ban history entries written", { uid, count: entries.length });
  } catch (err) {
    ctx.logger.error("onUserBanChange: failed to write ban history (non-fatal)", err, { uid });
  }
}
