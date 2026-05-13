import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "live" as const;
export const capability = LISTING_TYPE_CAPABILITIES.live;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "live-",
  cartLine: "single-product" as const,
};
