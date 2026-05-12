import { getAdminAuth, getAdminRealtimeDb } from "../../../../providers/db-firebase";
import type { ScheduleHandler } from "../runtime/types";

const AUTH_STALE_MS = 3 * 60 * 1000;
const PAYMENT_STALE_MS = 15 * 60 * 1000;

export const cleanupRtdbEventsHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Starting RTDB events cleanup");
  const rtdb = getAdminRealtimeDb();
  const auth = getAdminAuth();
  const now = Date.now();

  try {
    const authSnap = await rtdb.ref("auth_events").get();
    if (authSnap.exists()) {
      const allEvents = authSnap.val() as Record<string, { createdAt?: number }>;
      const staleAuthIds = Object.entries(allEvents)
        .filter(([, node]) => (node.createdAt ?? 0) < now - AUTH_STALE_MS)
        .map(([id]) => id);
      if (staleAuthIds.length > 0) {
        await Promise.all(
          staleAuthIds.flatMap((id) => [
            rtdb.ref(`auth_events/${id}`).remove(),
            auth.deleteUser(`auth_event_${id}`).catch(() => {}),
          ]),
        );
        ctx.logger.info("Auth events removed", { count: staleAuthIds.length });
      }
    }
  } catch (authErr) {
    ctx.logger.error("Auth events cleanup failed (non-fatal)", authErr);
  }

  try {
    const paySnap = await rtdb.ref("payment_events").get();
    if (paySnap.exists()) {
      const allPayments = paySnap.val() as Record<string, { createdAt?: number }>;
      const stalePayIds = Object.entries(allPayments)
        .filter(([, node]) => (node.createdAt ?? 0) < now - PAYMENT_STALE_MS)
        .map(([id]) => id);
      if (stalePayIds.length > 0) {
        await Promise.all(
          stalePayIds.map((id) => rtdb.ref(`payment_events/${id}`).remove()),
        );
        ctx.logger.info("Payment events removed", { count: stalePayIds.length });
      }
    }
  } catch (payErr) {
    ctx.logger.error("Payment events cleanup failed (non-fatal)", payErr);
  }

  ctx.logger.info("RTDB events cleanup complete");
};
