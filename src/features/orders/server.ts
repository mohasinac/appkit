/**
 * @mohasinac/appkit/features/orders/server
 *
 * Server-only entry point for order repositories.
 */
import "server-only";

export * from "./actions";

export {
  OrderRepository,
  OrdersRepository,
  orderRepository,
} from "./repository/orders.repository";

// API route handler — re-export for consumer app router stubs
export { GET as getOrderTrackingHandler } from "./api/track/[trackingId]/route";
