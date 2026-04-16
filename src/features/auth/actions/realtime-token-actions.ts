/**
 * Realtime Token Domain Actions — appkit
 *
 * Issues a Firebase custom auth token for Realtime Database subscriptions.
 * Called by letitrip thin wrapper which handles auth + rate limiting.
 */

import { getAdminAuth } from "../../../providers/db-firebase/index";
import { chatRepository } from "../../admin/index";
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
    serverLogger.warn("Could not resolve chatIds for realtime token", {
      userId,
      err,
    });
  }

  const customToken = await getAdminAuth().createCustomToken(userId, {
    role: userRole,
    chatIds,
  });

  serverLogger.info("issueRealtimeToken: token issued", {
    userId,
    chatCount: Object.keys(chatIds).length,
  });

  return { customToken, expiresAt: Date.now() + 3_600_000 };
}
