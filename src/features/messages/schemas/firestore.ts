/**
 * Messages / Conversations Firestore Document Types & Constants
 *
 * Architecture: one `conversations` document per buyer↔seller pair on a product.
 * Messages are embedded as an array for seed purposes; production can migrate to
 * a subcollection when the thread exceeds ~200 messages.
 */

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderRole: "buyer" | "seller";
  body: string;
  isRead: boolean;
  sentAt: Date;
  attachments?: string[];
}

export interface ConversationDocument {
  id: string;
  buyerId: string;
  buyerDisplayName: string;
  sellerId: string;
  sellerDisplayName: string;
  storeId: string;
  storeName: string;
  productId?: string;
  productTitle?: string;
  messages: ConversationMessage[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadBuyer: number;
  unreadSeller: number;
  status: "active" | "archived" | "blocked";
  createdAt: Date;
  updatedAt: Date;
}

export const CONVERSATIONS_COLLECTION = "conversations" as const;

export const CONVERSATIONS_INDEXED_FIELDS = [
  "buyerId",
  "sellerId",
  "storeId",
  "productId",
  "status",
  "lastMessageAt",
  "createdAt",
] as const;
