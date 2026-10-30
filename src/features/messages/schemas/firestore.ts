import type { BaseDocument } from "../../../_internal/shared/types/base-document";

/**
 * D9 — chat, rebuilt properly.
 *
 * One inbox. A conversation is between exactly TWO users; a product is
 * attached to a MESSAGE as a card (the WhatsApp-reply-quoting shape), never
 * to the thread — a buyer with three questions about three items wants one
 * thread, not three. Not listing-scoped.
 *
 * 🛑 `firestore.rules` is `allow read, write: if false` on every document —
 * there is deliberately no client-side Firestore access anywhere in this
 * codebase. Every mutation here goes through a server route using the Admin
 * SDK; the client never reads Firestore directly for chat, only the RTDB
 * ping channel (see `chat_events` in `database.rules.json`) plus the REST
 * routes it triggers a refetch against.
 */

export const CONVERSATIONS_COLLECTION = "conversations" as const;
export const MESSAGES_SUBCOLLECTION = "messages" as const;

/**
 * The synthetic participant id for the customer-assistant conversation shape
 * (buyer <-> assistant). Not a real `users` document — `createBetween` /
 * `findBetween` on `conversationsRepository` are pure id operations with no
 * lookup against the `users` collection, so a synthetic id works unchanged.
 * Same pattern as the existing `chat_event_${id}` synthetic uid used for RTDB
 * token minting; this one is a single fixed constant rather than per-event,
 * because every buyer's assistant thread shares the same "other side".
 */
export const ASSISTANT_PARTICIPANT_ID = "assistant" as const;

export type ConversationStatus = "active" | "archived";
/**
 * "assistant" widens the original two-human shape (buyer <-> seller) to
 * buyer <-> assistant — same two-participant invariant, just naming who the
 * other side is. `assertParticipant` / `otherParticipant` / `sendMessage` in
 * `actions.ts` are id-based and need no change for this to work; only
 * `openConversationWithAssistant` (new) builds a conversation that uses it.
 */
export type ParticipantRole = "buyer" | "seller" | "assistant";

export interface ConversationLastMessage {
  /** Truncated preview — the full body lives only on the message document. */
  body: string;
  authorId: string;
  at: Date;
  hasAttachments: boolean;
  productId?: string;
}

export interface ConversationDocument extends BaseDocument {
  /** Exactly two. `array-contains` query, bounded by construction. */
  participantIds: string[];
  participantRoles: Record<string, ParticipantRole>;
  lastMessage?: ConversationLastMessage;
  lastMessageAt?: Date;
  /** Read receipts, NOT per-message flags — one timestamp per participant. */
  lastReadAt: Record<string, string>;
  unread: Record<string, number>;
  status: ConversationStatus;
  /** Uids who have blocked the OTHER participant in this thread. */
  blockedBy?: string[];
  messageCount: number;
}

export interface MessageProductRef {
  productId: string;
  title: string;
  image?: string;
  /**
   * 🛑 Required for the card to LINK anywhere correct.
   *
   * Nine listing types have five different detail routes
   * (`/auctions/…`, `/pre-orders/…`, `/random-lots/…`, `/classified/…`, …) and
   * `pluginFor(type).detailRoute()` is the only thing that knows which. A card
   * that hardcodes `/products/{slug}` sends an auction to the standard product
   * page — which is Root Cause #48 exactly: a doc→card mapper dropping
   * `listingType` and the link going wrong because of the one field it lost.
   *
   * Optional only because a message sent before this field existed has none;
   * `normalizeListingType` resolves an absent value to `"standard"`, which is
   * the correct reading for those rows.
   */
  listingType?: string;
  /** Omitted for a guest-gated listing snapshot taken while signed out is not
   * possible here — chat requires auth — but still optional: a product can be
   * archived/deleted between send and render. */
  price?: number;
}

export interface MessageDocument extends BaseDocument {
  conversationId: string;
  authorId: string;
  /** <=2000 chars, PII-stripped and encrypted at rest. */
  body: string;
  /**
   * Client-generated idempotency key. A retry on a flaky connection must not
   * double-post — every chat system has this. Unique per (conversationId,
   * clientMessageId); a duplicate send resolves to the existing message.
   */
  clientMessageId: string;
  /** `/media/` proxy URLs, finalized before the write (never tmp/). */
  attachments?: string[];
  productRef?: MessageProductRef;
  /** Tombstone — removing a message must not renumber the thread under the
   * other participant's read cursor. */
  deletedAt?: Date;
  deletedBy?: string;
}

export const CONVERSATION_FIELDS = {
  ID: "id",
  PARTICIPANT_IDS: "participantIds",
  PARTICIPANT_ROLES: "participantRoles",
  LAST_MESSAGE: "lastMessage",
  LAST_MESSAGE_AT: "lastMessageAt",
  LAST_READ_AT: "lastReadAt",
  UNREAD: "unread",
  STATUS: "status",
  BLOCKED_BY: "blockedBy",
  MESSAGE_COUNT: "messageCount",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const MESSAGE_FIELDS = {
  ID: "id",
  CONVERSATION_ID: "conversationId",
  AUTHOR_ID: "authorId",
  BODY: "body",
  CLIENT_MESSAGE_ID: "clientMessageId",
  ATTACHMENTS: "attachments",
  PRODUCT_REF: "productRef",
  DELETED_AT: "deletedAt",
  DELETED_BY: "deletedBy",
  CREATED_AT: "createdAt",
} as const;

/** Retention stages, measured from `lastMessageAt`. Folded into `notificationPrune`. */
export const CONVERSATION_ACTIVE_DAYS = 30;
export const CONVERSATION_ARCHIVE_DAYS = 7 * 30; // ~7 months
