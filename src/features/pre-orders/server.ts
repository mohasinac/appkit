/**
 * @mohasinac/appkit/features/pre-orders/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
export { PreordersRepository } from "./repository/preorders.repository";

export {
  GET as preOrdersGET,
  POST as preOrdersPOST,
  GET,
  POST,
} from "./api/route";
