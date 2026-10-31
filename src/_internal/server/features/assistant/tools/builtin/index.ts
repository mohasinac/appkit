import { getMyOrdersTool } from "./get-my-orders";
import { searchFaqsTool } from "./search-faqs";
import { searchProductsTool } from "./search-products";

/**
 * The registered tool set.
 *
 * A2 (`piiClass: "none"`) — public, projected, no auth beyond the route's:
 *   · searchFaqs       wraps listPublicFaqs, the /faqs page's own function
 *   · searchProducts   wraps listPublicProducts, what GET /api/products serves
 *
 * A3 (`piiClass: "handle-only"`) — the customer's own data:
 *   · getMyOrders      scoped to ctx.userId from the verified session, with
 *                      the order id minted as a per-turn handle and every
 *                      address field deliberately absent
 *
 * 🛑 The A2/A3 split is the single most important line in Part A: A2 shipped
 * and was verified with ZERO PII surface, so none of the privacy machinery
 * had to be right before anything worked. A3 adds exactly one tool on top of
 * a proven engine instead of making the first version a PII migration.
 */
export const BUILTIN_ASSISTANT_TOOLS = [
  searchFaqsTool,
  searchProductsTool,
  getMyOrdersTool,
] as const;

export { searchFaqsTool, searchProductsTool, getMyOrdersTool };
export type { SearchFaqsResult } from "./search-faqs";
export type { SearchProductsResult } from "./search-products";
export type { MyOrderResult } from "./get-my-orders";
