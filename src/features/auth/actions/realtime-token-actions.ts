/**
 * Realtime Token Domain Actions — appkit
 *
 * Issues a Firebase custom auth token for Realtime Database subscriptions.
 * Called by letitrip thin wrapper which handles auth + rate limiting.
 */

import { getAdminAuth } from "../../../providers/db-firebase/index";
import { chatRepository } from "../../admin/repository/chat.repository";
import { conversationsRepository } from "../../messages/repository/conversations.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { serverLogger } from "../../../monitoring/index";

export interface RealtimeTokenResult {
  customToken: string;
  expiresAt: number;
}

export async function issueRealtimeToken(
  userId: string,
  userRole: string,
): Promise<RealtimeTokenResult> {
  let chatIds: Record<string, boolean> = {};
  try {
    const userChatIds = await chatRepository.getChatIdsForUser(userId);
    chatIds = Object.fromEntries(userChatIds.map((id) => [id, true]));
  } catch (err) {
    serverLogger.warn("Could not resolve chatIds for realtime token", { userId, err });
  }

  let conversationIds: Record<string, boolean> = {};
  try {
    const buyerConvs = await conversationsRepository.listByBuyer(userId);
    buyerConvs.forEach((c) => { conversationIds[c.id] = true; });

    if (userRole === "seller") {
      const store = await storeRepository.findByOwnerId(userId);
      if (store?.id) {
        const sellerConvs = await conversationsRepository.listByStore(store.id);
        sellerConvs.forEach((c) => { conversationIds[c.id] = true; });
      }
    }
  } catch (err) {
    serverLogger.warn("Could not resolve conversationIds for realtime token", { userId, err });
  }

  const customToken = await getAdminAuth().createCustomToken(userId, {
    role: userRole,
    chatIds,
    conversationIds,
  });

  serverLogger.info("issueRealtimeToken: token issued", {
    userId,
    chatCount: Object.keys(chatIds).length,
  });

  return { customToken, expiresAt: Date.now() + 3_600_000 };
}
