"use client"
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "./Button";
import { Div } from "./Div";
import { Text, Span } from "./Typography";
import { MediaImage } from "../../features/media/MediaImage";
import { getYouTubeVideoId } from "../../utils/media-url";

const CLS_CLOSE_BTN = "w-10 h-10 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-error-surface text-white flex items-center justify-center";

/** Safari (desktop) only implements the pre-standard webkit-prefixed Fullscreen API. */
interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface WebkitFullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

export interface LightboxImage {
  src: string;
  alt?: string;
  caption?: string;
  /** Secondary line below caption (e.g. price or estimated value). */
  sub?: string;
  /** Badge rendered top-left on the enlarged image (e.g. "#1"). */
  badge?: string;
  /**
   * `"video"` renders a native `<video controls>` element instead of
   * `<MediaImage>` — `src` is used as-is (raw, unwrapped external URL; the
   * ext-proxy is image-only, see Root Cause #27), never passed through
   * `resolveMediaUrl()`. Defaults to `"image"`.
   */
  kind?: "image" | "video";
  /** `kind === "video"` only: poster frame shown before playback (already-resolved URL). */
  poster?: string;
}

export interface ImageLightboxProps {
  images: LightboxImage[];
  /** The index to open. Pass `null` or `-1` to close. */
  activeIndex: number | null;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  /** Show clickable thumbnail strip below the main image. */
  showThumbnails?: boolean;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 300;
const ZOOM_STEP = 20;

export function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onNavigate,
  showThumbnails = false,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex ?? 0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync external activeIndex and reset transforms
  useEffect(() => {
    if (activeIndex !== null && activeIndex >= 0) {
      setCurrentIndex(activeIndex);
      setZoom(100);
      setRotation(0);
    }
  }, [activeIndex]);

  const isOpen = activeIndex !== null && activeIndex >= 0 && images.length > 0;

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Track native Fullscreen API state so the toggle button + icon stay in sync
  // even when the user exits via Esc/browser chrome rather than our button.
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as WebkitFullscreenDocument;
      const fsEl = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(fsEl === overlayRef.current);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // Exit native fullscreen when the lightbox itself closes.
  useEffect(() => {
    const doc = document as WebkitFullscreenDocument;
    if (!isOpen && (document.fullscreenElement || doc.webkitFullscreenElement)) {
      (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())?.catch?.(() => {});
    }
  }, [isOpen]);

  const toggleFullscreen = useCallback(() => {
    const doc = document as WebkitFullscreenDocument;
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())?.catch?.(() => {});
      return;
    }
    const el = overlayRef.current as WebkitFullscreenElement | null;
    (el?.requestFullscreen?.() ?? el?.webkitRequestFullscreen?.())?.catch?.(() => {});
  }, []);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setCurrentIndex((prev) => {
        const next = (prev + dir + images.length) % images.length;
        onNavigate?.(next);
        return next;
      });
      setZoom(100);
      setRotation(0);
    },
    [images.length, onNavigate],
  );

  const adjustZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }, [adjustZoom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowLeft") { navigate(-1); return; }
      if (e.key === "ArrowRight") { navigate(1); return; }
      if (e.key === "+") { adjustZoom(ZOOM_STEP); return; }
      if (e.key === "-") { adjustZoom(-ZOOM_STEP); return; }
      if (e.key === "r" || e.key === "R") { setRotation((r) => (r + 90) % 360); return; }
      if (e.key === "0") { setZoom(100); setRotation(0); return; }
    },
    [onClose, navigate, adjustZoom],
  );

  // Focus overlay on open for keyboard to work
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => overlayRef.current?.focus());
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const image = images[currentIndex];
  const hasMultiple = images.length > 1;
  const youtubeId = image.kind === "video" ? getYouTubeVideoId(image.src) : null;

  const iconBtnClass =
    "w-10 h-10 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center";

  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="appkit-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        {/* Counter */}
        <Span size="sm" weight="medium" className="text-white/70">
          {hasMultiple ? `${currentIndex + 1} / ${images.length}` : ""}
        </Span>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm" type="button"
            onClick={() => adjustZoom(-ZOOM_STEP)}
            className={iconBtnClass}
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <button
            type="button"
            onClick={() => { setZoom(100); setRotation(0); }}
            className="text-white/70 hover:text-white text-xs font-mono min-w-[3rem] text-center"
            aria-label="Reset zoom"
          >
            {zoom}%
          </button>
          <Button
            variant="ghost" size="sm" type="button"
            onClick={() => adjustZoom(ZOOM_STEP)}
            className={iconBtnClass}
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="sm" type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className={iconBtnClass}
            aria-label="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="sm" type="button"
            onClick={toggleFullscreen}
            className={iconBtnClass}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost" size="sm" type="button"
            onClick={onClose}
            className={CLS_CLOSE_BTN}
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Prev button */}
      {hasMultiple && (
        <Button
          variant="ghost" size="sm" type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-white/30 text-white z-10 flex items-center justify-center"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-7 h-7" />
        </Button>
      )}

      {/* Image / video */}
      <div
        className="appkit-lightbox__image-wrap"
        style={{ cursor: zoom > 100 ? "grab" : "default" }}
      >
        {image.kind === "video" ? (
          youtubeId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&rel=0`}
              title={image.alt ?? "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="appkit-lightbox__img appkit-lightbox__video border-0"
            />
          ) : (
            <video
              src={image.src}
              poster={image.poster}
              controls
              playsInline
              aria-label={image.alt ?? "Video"}
              className="appkit-lightbox__img appkit-lightbox__video"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease",
              }}
            />
          )
        ) : (
          <MediaImage
            src={image.src}
            alt={image.alt ?? ""}
            size="hero"
            objectFit="contain"
            className="appkit-lightbox__img"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: "transform 0.2s ease",
            }}
          />
        )}
        {image.badge && (
          <Div className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white pointer-events-none">
            {image.badge}
          </Div>
        )}
      </div>

      {/* Caption */}
      {(image.caption || image.sub) && (
        <div className="flex-shrink-0 text-center px-8 pb-2">
          {image.caption && (
            <Text
              size="sm"
              variant="secondary"
              className="!text-white/80"
            >
              {image.caption}
            </Text>
          )}
          {image.sub && (
            <Text size="sm" variant="secondary" className="!text-white/50">
              {image.sub}
            </Text>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {showThumbnails && images.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 pb-3 justify-center">
          {images.map((thumb, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrentIndex(i);
                setZoom(100);
                setRotation(0);
                onNavigate?.(i);
              }}
              className={[
                "h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === currentIndex
                  ? "scale-110 border-white"
                  : "border-transparent opacity-50 hover:opacity-90",
              ].join(" ")}
              aria-label={`Go to image ${i + 1}`}
            >
              <MediaImage
                src={thumb.kind === "video" ? thumb.poster : thumb.src}
                alt={thumb.alt ?? `Image ${i + 1}`}
                size="thumbnail"
              />
            </button>
          ))}
        </div>
      )}

      {/* Next button */}
      {hasMultiple && (
        <Button
          variant="ghost" size="sm" type="button"
          onClick={() => navigate(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 p-0 !min-h-0 rounded-full bg-white/15 hover:bg-white/30 text-white z-10 flex items-center justify-center"
          aria-label="Next image"
        >
          <ChevronRight className="w-7 h-7" />
        </Button>
      )}

      {/* Keyboard hint */}
      <Div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-[11px] flex gap-4">
        <Span>← → navigate</Span>
        <Span>scroll to zoom</Span>
        <Span>R to rotate</Span>
        <Span>0 to reset</Span>
      </Div>
    </div>,
    document.body,
  );
}
