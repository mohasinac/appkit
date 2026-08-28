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
import { encryptPiiFields, decryptPiiFields } from "../../../security/pii-encrypt";
import { CONVERSATION_PII_FIELDS } from "../../../security/pii-schemas";
import { serverLogger } from "../../../monitoring";
import { CONVERSATION_FIELDS } from "../../../constants/field-names";
import type { FirestoreDocument, JsonValue } from "../../../schemas/types";
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

function normaliseMessage(raw: JsonValue): ConversationMessage {
  const r = (raw ?? {}) as FirestoreDocument;
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

function normaliseDoc(id: string, raw: object): ConversationDocument {
  // Decrypt here rather than at the six call sites: this is the one function
  // every read path already goes through, so a new reader cannot forget it.
  // `markRead` deliberately does NOT decrypt — it reads raw messages, flips
  // isRead and writes them straight back, so ciphertext round-trips untouched.
  const r = decryptPiiFields(raw, [...CONVERSATION_PII_FIELDS]) as FirestoreDocument;
  return {
    id,
    buyerId: String(r.buyerId ?? ""),
    buyerDisplayName: String(r.buyerDisplayName ?? ""),
    storeId: String(r.storeId ?? ""),
    storeName: String(r.storeName ?? ""),
    sellerDisplayName: String(r.sellerDisplayName ?? ""),
    productId: typeof r.productId === "string" ? r.productId : undefined,
    productTitle: typeof r.productTitle === "string" ? r.productTitle : undefined,
    messages: Array.isArray(r.messages) ? r.messages.map(normaliseMessage) : [],
    lastMessage: String(r.lastMessage ?? ""),
    lastMessageAt: toDate(r.lastMessageAt),
    unreadBuyer: typeof r.unreadBuyer === "number" ? r.unreadBuyer : 0,
    unreadSeller: typeof r.unreadSeller === "number" ? r.unreadSeller : 0,
    status: (r.status as ConversationDocument["status"]) ?? "active",
    createdAt: toDate(r.createdAt),
    updatedAt: toDate(r.updatedAt),
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
      const encryptedDoc = encryptPiiFields(newDoc, [...CONVERSATION_PII_FIELDS]);
      tx.set(ref, encryptedDoc);
      return normaliseDoc(stableId, encryptedDoc);
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
   * Conversation ids this user may subscribe to, for the RTDB `conversationIds`
   * custom-token claim.
   *
   * 🛑 This claim previously had NO ISSUER ANYWHERE. The `chats/$conversationId`
   * rule requires `auth.token.conversationIds[$conversationId] == true`, but
   * `/api/realtime/token` only ever issued `chatIds`, built by
   * `chatRepository.getChatIdsForUser()` over the **`chatRooms`** collection —
   * a different collection with different document ids. So the buyer↔seller
   * live-message channel was denied for every user, and both subscribing hooks
   * swallowed the permission error (one into `setIsConnected(false)`, one into
   * a literal `// ignore`). Messages only ever appeared for the sender, via an
   * unrelated `refetch()` after send.
   *
   * `.select()` with no fields fetches ids only — the document bodies are not
   * needed and this runs on every token issue.
   *
   * @param limit hard cap. Firebase custom claims are limited to 1000 BYTES
   *   total; each entry costs roughly `"<20-char id>":true,` ≈ 28 bytes, so a
   *   user in hundreds of conversations would make `createCustomToken` throw
   *   and take the whole route down (see the route's own comment).
   */
  async getConversationIdsForUser(
    userId: string,
    storeIds: readonly string[] = [],
    limit = 25,
  ): Promise<string[]> {
    const queries = [
      this.collection()
        .where(CONVERSATION_FIELDS.BUYER_ID, "==", userId)
        .orderBy(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "desc")
        .limit(limit)
        .select()
        .get(),
      // Firestore `in` caps at 30 values; a seller with more stores than that
      // is not a shape this app produces.
      ...(storeIds.length > 0
        ? [
            this.collection()
              .where(CONVERSATION_FIELDS.STORE_ID, "in", storeIds.slice(0, 30))
              .orderBy(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "desc")
              .limit(limit)
              .select()
              .get(),
          ]
        : []),
    ];

    const snaps = await Promise.all(queries);
    const ids = new Set<string>();
    for (const snap of snaps) {
      for (const doc of snap.docs) ids.add(doc.id);
    }
    // Most-recent-first is already the sort order; truncating here keeps the
    // claim inside the byte budget when a user is both buyer and seller.
    return [...ids].slice(0, limit);
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
        // Encrypt before the write; normaliseDoc decrypts on the way back out,
        // so the caller still receives plaintext.
        const encryptedPatch = encryptPiiFields(patch, [...CONVERSATION_PII_FIELDS]);
        tx.update(ref, encryptedPatch);
        return normaliseDoc(conversationId, { ...data, ...encryptedPatch });
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
