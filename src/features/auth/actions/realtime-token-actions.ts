/**
 * Realtime Token Domain Actions — appkit
 *
 * Issues a Firebase custom auth token for Realtime Database subscriptions.
 * Called by letitrip thin wrapper which handles auth + rate limiting.
 */

import { getAdminAuth } from "../../../providers/db-firebase/index";
import { conversationsRepository } from "../../messages/repository/conversations.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { serverLogger } from "../../../monitoring/index";
import { normalizeError } from "../../../errors/normalize";

export interface RealtimeTokenResult {
  customToken: string;
  expiresAt: number;
}

export async function issueRealtimeToken(
  userId: string,
  userRole: string,
): Promise<RealtimeTokenResult> {
  const conversationIds: Record<string, boolean> = {};
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
    void normalizeError(err);
    serverLogger.warn("Could not resolve conversationIds for realtime token", { userId, err });
  }

  const customToken = await getAdminAuth().createCustomToken(userId, {
    role: userRole,
    conversationIds,
  });

  serverLogger.info("issueRealtimeToken: token issued", {
    userId,
    conversationCount: Object.keys(conversationIds).length,
  });

  return { customToken, expiresAt: Date.now() + 3_600_000 };
}
