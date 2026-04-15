/**
 * Chat Repository
 *
 * Manages Firestore chat room metadata documents.
 * Actual messages are stored in Realtime Database for live streaming.
 * This repository provides the persistent record of rooms and participants.
 *
 * Deletion semantics
 * ──────────────────
 * 1-1 rooms:
 *   - `softDeleteForUser(chatId, uid)` adds the uid to `deletedBy`.
 *   - When BOTH participants are in `deletedBy` the room is permanently deleted
 *     (Firestore doc + RTDB subtree) by the same method.
 *   - Until then the room is invisible only to the deleting user.
 *
 * Group rooms (admin-created):
 *   - Only an admin may delete via `adminHardDelete(chatId)`.
 *   - Sets `adminDeleted: true` and deletes the RTDB subtree.
 *   - All participants lose access on next token refresh.
 */

import { getAdminRealtimeDb } from "../../../providers/db-firebase";
import { BaseRepository } from "../../../providers/db-firebase";
import { prepareForFirestore } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import type { ChatRoomCreateInput, ChatRoomDocument } from "../schemas";
import { CHAT_ROOM_COLLECTION } from "../schemas";
import {
  encryptPiiFields,
  decryptPiiFields,
  CHAT_PII_FIELDS,
} from "../../../security";

// Re-export so existing callers that import from this repository continue to work
export type { ChatRoomDocument, ChatRoomCreateInput } from "../schemas";
export { CHAT_ROOM_COLLECTION } from "../schemas";

class ChatRepository extends BaseRepository<ChatRoomDocument> {
  constructor() {
    super(CHAT_ROOM_COLLECTION);
  }

  /** Override mapDoc to auto-decrypt PII on every chat room read */
  protected override mapDoc<D = ChatRoomDocument>(
    snap: import("firebase-admin/firestore").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<ChatRoomDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...CHAT_PII_FIELDS,
    ]) as unknown as D;
  }

  /**
   * Create a new chat room (buyer ↔ seller for an order)
   */
  async create(input: ChatRoomCreateInput): Promise<ChatRoomDocument> {
    const id = input.isGroup
      ? `chat_group_${Date.now()}`
      : `chat_${input.buyerId}_${input.sellerId}_${input.orderId}`;

    const doc: Omit<ChatRoomDocument, "id"> = {
      ...input,
      deletedBy: [],
      adminDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = encryptPiiFields(
      { ...doc } as unknown as Record<string, unknown>,
      [...CHAT_PII_FIELDS],
    ) as typeof doc;

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...doc }; // return plaintext to caller
  }

  /**
   * Find existing room by buyerId + sellerId + orderId (idempotent create)
   */
  async findRoom(
    buyerId: string,
    sellerId: string,
    orderId: string,
  ): Promise<ChatRoomDocument | null> {
    const id = `chat_${buyerId}_${sellerId}_${orderId}`;
    return this.findById(id);
  }

  /**
   * Get all chat room IDs that the user can currently access.
   * Excludes rooms where the user has soft-deleted or where adminDeleted=true.
   */
  async getChatIdsForUser(userId: string): Promise<string[]> {
    try {
      const [asBuyer, asSeller] = await Promise.all([
        this.getCollection()
          .where("buyerId", "==", userId)
          .where("adminDeleted", "==", false)
          .get(),
        this.getCollection()
          .where("sellerId", "==", userId)
          .where("adminDeleted", "==", false)
          .get(),
      ]);

      const ids = new Set<string>();
      [...asBuyer.docs, ...asSeller.docs].forEach((d) => {
        const deletedBy: string[] = d.data().deletedBy ?? [];
        if (!deletedBy.includes(userId)) {
          ids.add(d.id);
        }
      });
      return Array.from(ids);
    } catch (error) {
      throw new DatabaseError(
        `Failed to get chatIds for user: ${userId}`,
        error,
      );
    }
  }

  /**
   * List all visible rooms for a user (most recent first).
   * Excludes rooms the user has deleted and admin-deleted group rooms.
   */
  async listForUser(userId: string): Promise<ChatRoomDocument[]> {
    try {
      const [asBuyer, asSeller] = await Promise.all([
        this.getCollection()
          .where("buyerId", "==", userId)
          .where("adminDeleted", "==", false)
          .orderBy("updatedAt", "desc")
          .get(),
        this.getCollection()
          .where("sellerId", "==", userId)
          .where("adminDeleted", "==", false)
          .orderBy("updatedAt", "desc")
          .get(),
      ]);

      const seen = new Set<string>();
      const rooms: ChatRoomDocument[] = [];
      [...asBuyer.docs, ...asSeller.docs].forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          const data = d.data() as Omit<ChatRoomDocument, "id">;
          const deletedBy: string[] = data.deletedBy ?? [];
          // Only include rooms the user hasn't personally deleted
          if (!deletedBy.includes(userId)) {
            rooms.push(
              decryptPiiFields(
                { id: d.id, ...data } as unknown as Record<string, unknown>,
                [...CHAT_PII_FIELDS],
              ) as unknown as ChatRoomDocument,
            );
          }
        }
      });

      rooms.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      return rooms;
    } catch (error) {
      throw new DatabaseError(
        `Failed to list rooms for user: ${userId}`,
        error,
      );
    }
  }

  /**
   * Update last message preview (called after a new message is sent)
   */
  async updateLastMessage(chatId: string, message: string): Promise<void> {
    try {
      await this.db
        .collection(this.collection)
        .doc(chatId)
        .update(
          prepareForFirestore({
            lastMessage: message.slice(0, 80),
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          }),
        );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update last message for room: ${chatId}`,
        error,
      );
    }
  }

  /**
   * Soft-delete a 1-1 chat room for a single user.
   *
   * - Adds `uid` to `deletedBy`.
   * - If both participants have now deleted → permanently deletes the
   *   Firestore document and the RTDB subtree.
   *
   * @returns `"hidden"` if the room was only hidden for this user,
   *          `"deleted"` if it was permanently purged.
   */
  async softDeleteForUser(
    chatId: string,
    uid: string,
  ): Promise<"hidden" | "deleted"> {
    try {
      const docRef = this.db.collection(this.collection).doc(chatId);
      const snap = await docRef.get();
      if (!snap.exists) return "deleted";

      const data = snap.data() as ChatRoomDocument;
      const deletedBy = Array.from(new Set([...(data.deletedBy ?? []), uid]));

      const bothDeleted =
        !data.isGroup &&
        deletedBy.includes(data.buyerId) &&
        deletedBy.includes(data.sellerId);

      if (bothDeleted) {
        // Permanently remove Firestore doc + RTDB messages
        await docRef.delete();
        try {
          await getAdminRealtimeDb().ref(`/chat/${chatId}`).remove();
        } catch {
          // Non-fatal — RTDB subtree cleanup is best-effort
        }
        return "deleted";
      }

      // Otherwise just record this user's deletion
      await docRef.update(
        prepareForFirestore({ deletedBy, updatedAt: new Date() }),
      );
      return "hidden";
    } catch (error) {
      throw new DatabaseError(
        `Failed to soft-delete room ${chatId} for user ${uid}`,
        error,
      );
    }
  }

  /**
   * Admin hard-delete for group chats.
   *
   * Sets `adminDeleted: true` in Firestore (revokes all access) and
   * removes the RTDB subtree.
   */
  async adminHardDelete(chatId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collection)
        .doc(chatId)
        .update(
          prepareForFirestore({ adminDeleted: true, updatedAt: new Date() }),
        );
      try {
        await getAdminRealtimeDb().ref(`/chat/${chatId}`).remove();
      } catch {
        // Non-fatal
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to admin-delete group room ${chatId}`,
        error,
      );
    }
  }
}

export const chatRepository = new ChatRepository();
