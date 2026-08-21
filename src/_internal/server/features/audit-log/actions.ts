/**
 * recordAdminAction — the single write-site for the admin audit trail.
 *
 * MVP scope: instruments the highest-value already-privileged admin actions
 * (bans, checkout bypass, coupon edits, payout mark-paid, store status
 * changes, role changes) rather than sweeping every write path in the app —
 * see CLAUDE.md's "Admin Audit Log" section for the full instrumented-action
 * list and rationale.
 *
 * Callers should treat this as best-effort/non-blocking — a failure to write
 * an audit entry must never fail the underlying privileged action itself.
 */

import { adminAuditLogRepository } from "../../../../features/audit-log/repository/audit-log.repository";
import type { AdminAuditAction } from "../../../../features/audit-log/schemas/firestore";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import type { JsonValue } from "../../../../schemas/types";

export interface RecordAdminActionInput {
  actorUid: string;
  actorName?: string;
  action: AdminAuditAction;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  reason?: string;
  metadata?: Record<string, JsonValue>;
}

export async function recordAdminAction(input: RecordAdminActionInput): Promise<void> {
  try {
    await adminAuditLogRepository.create({
      actorUid: input.actorUid,
      actorName: input.actorName,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      reason: input.reason,
      metadata: input.metadata,
    });
  } catch (err) {
    const normalized = normalizeError(err);
    serverLogger.warn("recordAdminAction failed (non-critical)", {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      error: normalized.message,
    });
  }
}
