import React from "react";
import { MediaImage } from "../../features/media/MediaImage";
import { Div } from "./Div";

/** How many tiles the mosaic draws. More than five reads as a grid, not a hero. */
const MOSAIC_MAX = 5;
/** Below this there is nothing to arrange, so the caller should render nothing. */
export const MOSAIC_MIN = 3;

/**
 * `band` — the category-hero strip this was built for (180/260px).
 * `hero`  — the homepage hero's right column, roughly double height.
 */
export type ImageMosaicSize = "band" | "hero";

export interface ImageMosaicProps {
  /** Image URLs, most important first. Fewer than `MOSAIC_MIN` renders null. */
  images: readonly string[];
  /** Describes the SUBJECT, not the images — one alt for a decorative group. */
  alt: string;
  /** Height preset. Defaults to `"band"`, the original behaviour. */
  size?: ImageMosaicSize;
  /**
   * Replaces the large cell's image with arbitrary content — the homepage
   * hero's brand panel is the only caller.
   *
   * 🛑 It changes what `images` MEANS, which is the whole reason it is a
   * separate prop rather than a `images[0]`-shaped special case: without a
   * slot the first image takes the large cell, with one EVERY image goes to
   * the small column. A caller that passes both a slot and three images gets
   * three small tiles, not two.
   *
   * `MOSAIC_MIN` is also not applied in this mode. The minimum exists because
   * fewer than three images is not an arrangement — but a slot is content in
   * its own right, so one image beside it is still a composition, and zero
   * images collapses to the slot alone at full width.
   */
  leadSlot?: React.ReactNode;
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
export function ImageMosaic({ images, alt, size = "band", leadSlot, className }: ImageMosaicProps) {
  // With a slot the large cell is already spoken for, so the whole budget
  // belongs to the small column — one fewer tile than the image-led shape.
  const tiles = images.filter(Boolean).slice(0, leadSlot ? MOSAIC_MAX - 1 : MOSAIC_MAX);
  if (!leadSlot && tiles.length < MOSAIC_MIN) return null;

  const [lead, ...rest] = leadSlot ? [undefined, ...tiles] : tiles;
  const sizeClass = size === "hero" ? "appkit-image-mosaic--hero" : "";
  // Nothing to put in the small column — the 1fr track would otherwise render
  // as an empty gutter beside the slot, which reads as a failed image load
  // rather than as a deliberate panel.
  const soloClass = leadSlot && rest.length === 0 ? "appkit-image-mosaic--solo" : "";

  /*
   * 🛑 WHERE `role="img"` GOES DEPENDS ON THE SLOT, and getting this wrong is
   * silent.
   *
   * `role="img"` collapses its entire subtree into ONE node named by
   * `aria-label` — that is exactly right for a group of decorative thumbnails
   * (point 1 in the header: one alt describing the subject, not five
   * filenames). Leave it on the grid in `leadSlot` mode and it also swallows
   * the slot, so the hero's logo and its "Let It Rip India" caption would
   * reach a screen reader as "…collection highlights" and nothing else — real
   * content erased by a label meant for the pictures beside it.
   *
   * So in slot mode the role moves down to the image group, where it belongs,
   * and the slot stays ordinary DOM. The no-slot path is byte-identical to
   * what it always was.
   */
  const imageGroupA11y = { role: "img" as const, "aria-label": alt };

  return (
    <Div
      className={`appkit-image-mosaic ${sizeClass} ${soloClass} ${className ?? ""}`}
      {...(leadSlot ? {} : imageGroupA11y)}
    >
      <Div className="appkit-image-mosaic__lead">
        {leadSlot ?? <MediaImage src={lead!} alt="" size="card" />}
      </Div>
      {rest.length > 0 && (
        <Div
          className="appkit-image-mosaic__rest"
          {...(leadSlot ? imageGroupA11y : {})}
        >
          {rest.map((src, i) => (
            <Div key={`${src}-${i}`} className="appkit-image-mosaic__tile">
              <MediaImage src={src!} alt="" size="thumbnail" />
            </Div>
          ))}
        </Div>
      )}
    </Div>
  );
}
