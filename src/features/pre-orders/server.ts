/**
 * @mohasinac/appkit/features/pre-orders/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export {
  GET as preOrdersGET,
  POST as preOrdersPOST,
  GET,
  POST,
} from "./api/route";
