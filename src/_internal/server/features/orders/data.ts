import { cache } from "react";
import { orderRepository } from "../../../../repositories";
import { safeRead } from "../../../../errors/safe-read";

export const getOrderForDetail = cache(
  async (orderId: string) => {
    // No catch: this order IS the page. Swallowing a Firestore failure to null
    // renders "order not found" for a datastore outage — the caller cannot tell
    // the two apart, which is Root Cause #59 on the money path. A throw reaches
    // the route/error boundary and is now recorded.
    return (await orderRepository.findById(orderId)) ?? null;
  },
);

export const getOrdersForBuyer = cache(
  async (userId: string, page = 1, pageSize = 20) => {
    return orderRepository.listForUser(userId, { page, pageSize }).catch(() => ({
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasMore: false,
    }));
  },
);

export const getRecentOrdersForBuyer = cache(
  async (userId: string) => {
    // Optional: a recent-orders rail. Degrading to empty is right, but it must
    // be VISIBLE — safeRead records a DEGRADED_READ row instead of returning a
    // value indistinguishable from "no recent orders".
    return safeRead(() => orderRepository.findRecentByUser(userId), {
      route: "/user/orders",
      key: "orders.findRecentByUser",
      fallback: [] as Awaited<ReturnType<typeof orderRepository.findRecentByUser>>,
    });
  },
);
