"use client"
import { useRef, useEffect } from "react";
import { Div, Row, Span } from "../../ui";
import { resolveMediaUrl, getYouTubeVideoId } from "../../utils/media-url";
import { useSiteSettings } from "../../core/hooks/useSiteSettings";

/**
 * Visual watermark overlay configuration. Mirrors the runtime shape of
 * `siteSettings.watermark` (see `SiteSettingsRecord` in admin schemas). The
 * server-side Sharp pipeline applies the same watermark to image media; this
 * client-side overlay covers `<video>` playback because there is no
 * Vercel-Hobby-budget ffmpeg pipeline to bake the watermark into the frames.
 */
export type MediaVideoWatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "custom";

export interface MediaVideoWatermark {
  /** `"text"` renders a `<Span>` overlay; `"image"` renders a `<MediaImage>` (proxied). */
  type: "text" | "image";
  /** Text content when `type === "text"`. */
  text?: string;
  /** `/media/<slug>` URL when `type === "image"`. */
  imageUrl?: string;
  /** Percentage of the container's width occupied by the watermark (0–100). 0 disables. */
  size?: number;
  /** Percentage opacity (0–100). Default 20. */
  opacity?: number;
  /** Anchor preset — mirrors the server-side Sharp pipeline. Default `"center"`. */
  position?: MediaVideoWatermarkPosition;
  /** `position === "custom"` only: % of container width, from center. +right / -left. */
  offsetX?: number;
  /** `position === "custom"` only: % of container height, from center. +down / -up. */
  offsetY?: number;
}

export interface MediaVideoProps {
  /** Video URL. When undefined the fallback placeholder is rendered. */
  src: string | undefined;
  /** Poster / thumbnail URL shown before the video plays. */
  thumbnailUrl?: string;
  /** Accessible label for the video element. */
  alt?: string;
  /** Show native video controls (play, pause, volume, …). Defaults to `true`. */
  controls?: boolean;
  /** Autoplay with muted audio — allowed by browsers without user gesture. Defaults to `false`. */
  autoPlayMuted?: boolean;
  /** Whether the video should loop. Defaults to `false`. */
  loop?: boolean;
  /** Trim: seek to this time (in seconds) when the video loads. */
  trimStart?: number;
  /** Trim: pause the video when this time (in seconds) is reached. */
  trimEnd?: number;
  /** CSS `object-fit` applied to the <video> element. Defaults to `'cover'`. */
  objectFit?: "cover" | "contain";
  /**
   * Watermark overlay configuration. When omitted, the component reads the
   * runtime `siteSettings.watermark` config via `useSiteSettings()`. Pass `null`
   * to explicitly disable the overlay (e.g. inside the admin watermark
   * preview where the preview is the watermark itself).
   */
  watermark?: MediaVideoWatermark | null;
}

interface SiteSettingsWithWatermark {
  watermark?: MediaVideoWatermark;
  /** Resolved (marker → wordmark → text) watermark from `GET /api/site-settings` — preferred over the raw `watermark` field when present. */
  effectiveWatermark?: MediaVideoWatermark;
}

export function MediaVideo({
  src,
  thumbnailUrl,
  alt = "Video",
  controls = true,
  autoPlayMuted = false,
  loop = false,
  trimStart,
  trimEnd,
  objectFit = "cover",
  watermark,
}: MediaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";
  const resolvedSrc = resolveMediaUrl(src);
  const resolvedPoster = resolveMediaUrl(thumbnailUrl);
  const youtubeId = getYouTubeVideoId(src);

  // Apply trimStart on load
  useEffect(() => {
    const el = videoRef.current;
    if (!el || trimStart === undefined) return;
    const onLoaded = () => {
      el.currentTime = trimStart;
    };
    el.addEventListener("loadedmetadata", onLoaded);
    return () => el.removeEventListener("loadedmetadata", onLoaded);
  }, [trimStart]);

  // Enforce trimEnd
  useEffect(() => {
    const el = videoRef.current;
    if (!el || trimEnd === undefined) return;
    const onTimeUpdate = () => {
      if (el.currentTime >= trimEnd) {
        el.pause();
        el.currentTime = trimStart ?? 0;
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [trimEnd, trimStart]);

  // Watermark precedence: explicit prop > runtime site-settings. `null` opts out.
  const { data: siteSettings } = useSiteSettings<SiteSettingsWithWatermark>();
  const effectiveWatermark =
    watermark === null
      ? null
      : (watermark ?? siteSettings?.effectiveWatermark ?? siteSettings?.watermark ?? null);

  if (!resolvedSrc) {
    return (
      <Row
        // audit-color-pair-function-ok: deliberate faded placeholder-icon shade, not a readability regression
        className="absolute inset-0 text-zinc-400 text-[length:var(--appkit-text-4xl)]" surface="subtle" align="center" justify="center"
        role="img"
        aria-label={alt}
      >
        <Span aria-hidden="true">🎬</Span>
      </Row>
    );
  }

  // A YouTube watch/share URL (MediaUploadField's "YouTube" tab writes one)
  // is never a raw playable file — <video src> fails with "no supported
  // format" for it. Render the iframe embed instead of the native player.
  if (youtubeId) {
    const embedParams = new URLSearchParams({ playsinline: "1", rel: "0" });
    if (autoPlayMuted) { embedParams.set("autoplay", "1"); embedParams.set("mute", "1"); }
    if (loop) { embedParams.set("loop", "1"); embedParams.set("playlist", youtubeId); }
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?${embedParams.toString()}`}
        title={alt}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        src={resolvedSrc}
        poster={resolvedPoster}
        controls={controls}
        autoPlay={autoPlayMuted}
        muted={autoPlayMuted}
        loop={loop}
        playsInline
        aria-label={alt}
        className={`absolute inset-0 w-full h-full ${fitClass}`}
      />
      {effectiveWatermark ? <MediaVideoWatermarkLayer config={effectiveWatermark} /> : null}
    </>
  );
}

/**
 * Mirrors the server-side Sharp pipeline's 5 anchor presets + `"custom"`
 * %-offset-from-center (`resolveCompositePlacement` in
 * `src/app/api/media/_watermark.ts`) as CSS insets, so a video's live
 * overlay and its poster-frame-as-image watermark land in the same spot.
 * Default `"center"`, 0/0 offset — matches the server-side default too.
 */
function resolveWatermarkPlacementStyle(config: MediaVideoWatermark): React.CSSProperties {
  const position = config.position ?? "center";
  const inset = "2%";
  switch (position) {
    case "top-left":
      return { top: inset, left: inset };
    case "top-right":
      return { top: inset, right: inset };
    case "bottom-left":
      return { bottom: inset, left: inset };
    case "bottom-right":
      return { bottom: inset, right: inset };
    case "custom": {
      const offsetX = Math.max(-45, Math.min(45, config.offsetX ?? 0));
      const offsetY = Math.max(-45, Math.min(45, config.offsetY ?? 0));
      return {
        top: `calc(50% + ${offsetY}%)`,
        left: `calc(50% + ${offsetX}%)`,
        transform: "translate(-50%, -50%)",
      };
    }
    case "center":
    default:
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
}

/**
 * Visual watermark overlay rendered on top of the playing `<video>`. Native
 * video controls render in a higher layer (the browser shadow DOM), so this
 * overlay sits below the controls but on top of the frames — visible enough
 * to assert provenance, transparent enough not to obscure content.
 *
 * `pointer-events-none` lets clicks pass through to the underlying video for
 * play/pause toggling.
 */
function MediaVideoWatermarkLayer({ config }: { config: MediaVideoWatermark }) {
  // Fallbacks match the server-side Sharp pipeline's DEFAULT_SIZE/DEFAULT_OPACITY
  // (resolve-effective-watermark.ts) — these only kick in if no config is passed
  // at all; in practice callers read siteSettings.effectiveWatermark, which
  // always carries the real size/opacity.
  const widthPct = Math.max(0, Math.min(100, config.size ?? 10));
  const opacity = Math.max(0, Math.min(100, config.opacity ?? 10)) / 100;
  if (widthPct === 0 || opacity === 0) return null;
  // Width is a percentage of the container so the watermark scales with the
  // video, just like the server-side Sharp pipeline scales images — capped at
  // an absolute max so a large player (hero banner, carousel) doesn't render
  // an oversized mark just because the percentage of a big box is a big
  // number. Mirrors MAX_WATERMARK_PX in src/app/api/media/_watermark.ts.
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    width: `${widthPct}%`,
    maxWidth: "180px",
    pointerEvents: "none",
    opacity,
    ...resolveWatermarkPlacementStyle(config),
  };
  if (config.type === "image" && config.imageUrl) {
    return (
      <Div
        className="z-10"
        style={containerStyle}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- watermark image is already proxied via resolveMediaUrl; <MediaImage> would impose aspect-ratio + lazy-load that hurt the overlay */}
        <img
          src={resolveMediaUrl(config.imageUrl)}
          alt=""
          className="block w-full h-auto"
        />
      </Div>
    );
  }
  return (
    <Div
      className="z-10"
      style={containerStyle}
      aria-hidden="true"
    >
      <Span
        className="block text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
        style={{ fontSize: "0.8em", fontWeight: 700, textAlign: "right" }}
      >
        {config.text ?? "letitrip.in"}
      </Span>
    </Div>
  );
}

export default MediaVideo;
