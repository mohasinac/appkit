"use client"
import { useRef, useEffect } from "react";
import { Div, Row, Span } from "../../ui";
import { resolveMediaUrl } from "../../utils/media-url";
import { useSiteSettings } from "../../core/hooks/useSiteSettings";

/**
 * Visual watermark overlay configuration. Mirrors the runtime shape of
 * `siteSettings.watermark` (see `SiteSettingsRecord` in admin schemas). The
 * server-side Sharp pipeline applies the same watermark to image media; this
 * client-side overlay covers `<video>` playback because there is no
 * Vercel-Hobby-budget ffmpeg pipeline to bake the watermark into the frames.
 */
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
      : (watermark ?? siteSettings?.watermark ?? null);

  if (!resolvedSrc) {
    return (
      <Row
        className="absolute inset-0 text-zinc-400 text-4xl" surface="subtle" align="center" justify="center"
        role="img"
        aria-label={alt}
      >
        <Span aria-hidden="true">🎬</Span>
      </Row>
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
 * Visual watermark overlay rendered on top of the playing `<video>`. Native
 * video controls render in a higher layer (the browser shadow DOM), so this
 * overlay sits below the controls but on top of the frames — visible enough
 * to assert provenance, transparent enough not to obscure content.
 *
 * `pointer-events-none` lets clicks pass through to the underlying video for
 * play/pause toggling.
 */
function MediaVideoWatermarkLayer({ config }: { config: MediaVideoWatermark }) {
  const widthPct = Math.max(0, Math.min(100, config.size ?? 30));
  const opacity = Math.max(0, Math.min(100, config.opacity ?? 20)) / 100;
  if (widthPct === 0 || opacity === 0) return null;
  // Anchor: bottom-right, with a small inset matching the image watermark
  // position. Width is a percentage of the container so the watermark scales
  // with the video, just like the server-side Sharp pipeline scales images.
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    right: "2%",
    bottom: "2%",
    width: `${widthPct}%`,
    pointerEvents: "none",
    opacity,
  };
  if (config.type === "image" && config.imageUrl) {
    return (
      <Div
        className="z-10"
        // audit-inline-style-ok: dynamic size + opacity from runtime site-settings
        style={containerStyle}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element, lir/no-raw-media-elements -- watermark image is already proxied via resolveMediaUrl; <MediaImage> would impose aspect-ratio + lazy-load that hurt the overlay */}
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
      // audit-inline-style-ok: dynamic size + opacity from runtime site-settings
      style={containerStyle}
      aria-hidden="true"
    >
      <Span
        className="block text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
        // audit-inline-style-ok: width-relative font-size so the text scales with the container
        style={{ fontSize: "0.8em", fontWeight: 700, textAlign: "right" }}
      >
        {config.text ?? "letitrip.in"}
      </Span>
    </Div>
  );
}

export default MediaVideo;
