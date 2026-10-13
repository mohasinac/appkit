import React from "react";
import { MediaImage } from "../../features/media/MediaImage";
import { Div } from "./Div";

/** How many tiles the mosaic draws. More than five reads as a grid, not a hero. */
const MOSAIC_MAX = 5;
/** Below this there is nothing to arrange, so the caller should render nothing. */
export const MOSAIC_MIN = 3;

export interface ImageMosaicProps {
  /** Image URLs, most important first. Fewer than `MOSAIC_MIN` renders null. */
  images: readonly string[];
  /** Describes the SUBJECT, not the images — one alt for a decorative group. */
  alt: string;
  className?: string;
}

/**
 * D3 — a mosaic of a collection's own images, for a hero that has no cover
 * photo of its own.
 *
 * ## 🛑 Why this exists and what it replaces
 *
 * A category with no `display.coverImage` rendered a flat
 * `bg-[var(--appkit-color-bg)]` band behind its title — the same empty strip on
 * every one of the ~1,100 categories that has no photographer. The images were
 * already on the page (the product grid below it), so the hero was blank beside
 * a screen full of pictures.
 *
 * ## 🛑 It is DECORATIVE, and that decides three things
 *
 * 1. **One `alt` for the group, describing the subject** — "Beyblade Burst
 *    parts", not five filenames. Five alts for five thumbnails of the same
 *    subject is noise to a screen reader, and `alt=""` on each would leave the
 *    band unlabelled entirely.
 * 2. **`aria-hidden` is NOT used**, because the group does carry meaning: it is
 *    what this category looks like. Hidden decoration plus a labelled group are
 *    different claims and the second is true here.
 * 3. **No links.** Every one of these products is linked in the grid below; a
 *    second set of hit targets over a title is a tap hazard on a phone and
 *    gives a crawler duplicate links to the same URLs.
 *
 * ## 🛑 Deterministic emphasis, never random
 *
 * The first image takes the large cell and the rest fill the small ones in
 * order. `Math.random()` here would make the hero change on every render, which
 * breaks SSR/hydration agreement and makes the page feel unstable — and it is
 * the shape Root Cause #25 is about on the seed side.
 */
export function ImageMosaic({ images, alt, className }: ImageMosaicProps) {
  const tiles = images.filter(Boolean).slice(0, MOSAIC_MAX);
  if (tiles.length < MOSAIC_MIN) return null;

  const [lead, ...rest] = tiles;

  return (
    <Div
      className={`appkit-image-mosaic ${className ?? ""}`}
      role="img"
      aria-label={alt}
    >
      <Div className="appkit-image-mosaic__lead">
        <MediaImage src={lead!} alt="" size="card" />
      </Div>
      <Div className="appkit-image-mosaic__rest">
        {rest.map((src, i) => (
          <Div key={`${src}-${i}`} className="appkit-image-mosaic__tile">
            <MediaImage src={src} alt="" size="thumbnail" />
          </Div>
        ))}
      </Div>
    </Div>
  );
}
