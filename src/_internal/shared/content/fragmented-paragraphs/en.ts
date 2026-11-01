/**
 * English fragmented paragraphs — the PARAGRAPH-shaped sibling of
 * `composite-sentences/en.ts` (1A-ii). A sentence needs Oxford-comma
 * grammar joining; a multi-paragraph body (each paragraph already a
 * complete, standalone clause) just needs the survivors concatenated —
 * `resolveFragmentedAnswer()` (`../fragments.ts`), already built for
 * admin-authored FAQ prose, does exactly that and is reused here unchanged
 * for STATIC developer-authored paragraph content.
 *
 * `Record<FragmentedParagraphId, ContentFragment[]>`, NOT `Partial` — same
 * compile-checked discipline as `SENTENCES_EN`.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */
import type { ContentFragment } from "../fragments";

export type FragmentedParagraphId = "cancellationPolicy.sections.3.body";

export const PARAGRAPHS_EN: Record<FragmentedParagraphId, ContentFragment[]> = {
  "cancellationPolicy.sections.3.body": [
    {
      governs: { governs: "listingType", value: "collector-drop" },
      text: "A winning collector drop bid is a commitment to buy and cannot be cancelled by the buyer; failing to pay within the stated window forfeits the win.",
    },
    {
      governs: { governs: "listingType", value: "pre-order" },
      text: "Pre-orders can be cancelled before the item ships unless the listing states otherwise — some pre-orders are explicitly non-cancellable, and that is shown on the listing before you order.",
    },
    {
      governs: { governs: "listingType", value: "random-lots" },
      text: "Prize-draw entries cannot be cancelled once the draw has closed.",
    },
  ],
};
