"use client";

import { useRef, useEffect } from "react";
import { Div, Span } from "../../ui";

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
}: MediaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

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

  if (!src) {
    return (
      <Div
        className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-slate-800 text-zinc-400 text-4xl"
        role="img"
        aria-label={alt}
      >
        <Span aria-hidden="true">🎬</Span>
      </Div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={thumbnailUrl}
      controls={controls}
      autoPlay={autoPlayMuted}
      muted={autoPlayMuted}
      loop={loop}
      playsInline
      aria-label={alt}
      className={`absolute inset-0 w-full h-full ${fitClass}`}
    />
  );
}

export default MediaVideo;
