/**
 * @mohasinac/appkit/features/promotions/server
 *
 * Server-only entry point for promotions repositories and API route handlers.
 */
export * from "./actions";

export { PromotionsRepository } from "./repository/promotions.repository";
export { couponsRepository } from "./repository/coupons.repository";

export { GET as promotionsGET, GET } from "./api/route";
