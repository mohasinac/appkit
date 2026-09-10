"use client";

/**
 * CardStoreLine — the "by <seller>" line on a listing card.
 *
 * One implementation because there are six card variants that need it and only
 * ONE of them rendered it: `ProductCard` had this block inline while
 * `ProductListRow`, `MarketplacePreorderCard`, `MarketplacePrizeDrawCard`,
 * `PreorderCard` and `MarketplaceAuctionCard` showed no seller at all, even
 * when the data was right there on the item. Six copies of a three-line block
 * is six chances for the fallback rule and the muted tone to drift.
 *
 * Deliberately NOT a link. A listing card is itself wrapped in a `<Link>` to the
 * product, and nesting an anchor inside an anchor is invalid HTML that browsers
 * resolve by splitting the outer link — which is how a card loses its own click
 * target (the shape of Root Cause #43). The seller is reachable from the product
 * detail page, which does link it.
 */

import React from "react";
import { Text } from "../../../ui/components/Typography";
import { safeDisplayName } from "../../../security/pii-redact";

export interface CardStoreLineProps {
  storeName?: string;
  /**
   * Present when the listing has a seller at all, whether or not its display
   * name was denormalized onto the document.
   *
   * This is the distinction the old inline block could not make: it called
   * `safeDisplayName(storeName, "")`, so a missing name produced `""` and the
   * line rendered nothing — indistinguishable from "this listing has no store".
   * With the id in hand, a listing that HAS a seller says so.
   */
  storeId?: string;
  className?: string;
}

/**
 * `store-beyblade-arena` → `Beyblade Arena`.
 *
 * The slug fallback was described as "readable", and next to a raw Firestore id
 * it is — but a buyer reading "by store-beyblade-arena" under a product does not
 * see a readable name, they see a leaked identifier. Pre-order and auction
 * documents do not denormalize `storeName`, so this fallback is what a large
 * share of cards actually render, on every listing page.
 *
 * Humanising here fixes all six card variants at once and needs no data change.
 * Denormalising `storeName` onto those documents is the better long-term fix and
 * would simply stop this path being reached.
 */
function humanizeStoreSlug(slug: string): string {
  return slug
    .replace(/^store-/, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CardStoreLine({ storeName, storeId, className }: CardStoreLineProps) {
  if (!storeId && !storeName) return null;

  // `safeDisplayName` also guards the encrypted-value case: a PII-ciphertext
  // string reaching a card must render as a label, never as `enc:v1:…`.
  const seller = safeDisplayName(
    storeName,
    storeId ? humanizeStoreSlug(storeId) : "Seller",
  );

  return (
    <Text className={className ?? "mt-0.5 text-[11px]"} color="faint">
      by {seller}
    </Text>
  );
}
