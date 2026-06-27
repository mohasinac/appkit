/**
 * Messages / Conversations Firestore Document Types & Constants
 *
 * Architecture: one `conversations` document per buyer↔seller pair on a product.
 * Messages are embedded as an array for seed purposes; production can migrate to
 * a subcollection when the thread exceeds ~200 messages.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export interface ConversationMessage {
  id: string; // audit-schema-base-ok: embedded array element, not a Firestore collection root
  senderId: string;
  senderRole: "buyer" | "seller";
  body: string;
  isRead: boolean;
  sentAt: Date;
  attachments?: string[];
}

export interface ConversationDocument extends BaseDocument {
  buyerId: string;
  buyerDisplayName: string;
  storeId: string;
  storeName: string;
  sellerDisplayName: string;
  productId?: string;
  productTitle?: string;
  messages: ConversationMessage[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadBuyer: number;
  unreadSeller: number;
  status: "active" | "archived" | "blocked";
}

export const CONVERSATIONS_COLLECTION = "conversations" as const;

export const CONVERSATIONS_INDEXED_FIELDS = [
  "buyerId",
  "storeId",
  "productId",
  "status",
  "lastMessageAt",
  "createdAt",
] as const;
