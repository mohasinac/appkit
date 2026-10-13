import { Anchor } from "./Anchor";
import { Div } from "./Div";
import { Heading, Span } from "./Typography";
import { MediaImage } from "../../features/media/MediaImage";

export interface SplitTilePane {
  href: string;
  label: string;
  /** A real photo for this pane. Absent panes are never padded with a placeholder. */
  imageUrl: string;
  /** A real, already-counted figure — "128 listings", never invented. */
  countLabel?: string;
}

export interface SplitTileProps {
  left: SplitTilePane;
  right: SplitTilePane;
  className?: string;
}

/**
 * D3 — two real options, side by side, each a real photo and a real count.
 *
 * ## 🛑 Why exactly two, and why both need a photo
 *
 * This exists for the shape a root category with two genuinely distinct
 * branches has — Beyblade vs Battle Gear under Spinning Tops, Companion
 * Animals vs Live Plants under Living Collectibles — where "pick one" is a
 * more honest hero than a uniform grid that treats six branches as
 * interchangeable. It is NOT a general-purpose N-up component: three or more
 * options is what the existing sub-category scroller already does, and
 * `ImageMosaic` is the pattern for "we have no single cover photo but we have
 * many product photos".
 *
 * 🛑 THE CALLER DECIDES WHETHER TO RENDER THIS AT ALL. `SplitTile` takes two
 * required panes and renders both — it has no "only one pane" fallback and no
 * placeholder image, because a tile with an invented or missing side is worse
 * than not showing the pattern. A category with only one photographed branch
 * falls through to the ordinary sub-category scroller instead.
 */
export function SplitTile({ left, right, className }: SplitTileProps) {
  return (
    <Div className={`grid grid-cols-1 md:grid-cols-2 gap-[var(--appkit-space-3)] ${className ?? ""}`}>
      {[left, right].map((pane) => (
        <Anchor
          key={pane.href}
          href={pane.href}
          underline="none"
          className="group relative block overflow-hidden rounded-xl h-[160px] md:h-[220px]"
        >
          <MediaImage src={pane.imageUrl} alt="" size="banner" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />
          <Div surface="overlay-md" className="absolute inset-0" />
          <Div className="absolute inset-0 flex flex-col justify-end p-[var(--appkit-space-4)]">
            <Heading level={3} color="inverse" size="lg" weight="bold">
              {pane.label}
            </Heading>
            {pane.countLabel && (
              <Span color="inverse" size="xs" className="mt-[var(--appkit-space-1)] opacity-80">
                {pane.countLabel}
              </Span>
            )}
          </Div>
        </Anchor>
      ))}
    </Div>
  );
}
