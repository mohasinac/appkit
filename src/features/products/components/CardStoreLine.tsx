"use client";

/**
 * CardStoreLine — the "by <seller>" line on a listing card.
 *
 * One implementation because there are six card variants that need it and only
 * ONE of them rendered it: `ProductCard` had this block inline while
 * `ProductListRow`, `MarketplacePreorderCard`, `MarketplaceRandomLotCard`,
 * `PreorderCard` and `MarketplaceCollectorDropCard` showed no seller at all, even
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
import { useBrowsePageFlags } from "../../../react/hooks/useBrowsePageFlags";

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
 * see a readable name, they see a leaked identifier. Pre-order and collector drop
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
  /*
   * 🛑 A SELLER BYLINE IS MARKETPLACE CHROME — silent on a single-vendor shop.
   *
   * "by LetItRip Official" repeated under every card tells a buyer nothing
   * when there is only one seller: it is the same six words on every tile,
   * costing a line of vertical space on all six card variants and implying a
   * choice that does not exist.
   *
   * Keyed on whether the STORE DIRECTORY is open, the same question the
   * product page's "Sold by" block asks, so the two cannot disagree. This
   * hook is the client-side reader of that flag (a card is `"use client"`, so
   * it cannot take the server's settings read).
   *
   * 🛑 Fails OPEN while settings load — `useBrowsePageFlags` defaults every
   * section to open, so a cold paint shows the byline and then removes it
   * rather than flashing it in. That is the right direction for a marketplace
   * that still has one; the alternative hides a real seller on every cold
   * load. Root Cause #72.
   */
  const browsePages = useBrowsePageFlags();
  if (!browsePages.isEnabled("stores")) return null;

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
