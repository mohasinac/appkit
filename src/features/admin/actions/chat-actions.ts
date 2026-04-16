/**
 * Chat Domain Actions — appkit
 *
 * Pure async functions for buyer↔seller chat. No auth, no rate-limit.
 * Accept userId as explicit parameter. Called by letitrip thin wrappers.
 *
 * chatEnabled must be passed from the consumer (e.g. FEATURE_FLAGS.CHAT_ENABLED)
 * rather than reading it from appkit to keep market config in letitrip.
 */

import { chatRepository } from "../repository/chat.repository";
import { orderRepository } from "../../orders/index";
import { userRepository } from "../../auth/index";
import { getAdminRealtimeDb } from "../../../providers/db-firebase/index";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../../errors/index";
import { ERROR_MESSAGES } from "../../../errors/messages";
import { serverLogger } from "../../../monitoring/index";
import type { ChatRoomDocument } from "../repository/chat.repository";

export interface ChatRoomsResult {
  rooms: ChatRoomDocument[];
}

export interface CreateRoomInput {
  orderId: string;
  sellerId: string;
}

export interface CreateRoomResult {
  room: ChatRoomDocument;
}

export async function getChatRooms(
  userId: string,
  chatEnabled: boolean,
): Promise<ChatRoomsResult> {
  if (!chatEnabled)
    throw new AuthorizationError("Chat is temporarily unavailable.");
  const rooms = await chatRepository.listForUser(userId);
  return { rooms };
}

export async function createOrGetChatRoom(
  userId: string,
  chatEnabled: boolean,
  input: CreateRoomInput,
): Promise<CreateRoomResult> {
  if (!chatEnabled)
    throw new AuthorizationError("Chat is temporarily unavailable.");

  const { orderId, sellerId } = input;
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError(ERROR_MESSAGES.ORDER.NOT_FOUND);
  if (order.userId !== userId && sellerId !== userId)
    throw new AuthorizationError(ERROR_MESSAGES.CHAT.NOT_AUTHORIZED);

  const buyerId = order.userId;
  const existing = await chatRepository.findRoom(buyerId, sellerId, orderId);
  if (existing) {
    const deletedBy: string[] = existing.deletedBy ?? [];
    if (deletedBy.includes(userId)) {
      const reopened = deletedBy.filter((id) => id !== userId);
      await chatRepository.update(existing.id, { deletedBy: reopened });
      return { room: { ...existing, deletedBy: reopened } };
    }
    return { room: existing };
  }

  const [buyer, seller] = await Promise.all([
    userRepository.findById(buyerId),
    userRepository.findById(sellerId),
  ]);

  const room = await chatRepository.create({
    buyerId,
    sellerId,
    orderId,
    productId: (order as any).productId,
    productTitle: (order as any).productTitle,
    buyerName: buyer?.displayName ?? "Buyer",
    sellerName: seller?.displayName ?? "Seller",
    participantIds: [buyerId, sellerId],
  } as any);

  serverLogger.info("createOrGetChatRoom: room created", { userId, orderId });
  return { room };
}

export async function sendChatMessage(
  userId: string,
  chatId: string,
  message: string,
): Promise<{ messageId: string; timestamp: number }> {
  if (!chatId?.trim()) throw new ValidationError("chatId is required");
  if (!message?.trim()) throw new ValidationError("message is required");

  const room = await chatRepository.findById(chatId);
  if (!room) throw new NotFoundError("Chat room not found");
  if (!(room.participantIds ?? []).includes(userId))
    throw new AuthorizationError("Not a participant of this chat");

  const rtdb = getAdminRealtimeDb();
  const msgRef = rtdb.ref(`/chat/${chatId}/messages`).push();
  const id = msgRef.key as string;
  const userName =
    userId === room.buyerId
      ? (room.buyerName ?? "Buyer")
      : userId === room.sellerId
        ? (room.sellerName ?? "Seller")
        : (room.buyerName ?? "Member");
  await msgRef.set({ userId, userName, message, timestamp: Date.now() });
  chatRepository.updateLastMessage(chatId, message).catch((err) => {
    serverLogger.warn("Failed to update chat lastMessage", { chatId, err });
  });

  serverLogger.debug("sendChatMessage", { userId, chatId });
  return { messageId: id, timestamp: Date.now() };
}

export async function deleteChatRoom(
  userId: string,
  chatId: string,
): Promise<{ deleted: boolean }> {
  if (!chatId?.trim()) throw new ValidationError("chatId is required");

  const room = await chatRepository.findById(chatId);
  if (!room) throw new NotFoundError("Chat room not found");

  const deletedBy: string[] = room.deletedBy ?? [];
  if (!deletedBy.includes(userId)) {
    await chatRepository.update(chatId, { deletedBy: [...deletedBy, userId] });
  }

  serverLogger.info("deleteChatRoom: soft-deleted", { userId, chatId });
  return { deleted: true };
}
