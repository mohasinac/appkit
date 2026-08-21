"use client";

/**
 * ViewNotificationModal — full notification details in a Modal overlay.
 * Mirrors ViewReviewModal's shape (appkit/src/features/reviews/components/ReviewModal.tsx).
 * AdminNotificationsView was previously list-only — no way to see a
 * notification's full body/payload/link, only Resend/Delete row actions.
 */

import { Anchor, Badge, Div, Modal, Row, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";

export interface NotificationEntryDetail {
  id: string;
  userId: string;
  type: string;
  priority?: string;
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt?: string;
}

export interface ViewNotificationModalProps {
  notification: NotificationEntryDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewNotificationModal({ notification, isOpen, onClose }: ViewNotificationModalProps) {
  if (!notification) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notification Details">
      <Stack gap="md">
        <Row justify="between" align="center">
          <Row gap="sm" align="center">
            <Badge variant="default">{notification.type}</Badge>
            <Badge variant={notification.isRead ? "default" : "info"}>
              {notification.isRead ? "Read" : "Unread"}
            </Badge>
          </Row>
          {notification.createdAt && (
            <Text size="xs" color="muted">{new Date(notification.createdAt).toLocaleString()}</Text>
          )}
        </Row>

        <Stack gap="xs">
          <Text size="lg" weight="semibold">{notification.title}</Text>
          <Text size="sm" color="muted">{notification.message}</Text>
        </Stack>

        {notification.imageUrl && (
          <Div className="h-32 w-full" rounded="lg" overflow="hidden">
            <MediaImage src={notification.imageUrl} alt={notification.title} size="card" />
          </Div>
        )}

        <Stack gap="xs">
          <Row justify="between">
            <Text size="sm" color="muted">Recipient</Text>
            <Text size="sm" weight="medium">{notification.userId}</Text>
          </Row>
          {notification.relatedType && (
            <Row justify="between">
              <Text size="sm" color="muted">Related to</Text>
              <Text size="sm" weight="medium">
                {notification.relatedType}: {notification.relatedId}
              </Text>
            </Row>
          )}
        </Stack>

        {notification.actionUrl && (
          <Row justify="end">
            <Anchor href={notification.actionUrl} tone="brand" weight="semibold" size="sm">
              {notification.actionLabel ?? "Open link"} →
            </Anchor>
          </Row>
        )}
      </Stack>
    </Modal>
  );
}
