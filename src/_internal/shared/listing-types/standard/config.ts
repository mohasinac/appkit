import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "standard" as const;
export const capability = LISTING_TYPE_CAPABILITIES.standard;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "product-",
  cartLine: "single-product" as const,
};
