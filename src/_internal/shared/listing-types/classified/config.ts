import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "classified" as const;
export const capability = LISTING_TYPE_CAPABILITIES.classified;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "classified-",
  cartLine: "blocked" as const,
};
