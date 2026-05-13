import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "digital-code" as const;
export const capability = LISTING_TYPE_CAPABILITIES["digital-code"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "digitalcode-",
  cartLine: "single-product" as const,
};
