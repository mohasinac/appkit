"use client";

import { resolveMediaUrl } from "../../utils/media-url";
import { Span } from "../../ui/components/Typography";

/**
 * MediaAudio — primitive for `<audio>` playback of internal media slugs or
 * external URLs.
 *
 * The audio file flows through `/api/media/<slug>` (internal) or
 * `/api/media/external?url=<signed>` (external) — same proxy that handles
 * image / video watermarking. Visible watermarks are out of scope for audio;
 * the proxy passes the bytes through unmodified.
 */
export type MediaAudioControls = "none" | "minimal" | "full";

export interface MediaAudioProps {
  /** Internal media slug or absolute external URL. */
  src: string | undefined;
  /** Accessible title. */
  title?: string;
  controls?: MediaAudioControls;
  loop?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";
}

export function MediaAudio({
  src,
  title,
  controls = "full",
  loop = false,
  autoPlay = false,
  muted = false,
  preload = "metadata",
}: MediaAudioProps) {
  const resolved = src ? resolveMediaUrl(src) : undefined;
  if (!resolved) {
    return (
      <Span
        role="img"
        aria-label={title ?? "Audio unavailable"}
        // audit-variant-ok: MediaAudio fallback chip — primitive owns its style.
        className="inline-flex items-center gap-1 text-xs text-[var(--appkit-color-text-muted)]"
      >
        🎵 {title ?? "Audio unavailable"}
      </Span>
    );
  }

  return (
    <audio
      src={resolved}
      title={title}
      controls={controls !== "none"}
      controlsList={controls === "minimal" ? "nodownload" : undefined}
      loop={loop}
      autoPlay={autoPlay}
      muted={muted}
      preload={preload}
      // audit-variant-ok: MediaAudio is the catalogued primitive for <audio>.
      className="block w-full"
    />
  );
}
