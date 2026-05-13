import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "prize-draw" as const;
export const capability = LISTING_TYPE_CAPABILITIES["prize-draw"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "prizedraw-",
  cartLine: "single-product" as const,
};
