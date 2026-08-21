"use client";

/**
 * ViewAuditLogEntryModal — full audit-log entry details in a Modal overlay.
 * Mirrors ViewReviewModal's shape (appkit/src/features/reviews/components/ReviewModal.tsx).
 */

import { Badge, Code, Div, Modal, Row, Stack, Text } from "../../../ui";
import type { JsonValue } from "../../../schemas/types";

export interface AuditLogEntryDetail {
  id: string;
  actorUid: string;
  actorName?: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  reason?: string;
  metadata?: Record<string, JsonValue>;
  createdAt?: string;
}

export interface ViewAuditLogEntryModalProps {
  entry: AuditLogEntryDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  user_hard_ban: "User hard-banned",
  user_soft_ban: "User soft-banned",
  user_unban: "User unbanned",
  checkout_bypass: "Admin checkout bypass",
  coupon_update: "Coupon updated",
  payout_mark_paid: "Payout marked paid",
  store_status_change: "Store status changed",
  user_role_change: "User role changed",
};

export function ViewAuditLogEntryModal({ entry, isOpen, onClose }: ViewAuditLogEntryModalProps) {
  if (!entry) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Log Entry">
      <Stack gap="md">
        <Row justify="between" align="center">
          <Badge variant="default">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
          {entry.createdAt && (
            <Text size="xs" color="muted">{new Date(entry.createdAt).toLocaleString()}</Text>
          )}
        </Row>

        <Stack gap="xs">
          <Row justify="between">
            <Text size="sm" color="muted">Actor</Text>
            <Text size="sm" weight="medium">{entry.actorName ?? entry.actorUid}</Text>
          </Row>
          <Row justify="between">
            <Text size="sm" color="muted">Target</Text>
            <Text size="sm" weight="medium">
              {entry.targetType}: {entry.targetLabel ?? entry.targetId}
            </Text>
          </Row>
        </Stack>

        {entry.reason && (
          <Div rounded="lg" padding="sm" surface="muted" border="default">
            <Text size="xs" weight="semibold" color="muted">Reason</Text>
            <Text size="sm">{entry.reason}</Text>
          </Div>
        )}

        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <Div rounded="lg" padding="sm" surface="muted" border="default">
            <Text size="xs" weight="semibold" color="muted" className="mb-1">Metadata</Text>
            <Code size="xs" className="block whitespace-pre-wrap font-mono">
              {JSON.stringify(entry.metadata, null, 2)}
            </Code>
          </Div>
        )}
      </Stack>
    </Modal>
  );
}
