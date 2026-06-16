/**
 * ConversationsRepository — buyer↔seller messaging.
 *
 * One document per buyer×storeId×productId tuple. Messages are embedded in
 * the document as an array (good up to ~200 entries; migrate to subcollection
 * later if threads explode).
 *
 * All mutations are transactional so concurrent writes don't drop messages
 * or unread counters.
 */

import { getAdminDb } from "../../../providers/db-firebase";
import { serverLogger } from "../../../monitoring";
import { CONVERSATION_FIELDS } from "../../../constants/field-names";
import type { JsonValue } from "../../../schemas/types";
import {
  CONVERSATIONS_COLLECTION,
  type ConversationDocument,
  type ConversationMessage,
} from "../schemas/firestore";

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
    return (raw as { toDate: () => Date }).toDate();
  }
  if (typeof raw === "string" || typeof raw === "number") return new Date(raw);
  return new Date();
}

function normaliseMessage(raw: unknown): ConversationMessage {
  const r = (raw ?? {}) as Record<string, JsonValue>;
  return {
    id: String(r.id ?? ""),
    senderId: String(r.senderId ?? ""),
    senderRole: (r.senderRole as ConversationMessage["senderRole"]) ?? "buyer",
    body: String(r.body ?? ""),
    isRead: r.isRead === true,
    sentAt: toDate(r.sentAt),
    attachments: Array.isArray(r.attachments)
      ? (r.attachments as string[])
      : undefined,
  };
}

function normaliseDoc(id: string, raw: Record<string, JsonValue>): ConversationDocument {
  return {
    id,
    buyerId: String(raw.buyerId ?? ""),
    buyerDisplayName: String(raw.buyerDisplayName ?? ""),
    storeId: String(raw.storeId ?? ""),
    storeName: String(raw.storeName ?? ""),
    sellerDisplayName: String(raw.sellerDisplayName ?? ""),
    productId: typeof raw.productId === "string" ? raw.productId : undefined,
    productTitle: typeof raw.productTitle === "string" ? raw.productTitle : undefined,
    messages: Array.isArray(raw.messages) ? raw.messages.map(normaliseMessage) : [],
    lastMessage: String(raw.lastMessage ?? ""),
    lastMessageAt: toDate(raw.lastMessageAt),
    unreadBuyer: typeof raw.unreadBuyer === "number" ? raw.unreadBuyer : 0,
    unreadSeller: typeof raw.unreadSeller === "number" ? raw.unreadSeller : 0,
    status: (raw.status as ConversationDocument["status"]) ?? "active",
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export class ConversationFullError extends Error {
  readonly code = "CONVERSATION_FULL" as const;
}

export class ConversationsRepository {
  private collection() {
    return getAdminDb().collection(CONVERSATIONS_COLLECTION);
  }

  /**
   * Find an existing buyer×store×product conversation or create a new one.
   * Idempotent — safe to call on every "Contact Seller" click.
   */
  async findOrCreateByContext(params: {
    buyerId: string;
    buyerDisplayName: string;
    storeId: string;
    storeName: string;
    sellerDisplayName: string;
    productId?: string;
    productTitle?: string;
  }): Promise<ConversationDocument> {
    const db = getAdminDb();
    const coll = this.collection();
    const { buyerId, storeId, productId } = params;

    // Stable composite key: buyerId + storeId + (productId | "general")
    const productKey = productId ?? "general";
    const stableId = `conv-${buyerId}-${storeId}-${productKey}`;
    const ref = coll.doc(stableId);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        return normaliseDoc(snap.id, snap.data() ?? {});
      }
      const now = new Date();
      const newDoc: Omit<ConversationDocument, "id"> = {
        buyerId: params.buyerId,
        buyerDisplayName: params.buyerDisplayName,
        storeId: params.storeId,
        storeName: params.storeName,
        sellerDisplayName: params.sellerDisplayName,
        productId: params.productId,
        productTitle: params.productTitle,
        messages: [],
        lastMessage: "",
        lastMessageAt: now,
        unreadBuyer: 0,
        unreadSeller: 0,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      tx.set(ref, newDoc);
      return normaliseDoc(stableId, newDoc as Record<string, JsonValue>);
    });
  }

  async findById(id: string): Promise<ConversationDocument | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    return normaliseDoc(snap.id, snap.data() ?? {});
  }

  async listByBuyer(buyerId: string): Promise<ConversationDocument[]> {
    const snap = await this.collection()
      .where(CONVERSATION_FIELDS.BUYER_ID, "==", buyerId)
      .orderBy(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "desc")
      .get();
    return snap.docs.map((d) => normaliseDoc(d.id, d.data()));
  }

  async listByStore(storeId: string): Promise<ConversationDocument[]> {
    const snap = await this.collection()
      .where(CONVERSATION_FIELDS.STORE_ID, "==", storeId)
      .orderBy(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "desc")
      .get();
    return snap.docs.map((d) => normaliseDoc(d.id, d.data()));
  }

  /**
   * Append a message to a conversation in a transaction. Bumps the counterparty
   * unread counter; updates lastMessage / lastMessageAt / updatedAt.
   */
  async appendMessage(
    conversationId: string,
    msg: Omit<ConversationMessage, "id" | "sentAt" | "isRead"> & {
      id?: string;
      sentAt?: Date;
    },
  ): Promise<ConversationDocument> {
    const db = getAdminDb();
    const ref = this.collection().doc(conversationId);
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error("Conversation not found");
        }
        const data = snap.data() ?? {};
        const existing = Array.isArray(data.messages)
          ? data.messages.map(normaliseMessage)
          : [];
        const now = msg.sentAt ?? new Date();
        const newMessage: ConversationMessage = {
          id: msg.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          senderId: msg.senderId,
          senderRole: msg.senderRole,
          body: msg.body,
          isRead: false,
          sentAt: now,
          attachments: msg.attachments,
        };
        const nextMessages = [...existing, newMessage];
        const unreadBuyer =
          msg.senderRole === "seller"
            ? (typeof data.unreadBuyer === "number" ? data.unreadBuyer : 0) + 1
            : (typeof data.unreadBuyer === "number" ? data.unreadBuyer : 0);
        const unreadSeller =
          msg.senderRole === "buyer"
            ? (typeof data.unreadSeller === "number" ? data.unreadSeller : 0) + 1
            : (typeof data.unreadSeller === "number" ? data.unreadSeller : 0);
        const patch = {
          messages: nextMessages,
          lastMessage: msg.body,
          lastMessageAt: now,
          unreadBuyer,
          unreadSeller,
          updatedAt: now,
        };
        tx.update(ref, patch);
        return normaliseDoc(conversationId, { ...data, ...patch });
      });
    } catch (error) {
      serverLogger.error("ConversationsRepository.appendMessage error", {
        conversationId,
        error,
      });
      throw error;
    }
  }

  /**
   * Zero out the unread counter for one party. Also flips `isRead` on the
   * embedded messages sent by the other party so the seller side can see what
   * the buyer has already read.
   */
  async markRead(
    conversationId: string,
    role: "buyer" | "seller",
  ): Promise<void> {
    const db = getAdminDb();
    const ref = this.collection().doc(conversationId);
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const data = snap.data() ?? {};
        const messages = Array.isArray(data.messages)
          ? data.messages.map(normaliseMessage)
          : [];
        // role="buyer" means the buyer just opened the chat → mark all
        // seller-sent messages read.
        const otherRole = role === "buyer" ? "seller" : "buyer";
        const nextMessages = messages.map((m) =>
          m.senderRole === otherRole && !m.isRead ? { ...m, isRead: true } : m,
        );
        tx.update(ref, {
          messages: nextMessages,
          [role === "buyer" ? "unreadBuyer" : "unreadSeller"]: 0,
          updatedAt: new Date(),
        });
      });
    } catch (error) {
      serverLogger.error("ConversationsRepository.markRead error", {
        conversationId,
        role,
        error,
      });
      throw error;
    }
  }
}

export const conversationsRepository = new ConversationsRepository();
