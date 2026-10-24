/**
 * The seller-trust badges: Verified and Trusted Seller.
 *
 * 🛑 Until 2026-10-24 NEITHER rendered anywhere a buyer could see.
 * `isVerified` was in `PRIVATE_STORE_FIELDS`, so it was stripped from every
 * public store payload — while `/sellers` filtered on it to offer a "verified
 * sellers" view, `StoreCapabilitiesGuideView` told sellers in as many words
 * that "the Verified badge appears on your store profile page and on every
 * listing card", and the onboarding checklist offered "Request verified badge"
 * as a step. Three surfaces describing a badge that could not exist.
 *
 * ## One component, every surface
 *
 * Store card, store header, the product page's "Sold by" block and the seller
 * directory all render this. A per-surface copy is how the two badges would
 * come to disagree about what "trusted" means — and one of them means we pay
 * the seller before delivery, so that is not a drift worth risking.
 *
 * 🛑 NOT to be confused with `SellerTrustBadge` in `features/scams/`, which is
 * the scam-registry lookup (is this store on the reported-scammer registry).
 * Different question, different source, and both can show at once: a store can
 * be verified by us and still have a report against it.
 *
 * ## Why no Tailwind colour utilities here
 *
 * `<Badge>` carries its own `appkit-badge--*` CSS, so this authors no colour
 * classes at all — which sidesteps Root Cause #67 entirely rather than having
 * to pick the right `-surface`/`-solid` pairing and get the ink to match.
 */

import React from "react";
import { Badge, Row } from "../../../ui";
import { Icon } from "../../../ui/components/Icon";
import { SELLER_TIER } from "../../../_internal/shared/features/seller-standing/config";
import type { SellerTier } from "../../../_internal/shared/features/seller-standing/config";

export interface SellerTierBadgeProps {
  /**
   * 🛑 Takes the two FLAGS, not a store object.
   *
   * Every call site holds a different shape — `StoreListItem`, `StoreDetail`,
   * a product page's denormalised seller block, an admin row — and a prop
   * typed to one of them would force the others through a cast. A cast at a
   * boundary is where Root Cause #98 lives.
   */
  isVerified?: boolean;
  sellerTier?: SellerTier;
  size?: "xs" | "sm" | "md";
  /**
   * Where the badges explain themselves. Omit for no link — a card already
   * links to the store, and nesting an anchor inside it is invalid HTML.
   */
  href?: string;
  /** Rendered as a link element supplied by the consumer (locale-aware). */
  linkAs?: React.ElementType;
}

/**
 * Renders nothing when a store has neither badge — and that is deliberate:
 * an "unverified" chip would mark every ordinary seller as suspect, which is
 * a claim we are not making about them.
 */
export function SellerTierBadge({
  isVerified = false,
  sellerTier = SELLER_TIER.SELLER,
  size = "sm",
  href,
  linkAs,
}: SellerTierBadgeProps) {
  const isTrusted = sellerTier === SELLER_TIER.TRUSTED;
  if (!isVerified && !isTrusted) return null;

  const badges = (
    <Row gap="xs" align="center" wrap>
      {isVerified ? (
        <Badge variant="info" size={size}>
          <Row gap="xs" align="center">
            <Icon name="verify" size={size === "md" ? "md" : "sm"} aria-hidden />
            Verified
          </Row>
        </Badge>
      ) : null}
      {isTrusted ? (
        <Badge variant="success" size={size}>
          <Row gap="xs" align="center">
            <Icon name="review" size={size === "md" ? "md" : "sm"} aria-hidden />
            Trusted Seller
          </Row>
        </Badge>
      ) : null}
    </Row>
  );

  if (!href) return badges;

  const Link = (linkAs ?? "a") as React.ElementType;
  return (
    <Link href={href} aria-label="What do these seller badges mean?">
      {badges}
    </Link>
  );
}
