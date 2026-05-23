/**
 * @mohasinac/appkit/features/stores/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
export * from "./actions";

export {
  StoreRepository,
  storeRepository,
} from "./repository/store.repository";
// SB-UNI-A 2026-05-13 — storeAddressRepository deleted. Use addressesRepository
// (top-level addresses collection with ownerType:"store").

export { GET as storesGET, GET } from "./api/route";
export { GET as storeSlugGET } from "./api/[storeSlug]/route";
export { GET as storeProductsGET } from "./api/[storeSlug]/products/route";
export { GET as storeAuctionsGET } from "./api/[storeSlug]/auctions/route";
export { GET as storeReviewsGET } from "./api/[storeSlug]/reviews/route";
