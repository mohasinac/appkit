/**
 * Grouped-listing OG card.
 *
 * Deliberately delegates to `renderBundleOgImage` rather than re-implementing
 * the layout: the card is the same shape (title, description, cover, item
 * count) minus the price, and `BundleOgData.priceLabel` / `.stockStatus` are
 * already nullable for exactly that case. Forking it would give two ~150-line
 * OG layouts to keep visually in step — the Duplication Framework's
 * "same prop surface, same output" consolidate rule.
 */

import type { ReactElement } from "react";
import { renderBundleOgImage } from "../bundles/og";
import { resolveOgImageUrl } from "../seo/og";
import type { GroupedListingDocument } from "../../../../features/grouped/schemas/firestore";

export function renderGroupedListingOg(
  doc: Pick<GroupedListingDocument, "title" | "description" | "coverImage" | "productIds"> | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderBundleOgImage(
    {
      name: doc?.title ?? "Group",
      description:
        doc?.description?.slice(0, 140) ??
        `A curated group of related listings on ${opts.siteName}.`,
      coverImageUrl: resolveOgImageUrl(doc?.coverImage ?? null, opts.baseUrl),
      // A group has no price of its own — the buyer's selection is the price.
      priceLabel: null,
      itemCount: doc?.productIds?.length ?? null,
      stockStatus: null,
    },
    opts.siteName,
  );
}
