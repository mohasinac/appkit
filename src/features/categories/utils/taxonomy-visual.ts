/*
 * WHY: `CategoryDisplay.icon` is a bare `string?` that two conventions write
 *      to and three renderers read differently. The seed puts an EMOJI there
 *      ("🪀" on the twelve forest roots, "🔥"/"🐴" on the sublistings), while
 *      `BrandsSection` has always treated it as a URL and feeds it straight to
 *      `resolveMediaUrl`. Both are live. So a renderer that guesses wrong
 *      either prints a raw URL as visible text, or hands an emoji to an
 *      `<img src>` that then 404s into a broken-image glyph.
 *
 *      On top of that, `icon` BEATS `coverImage` — `brand-rows.ts` trap 2
 *      records why: the brand seed deliberately leaves `icon` unset precisely
 *      because an emoji left there would win over a real logo. A renderer that
 *      checks `coverImage` first silently inverts that rule.
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
 * Precedence: `display.icon` (as image when it is a URL, else as emoji) →
 * `display.coverImage`. Returns an empty object when the row has neither, so
 * the caller can fall back to an initial rather than reserving a blank box.
 */
export function resolveTaxonomyVisual(row: TaxonomyVisualSource | null | undefined): TaxonomyVisual {
  const icon = row?.display?.icon?.trim();
  if (icon) {
    return looksLikeUrl(icon) ? { imageUrl: icon } : { emoji: icon };
  }

  const cover = row?.display?.coverImage?.trim();
  if (cover && looksLikeUrl(cover)) return { imageUrl: cover };

  return {};
}
