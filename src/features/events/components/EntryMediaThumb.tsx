"use client";

/**
 * One entry's cover thumbnail, and its media strip.
 *
 * ## 🛑 A PLAIN `<img>`, NOT `next/image`, and the reason is deployment-wide
 *
 * Entry media is stored in the host-agnostic relative form `/media/<shortId>`
 * — what `/api/media/finalize` returns, and what each deployment's
 * `/media/:path*` rewrite resolves. The media host is NOT a configured
 * `next/image` loader domain on the events app, so `next/image` would refuse
 * it at runtime while compiling perfectly. `renderMyEntriesPanel` on the
 * participate page already does exactly this, for exactly this reason.
 *
 * ⚠ `MediaImage` is also not used here. It resolves URLs through
 * `resolveMediaUrl()` and the image proxy, which is the right thing for
 * catalogue imagery and the wrong thing for a relative path the rewrite
 * already owns.
 *
 * ## Video covers
 *
 * A video item renders its own `<video>` with `preload="metadata"` and no
 * controls: the first frame is the cover, and the lightbox is where it is
 * actually played. Autoplaying forty entry videos in a grid is the obvious
 * failure mode of the alternative.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { Div } from "../../../ui/components/Div";
import { Span } from "../../../ui/components/Typography";
import type { PublicEntryMedia } from "../types";

export interface EntryMediaThumbProps {
  /**
   * How the thumbnail sits in its tile. Defaults to `"cover"`.
   *
   * 🛑 Deliberately NOT `"contain"`, unlike the entry DETAIL view. A grid of
   * uniform tiles is the point of the card listing — letterboxing every card
   * to its own aspect makes the gallery ragged, and the card is a doorway to
   * the full image rather than the thing being judged. The detail page is
   * where nothing may be trimmed.
   */
  fit?: "cover" | "contain";

  item?: PublicEntryMedia;
  /** Alt text fallback when the entrant supplied none. */
  fallbackAlt: string;
  className?: string;
}

export function EntryMediaThumb({
  item,
  fallbackAlt,
  className = "",
  fit = "cover",
}: EntryMediaThumbProps) {
  if (!item) {
    /*
     * An approved entry with no readable media. It should not happen —
     * `checkEntryMedia` requires an image on this contest — but an event
     * configured with `requireImage: false` is a legitimate configuration, and
     * a card that renders nothing at all looks like a broken image rather than
     * a deliberate state (Root Cause #33).
     */
    return (
      <Div
        className={`flex h-full w-full items-center justify-center bg-[var(--appkit-color-surface)] ${className}`}
        aria-hidden="true"
      >
        <Span size="sm" color="faint">
          No preview
        </Span>
      </Div>
    );
  }

  if (item.type === "video") {
    return (
      <video
        src={item.url}
        preload="metadata"
        muted
        playsInline
        aria-label={item.alt ?? fallbackAlt}
        className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.alt ?? fallbackAlt}
      loading="lazy"
      className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
    />
  );
}
