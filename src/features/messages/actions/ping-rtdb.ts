/**
 * pingConversationRtdb — server-side fan-out for conversation updates.
 *
 * Writes `Date.now()` to each ping path so RTDB-subscribed clients refetch.
 * Best-effort: failures are logged and swallowed (clients fall back to focus /
 * explicit refetch).
 */
import { getAdminRealtimeDb } from "../../../providers/db-firebase";
import { serverLogger } from "../../../monitoring";
import {
  buildConversationPingPaths,
  type ConversationPingTargets,
} from "../realtime";

export async function pingConversationRtdb(
  targets: ConversationPingTargets,
): Promise<void> {
  const paths = buildConversationPingPaths(targets);
  try {
    const db = getAdminRealtimeDb();
    const now = Date.now();
    await Promise.all(paths.filter(Boolean).map((p) => db.ref(p).set(now)));
  } catch (err) {
    serverLogger.warn("conversations: RTDB ping failed", {
      paths,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
