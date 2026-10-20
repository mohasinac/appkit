import type { LiveStatPreset } from "../schemas/firestore";
import type { IconKey } from "../../../ui/icons/icon-registry";

/**
 * `LiveStatPreset` → the glyph that means it.
 *
 * A live stat therefore gets a correct icon with ZERO config: the preset is
 * already a closed 6-member union, so the icon is derivable from what the stat
 * measures rather than being a second thing an admin has to fill in and keep
 * consistent. Declared `Record<LiveStatPreset, IconKey>` so a seventh preset
 * is a compile error here rather than a silently iconless tile.
 */
export const STAT_PRESET_ICON: Record<LiveStatPreset, IconKey> = {
  total_listings: "order",
  verified_sellers: "verify",
  total_buyers: "user",
  platform_rating: "review",
  total_orders: "cart",
  total_reviews: "message",
};
