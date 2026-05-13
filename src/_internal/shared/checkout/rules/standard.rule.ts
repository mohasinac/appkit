import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const standardRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard",
};
