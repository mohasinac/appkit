import "server-only";

/**
 * Notification Repository
 *
 * Handles all Firestore operations for the notifications collection.
 * Used exclusively by server-side API routes (Firebase Admin SDK).
 */

import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import {
  NotificationDocument,
  NotificationCreateInput,
  NOTIFICATIONS_COLLECTION,
  NOTIFICATION_FIELDS,
} from "../schemas";
import { serverLogger } from "../../../monitoring";
import { serverTimestamp } from "../../../contracts/field-ops";
import type {
  SieveModel,
  FirebaseSieveFields,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";

export class NotificationRepository extends BaseRepository<NotificationDocument> {
  constructor() {
    super(NOTIFICATIONS_COLLECTION);
  }

  /**
   * Sieve field definitions for admin/user paginated listing
   */
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    userId: { canFilter: true, canSort: false },
    type: { canFilter: true, canSort: false },
    priority: { canFilter: true, canSort: true },
    isRead: { canFilter: true, canSort: false },
    relatedType: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
  };

  /**
   * Admin-level paginated notification list (all users).
   */
  async list(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<NotificationDocument>> {
    return this.sieveQuery<NotificationDocument>(
      model,
      NotificationRepository.SIEVE_FIELDS,
    );
  }

  /**
   * User-scoped paginated notification list.
   */
  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<NotificationDocument>> {
    return this.sieveQuery<NotificationDocument>(
      model,
      NotificationRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(
          NOTIFICATION_FIELDS.USER_ID,
          "==",
          userId,
        ),
      },
    );
  }

  /**
   * Find all notifications for a user, newest first.
   */
  async findByUser(
    userId: string,
    limit = 20,
  ): Promise<NotificationDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(NOTIFICATION_FIELDS.USER_ID, "==", userId)
        .orderBy(NOTIFICATION_FIELDS.CREATED_AT, "desc")
        .limit(limit)
        .get();

      return snap.docs.map((doc) => this.mapDoc<NotificationDocument>(doc));
    } catch (error) {
      serverLogger.error("Failed to fetch user notifications", {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(NOTIFICATION_FIELDS.USER_ID, "==", userId)
        .where(NOTIFICATION_FIELDS.IS_READ, "==", false)
        .count()
        .get();

      return snap.data().count;
    } catch (error) {
      serverLogger.error("Failed to count unread notifications", {
        userId,
        error,
      });
      return 0;
    }
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<NotificationDocument | null> {
    try {
      const now = new Date();
      await this.getCollection()
        .doc(id)
        .update(
          prepareForFirestore({
            [NOTIFICATION_FIELDS.IS_READ]: true,
            [NOTIFICATION_FIELDS.READ_AT]: now,
            [NOTIFICATION_FIELDS.UPDATED_AT]: now,
          }),
        );

      return this.findById(id);
    } catch (error) {
      serverLogger.error("Failed to mark notification as read", { id, error });
      throw error;
    }
  }

  /**
   * Mark all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(NOTIFICATION_FIELDS.USER_ID, "==", userId)
        .where(NOTIFICATION_FIELDS.IS_READ, "==", false)
        .get();

      if (snap.empty) return 0;

      const now = new Date();
      const batch = this.db.batch();

      snap.docs.forEach((doc) => {
        batch.update(
          doc.ref,
          prepareForFirestore({
            [NOTIFICATION_FIELDS.IS_READ]: true,
            [NOTIFICATION_FIELDS.READ_AT]: now,
            [NOTIFICATION_FIELDS.UPDATED_AT]: now,
          }),
        );
      });

      await batch.commit();
      serverLogger.info("Marked all notifications as read", {
        userId,
        count: snap.size,
      });
      return snap.size;
    } catch (error) {
      serverLogger.error("Failed to mark all notifications as read", {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Create a new notification.
   */
  async create(input: NotificationCreateInput): Promise<NotificationDocument> {
    try {
      const now = new Date();
      const data = prepareForFirestore({
        ...input,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      });

      const ref = this.getCollection().doc();
      await ref.set(data);

      serverLogger.info("Notification created", {
        id: ref.id,
        userId: input.userId,
        type: input.type,
      });

      return { id: ref.id, ...data } as NotificationDocument;
    } catch (error) {
      serverLogger.error("Failed to create notification", { error });
      throw error;
    }
  }

  /**
   * Delete a notification by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().doc(id).delete();
      serverLogger.info("Notification deleted", { id });
    } catch (error) {
      serverLogger.error("Failed to delete notification", { id, error });
      throw error;
    }
  }

  /**
   * Delete all notifications for a user.
   */
  async deleteAllForUser(userId: string): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(NOTIFICATION_FIELDS.USER_ID, "==", userId)
        .get();

      if (snap.empty) return 0;

      const batch = this.db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      serverLogger.info("Deleted all user notifications", {
        userId,
        count: snap.size,
      });
      return snap.size;
    } catch (error) {
      serverLogger.error("Failed to delete all user notifications", {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Cloud Functions: return refs of old read notifications for TTL-based cleanup.
   */
  async getOldReadRefs(ttlDays = 30): Promise<DocumentReference[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ttlDays);
    const snap = await this.getCollection()
      .where(NOTIFICATION_FIELDS.IS_READ, "==", true)
      .where(NOTIFICATION_FIELDS.CREATED_AT, "<", cutoff)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }

  /**
   * Cloud Functions: stage notification creation into a caller-owned WriteBatch.
   * Returns the new DocumentReference synchronously for chaining.
   */
  createInBatch(
    batch: WriteBatch,
    input: NotificationCreateInput,
  ): DocumentReference {
    const ref = this.getCollection().doc() as unknown as DocumentReference;
    batch.create(
      ref as unknown as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        id: ref.id,
        ...input,
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return ref;
  }
}

export const notificationRepository = new NotificationRepository();
