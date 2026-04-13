/**
 * @mohasinac/appkit/features/admin/server
 *
 * Server-only entry point for admin API route handlers.
 */

export { GET as adminProductsGET } from "./api/products/route";
export { GET as adminCouponsGET } from "./api/coupons/route";
export { GET as adminReviewsGET } from "./api/reviews/route";
export { GET as adminBidsGET } from "./api/bids/route";
