import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "auction" as const;
export const capability = LISTING_TYPE_CAPABILITIES.auction;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "auction-",
  cartLine: "blocked" as const,
};
