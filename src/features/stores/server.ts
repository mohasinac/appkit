/**
 * @mohasinac/appkit/features/stores/server
 *
 * Server-only entry point — repositories and API route handlers.
 */
import "server-only";

export * from "./actions";

export { StoresRepository } from "./repository/stores.repository";
export {
  StoreRepository,
  storeRepository,
} from "./repository/store.repository";
export { storeAddressRepository } from "./repository/store-address.repository";

export { GET as storesGET, GET } from "./api/route";
export { GET as storeSlugGET } from "./api/[storeSlug]/route";
export { GET as storeProductsGET } from "./api/[storeSlug]/products/route";
export { GET as storeAuctionsGET } from "./api/[storeSlug]/auctions/route";
export { GET as storeReviewsGET } from "./api/[storeSlug]/reviews/route";
