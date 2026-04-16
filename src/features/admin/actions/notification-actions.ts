/**
 * Notification Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { notificationRepository } from "../repository/notification.repository";
import type { NotificationDocument } from "../schemas";

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  await notificationRepository.markAsRead(id);
}

/**
 * Mark all notifications as read for a given user.
 * Returns the number of notifications updated.
 */
export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  return notificationRepository.markAllAsRead(userId);
}

/**
 * Delete a single notification by id.
 */
export async function deleteNotification(id: string): Promise<void> {
  await notificationRepository.delete(id);
}

/**
 * List notifications for a user with unread count.
 */
export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<{ notifications: NotificationDocument[]; unreadCount: number }> {
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findByUser(userId, limit),
    notificationRepository.getUnreadCount(userId),
  ]);
  return { notifications, unreadCount };
}

/**
 * Get the unread notification count for a user.
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  return notificationRepository.getUnreadCount(userId);
}
