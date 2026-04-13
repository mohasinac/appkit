/**
 * @mohasinac/appkit/features/seller/server
 *
 * Server-only entry point for seller API route handlers.
 */

export { GET as sellerProductsGET } from "./api/products/route";
export { GET as sellerStoreGET } from "./api/store/route";
export { GET as sellerCouponsGET } from "./api/coupons/route";
export { GET as sellerOffersGET } from "./api/offers/route";
