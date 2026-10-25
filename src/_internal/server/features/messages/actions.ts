import { normalizeError } from "../../../../errors/normalize";
import { AuthorizationError, NotFoundError, ValidationError } from "../../../../errors";
import { getAdminAuth, getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { RTDB_PATHS } from "../../../../providers/db-firebase/rtdb-paths";
import { serverLogger } from "../../../../monitoring";
import { userRepository } from "../../../../features/auth/repository/user.repository";
import { isSoftBanned } from "../../../../features/auth/server/checkSoftBan";
import { isSellerUser } from "../../../../features/auth/role-predicates";
import { conversationsRepository } from "../../../../features/messages/repository/conversations.repository";
import { storeRepository } from "../../../../features/stores/repository/store.repository";
import {
  createMessage,
  listMessages,
  softDeleteMessage,
  deleteAllMessages,
  listAllAttachmentUrls,
} from "../../../../features/messages/repository/messages.repository";
import type {
  ConversationDocument,
  MessageDocument,
  MessageProductRef,
  ParticipantRole,
} from "../../../../features/messages/schemas/firestore";
import { finalizeStagedMediaArray } from "../../../../features/media/finalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { productRepository } from "../../../../features/products/repository/products.repository";
import { normalizeListingType } from "../../../../features/products/utils/listing-type";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";

const MESSAGE_MAX_LENGTH = 2000;

/**
 * Off by default — `undefined` reads as OFF, never a default-true `??`. A
 * real setting with a real cost: the feature was deleted once already for
 * shipping broken, and re-enabling it site-wide without an explicit opt-in
 * would repeat that without the proof-of-value this plan asks for first.
 */
async function assertChatEnabled(): Promise<void> {
  const settings = await siteSettingsRepository.getSingleton();
  if (settings?.chat?.enabled !== true) {
    throw new AuthorizationError("Messaging is not currently available.");
  }
}

/**
 * Strips the three obvious PII shapes from a chat message before it is
 * written. Promoted here from the item-request replies route per D9's spec —
 * same ordering fix (specific-before-general: UPI scheme, then anything with a
 * TLD dot is an email, then any remaining `token@token` has no dot and is
 * therefore a VPA, only then bare digit runs), because that ordering IS the
 * whole fix (F1 #5 — the old order let the email rule eat UPI-shaped VPAs and
 * the phone rule mangle `9876543210@upi` before the UPI rule ever saw it).
 */
export function stripPii(input: string): string {
  return input
    .replace(/upi:\/\/\S+/gi, "[UPI removed]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]")
    .replace(/[\w.-]{2,}@[\w-]{2,}/g, "[UPI removed]")
    .replace(/\b\d{10,12}\b/g, "[number removed]");
}

function otherParticipant(conversation: ConversationDocument, userId: string): string {
  const other = conversation.participantIds.find((id) => id !== userId);
  if (!other) {
    throw new ValidationError("Conversation has no other participant.");
  }
  return other;
}

function assertParticipant(conversation: ConversationDocument, userId: string): void {
  if (!conversation.participantIds.includes(userId)) {
    throw new AuthorizationError("You are not a participant in this conversation.");
  }
}

/** Shared `findById` + not-found throw — every mutator below needs both. */
async function requireConversation(conversationId: string): Promise<ConversationDocument> {
  const conversation = await conversationsRepository.findById(conversationId);
  if (!conversation) throw new NotFoundError("Conversation not found.");
  return conversation;
}

/**
 * 🛑 `send_messages` is a live `BannedAction` with no reader anywhere in the
 * codebase (F1 #6) — an admin can set it today and nothing checks it. This is
 * the missing reader, in the domain function per the same precedent
 * `assertCanBid` set for `place_bids`: enforcement belongs here so every
 * caller (route, future job) is covered by construction.
 */
async function assertCanSendMessages(userId: string): Promise<void> {
  const profile = await userRepository.findById(userId);
  if (profile && isSoftBanned(profile, "send_messages")) {
    const ban = profile.softBans?.find((b) => b.action === "send_messages");
    throw new AuthorizationError(
      `You are restricted from sending messages. Reason: ${ban?.reason ?? "Policy violation"}.`,
    );
  }
}

export async function createOrOpenConversation(
  userId: string,
  otherUserId: string,
): Promise<ConversationDocument> {
  await assertChatEnabled();
  if (userId === otherUserId) {
    throw new ValidationError("Cannot start a conversation with yourself.");
  }

  const existing = await conversationsRepository.findBetween(userId, otherUserId);
  if (existing) return existing;

  const [me, other] = await Promise.all([
    userRepository.findById(userId),
    userRepository.findById(otherUserId),
  ]);
  if (!other) {
    throw new NotFoundError("The other participant could not be found.");
  }

  const roleFor = (u: typeof me): ParticipantRole => (isSellerUser(u) ? "seller" : "buyer");
  const roles: Record<string, ParticipantRole> = {
    [userId]: roleFor(me),
    [otherUserId]: roleFor(other),
  };

  return conversationsRepository.createBetween(userId, otherUserId, roles);
}

/**
 * D11 surfaced this gap: the backend had a full create/open path and no UI
 * entry point ever called it — "Message Seller" did not exist anywhere. A
 * product/store page knows `storeId` (the slug), never the seller's uid
 * (Store Identity Architecture: storeId=storeSlug, ownerId=Auth UID), so the
 * resolution happens here, server-side, rather than piping ownerId through
 * every page that might want this button.
 */
export async function openConversationWithSeller(
  buyerId: string,
  storeId: string,
): Promise<ConversationDocument> {
  const store = await storeRepository.findById(storeId);
  if (!store) throw new NotFoundError("Store not found.");
  if (store.ownerId === buyerId) {
    throw new ValidationError("You cannot message your own store.");
  }
  return createOrOpenConversation(buyerId, store.ownerId);
}

export async function listConversationsForUser(
  userId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ items: ConversationDocument[]; nextCursor: string | null }> {
  return conversationsRepository.listForUser(userId, opts);
}

export async function listMessagesForConversation(
  userId: string,
  conversationId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ items: MessageDocument[]; nextCursor: string | null }> {
  const conversation = await requireConversation(conversationId);
  assertParticipant(conversation, userId);
  return listMessages(conversationId, opts);
}

export interface SendMessageInput {
  conversationId: string;
  authorId: string;
  body: string;
  clientMessageId: string;
  /** Already-uploaded `/media/` proxy URLs, still possibly in tmp/. */
  attachments?: string[];
  productId?: string;
}

/**
 * The one writer path. Every mutation here runs through the Admin SDK — the
 * old feature attempted client writes against `.write: false` and that is
 * precisely what made it inert.
 */
export async function sendMessage(input: SendMessageInput): Promise<MessageDocument> {
  await assertChatEnabled();
  const conversation = await requireConversation(input.conversationId);
  assertParticipant(conversation, input.authorId);

  const recipientId = otherParticipant(conversation, input.authorId);
  if (conversation.blockedBy?.includes(recipientId)) {
    // The recipient blocked the sender — a blocked sender gets a clear reason,
    // not a message that silently vanishes into a thread nobody reads.
    throw new AuthorizationError("The other participant is not accepting messages from you.");
  }

  await assertCanSendMessages(input.authorId);

  const trimmed = input.body.trim();
  if (!trimmed) throw new ValidationError("Message cannot be empty.");
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new ValidationError(`Message cannot exceed ${MESSAGE_MAX_LENGTH} characters.`);
  }
  const cleaned = stripPii(trimmed);

  // Attachments finalized BEFORE the write — the working pattern is
  // review-actions.ts, not item-requests (which calls no finalize at all, F1
  // #8) or supportTickets (which declares attachments and reads/finalizes
  // nothing, F1 #7).
  const finalizedAttachments = input.attachments?.length
    ? await finalizeStagedMediaArray(input.attachments)
    : undefined;

  let productRef: MessageProductRef | undefined;
  if (input.productId) {
    const product = await productRepository.findById(input.productId);
    if (product) {
      productRef = {
        productId: product.id,
        title: product.title,
        image: product.images?.[0]?.url,
        price: product.price,
        // Without this the card cannot pick the right detail route — see the
        // field's own comment on `MessageProductRef`.
        listingType: normalizeListingType(product),
      };
    }
    // A missing/deleted product is not an error — the card simply doesn't
    // attach, same honesty rule as every other "snapshot at send time" field.
  }

  const message = await createMessage({
    conversationId: input.conversationId,
    authorId: input.authorId,
    body: cleaned,
    clientMessageId: input.clientMessageId,
    attachments: finalizedAttachments,
    productRef,
  });

  const preview = cleaned.length > 140 ? `${cleaned.slice(0, 140)}…` : cleaned;
  await conversationsRepository.applyNewMessage(
    input.conversationId,
    input.authorId,
    recipientId,
    {
      body: preview,
      authorId: input.authorId,
      at: message.createdAt,
      hasAttachments: Boolean(finalizedAttachments?.length),
      productId: productRef?.productId,
    },
  );

  // RTDB ping — best-effort. A failed ping degrades to "the recipient notices
  // on their next poll/visit", never to a lost message (the message is
  // already durably in Firestore by this point).
  try {
    await getAdminRealtimeDb()
      .ref(`${RTDB_PATHS.CHAT_EVENTS}/${input.conversationId}`)
      .set({ updatedAt: Date.now() });
  } catch (rtdbErr) {
    void normalizeError(rtdbErr);
    serverLogger.warn("sendMessage: chat_events ping failed (non-fatal)", {
      conversationId: input.conversationId,
    });
  }

  // Bell-only (EMAIL_ELIGIBLE_TYPES.message_received === false) — the
  // conversation lives in the UI.
  await sendNotification({
    userId: recipientId,
    type: "message_received",
    priority: "normal",
    title: "New message",
    message: preview,
    relatedId: input.conversationId,
    relatedType: "conversation",
  });

  return message;
}

export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  const conversation = await requireConversation(conversationId);
  assertParticipant(conversation, userId);
  await conversationsRepository.markRead(conversationId, userId);
}

export async function blockConversationParticipant(userId: string, conversationId: string): Promise<void> {
  const conversation = await requireConversation(conversationId);
  assertParticipant(conversation, userId);
  await conversationsRepository.blockParticipant(conversationId, userId);
}

export async function softDeleteOwnMessage(
  userId: string,
  conversationId: string,
  messageId: string,
): Promise<void> {
  const conversation = await requireConversation(conversationId);
  assertParticipant(conversation, userId);
  await softDeleteMessage(conversationId, messageId, userId);
}

/**
 * Mint a per-conversation custom token, matching `{ authEventId }` /
 * `{ paymentEventId }` / `{ bulkJobId }` — no broad token, ever. The RTDB auth
 * app's uid is synthetic and unrelated to the user's real uid, same as the
 * payment-event precedent: the realtime channel's identity and the user's
 * session identity are deliberately decoupled.
 */
export async function mintChatEventToken(
  userId: string,
  conversationId: string,
): Promise<{ customToken: string; expiresAt: number }> {
  const conversation = await requireConversation(conversationId);
  assertParticipant(conversation, userId);

  const customToken = await getAdminAuth().createCustomToken(
    `chat_event_${conversationId}`,
    { conversationId },
  );
  return { customToken, expiresAt: Date.now() + 60 * 60 * 1000 };
}

/** Unread rollup for the nav badge — never a list query (D9 spec). */
export async function getUnreadConversationCount(userId: string): Promise<number> {
  // listForUser is already bounded (<=50); summing its unread counts avoids a
  // second query shape while staying well inside Rule #6's per-request budget.
  // A user with more than 50 active threads undercounts here, which is an
  // acceptable approximation for a bell badge, not a balance.
  const { items } = await conversationsRepository.listForUser(userId, { limit: 50 });
  return items.reduce((sum, c) => sum + (c.unread[userId] ?? 0), 0);
}

export { deleteAllMessages, listAllAttachmentUrls };
