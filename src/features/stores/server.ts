/**
 * @mohasinac/appkit/features/stores/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export { GET as storesGET, GET } from "./api/route";
export { GET as storeSlugGET } from "./api/[storeSlug]/route";
export { GET as storeProductsGET } from "./api/[storeSlug]/products/route";
export { GET as storeAuctionsGET } from "./api/[storeSlug]/auctions/route";
export { GET as storeReviewsGET } from "./api/[storeSlug]/reviews/route";
