import { LISTING_TYPE_CAPABILITIES } from "../capabilities";

export const LISTING_TYPE = "pre-order" as const;
export const capability = LISTING_TYPE_CAPABILITIES["pre-order"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "preorder-",
  cartLine: "single-product" as const,
};
