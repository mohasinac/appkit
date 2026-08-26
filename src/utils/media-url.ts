import { MEDIA_ENDPOINTS } from "../constants/api-endpoints";
import { normalizeError } from "../errors/normalize";

/**
 * Single source of truth for the Firebase Storage host literal. Every other
 * appkit + consumer module that needs to detect or allowlist this host
 * imports this constant — `audit-firestore-storage-urls` allowlists this
 * file as the sole literal declaration site.
 */
export const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";
/** Google Cloud Storage host (used by public-asset URLs). */
export const GCS_HOST = "storage.googleapis.com";
const PROXY_PREFIX = "/media/";

/**
 * Our own Storage bucket, as it appears as the first path segment of a
 * `storage.googleapis.com` URL. Only URLs pointing at THIS bucket may have that
 * segment stripped and be rewritten to `/media/<path>` — see the GCS branch
 * below for why assuming every GCS URL is ours is a live 404.
 */
const OWN_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

export interface ResolveMediaUrlOptions {
  /**
   * When false, a URL we do not own is returned UNCHANGED instead of being sent
   * to `/api/media/ext`. That proxy is image-only (it 400s on `video/mp4`), so
   * every non-image caller must pass false — see `resolveVideoUrl`.
   * @default true
   */
  externalProxy?: boolean;
}

/**
 * Normalise any image URL so it goes through the watermark proxy:
 *  - /media<path>          → return as-is (already proxied via Firebase Storage)
 *  - blob: / data: URI     → return as-is (local-only, never fetchable server-side)
 *  - Firebase Storage URL  → extract /o/ path → /media/<path>
 *  - GCS URL for OUR bucket → drop the bucket segment → /media/<path>
 *  - Any other absolute URL → /api/media/ext?url=<encoded> (ext watermark proxy),
 *                             or unchanged when `externalProxy: false`
 *  - Relative URI          → return as-is
 *  - Falsy                 → undefined
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  opts?: ResolveMediaUrlOptions,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith(PROXY_PREFIX)) return url;
  // A blob:/data: URI is only ever valid in the tab that created it (e.g. a
  // freshly-selected file preview via URL.createObjectURL, or a FileReader
  // data URL fed to a crop modal). Routing it through the external-URL
  // watermark proxy would try to fetch it server-side and 400 — it must be
  // rendered directly instead.
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(FIREBASE_STORAGE_HOST)) {
      const m = parsed.pathname.match(/\/o\/([^?]+)/);
      if (m) return `${PROXY_PREFIX}${decodeURIComponent(m[1])}`;
    }
    if (parsed.hostname === GCS_HOST) {
      // Path shape: /<bucket>/<object-path...> — drop the bucket segment,
      // proxy the rest like a Firebase Storage URL (consistent watermarking
      // + caching instead of falling through to the external-URL proxy).
      //
      // ONLY for our own bucket. This branch used to strip the first segment of
      // ANY storage.googleapis.com URL, so Google's public sample bucket
      //   https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
      // became /media/sample/BigBuckBunny.mp4 — an object that has never existed
      // in our bucket — and 404'd on the homepage hero carousel.
      const parts = parsed.pathname.replace(/^\//, "").split("/");
      if (parts.length > 1 && OWN_STORAGE_BUCKET && parts[0] === OWN_STORAGE_BUCKET) {
        const objectPath = parts.slice(1).join("/");
        return `${PROXY_PREFIX}${decodeURIComponent(objectPath)}`;
      }
    }
    // Not ours. The ext proxy watermarks IMAGES only and 400s on anything else,
    // so a non-image caller opts out and gets the original URL back.
    return opts?.externalProxy === false ? url : MEDIA_ENDPOINTS.EXT_URL(url);
  } catch (_err) {
    void normalizeError(_err); // URL constructor throws for non-URL strings (e.g., relative paths) — return original
    return url;
  }
}

/**
 * Resolve a VIDEO src.
 *
 * Same rules as `resolveMediaUrl` for media we own — a Firebase Storage or
 * own-bucket GCS URL still becomes `/media/<path>`, and the `[...slug]` proxy
 * raw-pipes non-images — but a third-party URL is returned untouched rather
 * than routed through `/api/media/ext`, which is image-only and 400s on
 * `video/mp4` (Root Cause #27).
 *
 * Use this for anything that ends up as a `<video src>`. Posters and thumbnails
 * are images and stay on `resolveMediaUrl`.
 */
export function resolveVideoUrl(url: string | null | undefined): string | undefined {
  return resolveMediaUrl(url, { externalProxy: false });
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
]);

/**
 * Extracts the 11-char YouTube video ID from a watch/share/embed URL, or
 * `null` when `url` isn't a recognized YouTube URL. A video field can be
 * sourced via `MediaUploadField`'s "YouTube" tab (see `showYoutube` there),
 * which stores a `youtube.com/watch?v=...` URL — that URL is never a raw
 * playable media file, so every `<video src>` renderer (`MediaVideo`,
 * `ImageLightbox`) must check this first and fall back to an iframe embed.
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (!YOUTUBE_HOSTS.has(host)) return null;
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;
    const embedMatch = parsed.pathname.match(/\/embed\/([\w-]{11})/);
    if (embedMatch) return embedMatch[1];
    return null;
  } catch (_err) {
    void normalizeError(_err);
    return null;
  }
}
