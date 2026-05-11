/**
 * Messages domain actions — pure business functions; auth/rate-limit is the
 * caller's responsibility.
 */
import { ValidationError } from "../../../errors";
import { ERROR_MESSAGES } from "../../../errors/messages";
import {
  conversationsRepository,
  type ConversationsRepository,
} from "../repository/conversations.repository";
import type {
  ConversationDocument,
  ConversationMessage,
} from "../schemas/firestore";

export const MESSAGE_MAX_LENGTH = 2000;

export async function listConversationsForBuyer(
  buyerId: string,
): Promise<ConversationDocument[]> {
  return conversationsRepository.listByBuyer(buyerId);
}

export async function listConversationsForStore(
  storeId: string,
): Promise<ConversationDocument[]> {
  return conversationsRepository.listByStore(storeId);
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationDocument | null> {
  return conversationsRepository.findById(conversationId);
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderRole: "buyer" | "seller";
  body: string;
}

export async function sendMessage(
  input: SendMessageInput,
): Promise<ConversationDocument> {
  const body = input.body?.trim();
  if (!body) throw new ValidationError(ERROR_MESSAGES.CONVERSATIONS.BODY_REQUIRED);
  if (body.length > MESSAGE_MAX_LENGTH) {
    throw new ValidationError(
      `${ERROR_MESSAGES.CONVERSATIONS.BODY_TOO_LONG} (max ${MESSAGE_MAX_LENGTH} characters)`,
    );
  }
  return conversationsRepository.appendMessage(input.conversationId, {
    senderId: input.senderId,
    senderRole: input.senderRole,
    body,
  });
}

export async function markConversationRead(
  conversationId: string,
  role: "buyer" | "seller",
): Promise<void> {
  await conversationsRepository.markRead(conversationId, role);
}

export type { ConversationsRepository, ConversationDocument, ConversationMessage };
