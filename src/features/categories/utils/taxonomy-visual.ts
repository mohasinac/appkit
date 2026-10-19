/*
 * WHY: `CategoryDisplay.icon` is a bare `string?` that two conventions write
 *      to and three renderers read differently. The seed puts an EMOJI there
 *      ("🪀" on the twelve forest roots, "🔥"/"🐴" on the sublistings), while
 *      `BrandsSection` has always treated it as a URL and feeds it straight to
 *      `resolveMediaUrl`. Both are live. So a renderer that guesses wrong
 *      either prints a raw URL as visible text, or hands an emoji to an
 *      `<img src>` that then 404s into a broken-image glyph.
 *
 *      On top of that there is an ORDERING question between the two, and
 *      `brand-rows.ts` trap 2 settles it: the brand seed leaves `icon` unset
 *      *precisely because* an emoji there would win over a real logo. So an
 *      emoji must rank BELOW a real cover (it is decoration), while an icon
 *      that is a URL ranks above one (it is the more specific asset). That is
 *      the precedence implemented below, corrected 2026-10-20.
 *
 *      Two decisions, both easy to get wrong, previously made at each call
 *      site. This is the one place that makes them.
 *
 * WHAT: Resolves a taxonomy row (category / brand / franchise / bundle) to the
 *       single leading visual it should render.
 *
 * EXPORTS: resolveTaxonomyVisual, TaxonomyVisual, TaxonomyVisualSource
 *
 * @tag domain:categories
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

export interface TaxonomyVisualSource {
  name?: string;
  display?: {
    icon?: string;
    coverImage?: string;
  } | null;
}

export interface TaxonomyVisual {
  /** A URL or `/media/<slug>` path safe to pass to an image component. */
  imageUrl?: string;
  /** Literal text (an emoji) meant to be rendered as text, never as `<img src>`. */
  emoji?: string;
}

/**
 * True when the string is a reference to be fetched rather than text to be
 * printed. Deliberately permissive on the URL side and strict on nothing:
 * every real value in this codebase is `http(s)://…`, `/media/…`,
 * `/images/…` or a `data:` URI, and everything else written to `icon` has
 * been an emoji.
 */
function looksLikeUrl(value: string): boolean {
  return (
    value.startsWith("http") ||
    value.startsWith("/") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  );
}

/**
 * Resolve the leading visual for a taxonomy row.
 *
 * Precedence: an `icon` that is a URL → `coverImage` → an `icon` that is an
 * EMOJI. Returns an empty object when the row has none, so the caller can fall
 * back to an initial rather than reserving a blank box.
 *
 * 🛑 The emoji ranks LAST, and that ordering changed 2026-10-20. It used to be
 * "icon, whatever it holds, then cover", which meant a row carrying both a
 * real photograph and a decorative emoji rendered the emoji — the twelve
 * forest roots are exactly that shape. `brand-rows.ts` trap 2 already names
 * this as the defect rather than the intent: the brand seed leaves `icon`
 * unset *precisely because* an emoji there would beat a real logo. Honouring
 * that reading everywhere is what lets a root keep its emoji for menus while
 * its page shows the photograph.
 *
 * An icon that is a URL still wins — that is `BrandsSection`'s long-standing
 * convention, where `icon` holds the brand logo and is the more specific
 * choice than a generic cover.
 */
export function resolveTaxonomyVisual(row: TaxonomyVisualSource | null | undefined): TaxonomyVisual {
  const icon = row?.display?.icon?.trim();
  if (icon && looksLikeUrl(icon)) return { imageUrl: icon };

  const cover = row?.display?.coverImage?.trim();
  if (cover && looksLikeUrl(cover)) return { imageUrl: cover };

  if (icon) return { emoji: icon };

  return {};
}
