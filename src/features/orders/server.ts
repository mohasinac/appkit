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
