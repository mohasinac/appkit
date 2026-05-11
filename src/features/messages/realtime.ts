/**
 * Conversations realtime channel — shared between client hooks and server
 * routes. Lives in a non-`"use client"` module so server route handlers can
 * import the path builders without dragging the React hooks into a server
 * bundle.
 *
 * Strategy (D5 + VC7):
 *   - Firestore = canonical store; messages embedded in `conversations/{id}`.
 *   - RTDB = "ping" channel only — server writes Date.now() to two paths on
 *     every mutation, clients subscribe and refetch.
 *
 *     chats/{id}/lastUpdate              — single-conversation ping
 *     chats/user/{userId}/lastUpdate     — per-user fan-out ping
 *
 * Both ends import these constants instead of inlining the path strings.
 */

const PING_KEY = "lastUpdate" as const;

/** RTDB path bumped on every write to a single conversation. */
export function conversationPingPath(conversationId: string): string {
  return `chats/${conversationId}/${PING_KEY}`;
}

/**
 * RTDB path bumped on every write across all of a user's conversations.
 * Subscribing to this is how the chat list / nav bell refresh without
 * subscribing to every individual conversation.
 */
export function userConversationsPingPath(userId: string): string {
  return `chats/user/${userId}/${PING_KEY}`;
}

/** All ping paths to bump on a single conversation write. */
export interface ConversationPingTargets {
  conversationId: string;
  buyerId: string;
  /** Resolved store-owner UID for the seller side; null when not known. */
  sellerOwnerId: string | null;
}

export function buildConversationPingPaths(
  targets: ConversationPingTargets,
): string[] {
  const paths = [
    conversationPingPath(targets.conversationId),
    userConversationsPingPath(targets.buyerId),
  ];
  if (targets.sellerOwnerId) {
    paths.push(userConversationsPingPath(targets.sellerOwnerId));
  }
  return paths;
}
