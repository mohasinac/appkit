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

/**
 * The canonical stored form of every media reference: `/media/<slug>`.
 *
 * `POST /api/media/finalize` mints exactly this, `next.config.js` rewrites
 * `/media/:path*` → `/api/media/:path*`, and CLAUDE.md § Media Architecture
 * makes it mandatory ("never write raw firebasestorage.googleapis.com URLs
 * into Firestore"). Exported so validation can name the same prefix the
 * resolver below branches on, instead of re-typing the literal.
 */
export const MEDIA_PROXY_PREFIX = "/media/";
const PROXY_PREFIX = MEDIA_PROXY_PREFIX;

/** Cap for any stored media reference. Matches the previous schema bound. */
export const MEDIA_URL_MAX_LENGTH = 2048;

/**
 * Absolute hosts a stored media reference may point at.
 *
 * These exist for BACK-COMPAT only — rows written before the `/media/` proxy,
 * and `seedExtMedia()` fixtures pointing at third-party sample assets. New
 * writes should always be producing `/media/<slug>`. This list was previously
 * duplicated in `appkit/src/validation/schemas.ts` and
 * `src/validation/request-schemas.ts`; it lives here now so there is one copy.
 */
export const APPROVED_MEDIA_DOMAINS: readonly string[] = [
  FIREBASE_STORAGE_HOST,
  GCS_HOST,
  "res.cloudinary.com",
  "images.unsplash.com",
];

export const MEDIA_URL_MESSAGE =
  "Must be a stored media reference (/media/<slug>) or a URL on an approved CDN domain";

/**
 * Is `value` something we are willing to PERSIST as a media reference?
 *
 * The single definition of that rule — `mediaUrlSchema` in both validation
 * modules refines on it, and everything that stores an image/video URL should
 * go through one of those.
 *
 * Accepts:
 *  - `/media/<slug>` — the canonical form (`/api/media/finalize` output);
 *  - an absolute URL on an approved host — see `APPROVED_MEDIA_DOMAINS`.
 *
 * Rejects:
 *  - `blob:` / `data:` — valid only in the tab that created them. Persisting
 *    one stores a reference that is already dead by the time anyone reads it;
 *  - `/api/media/ext?url=…` — a RENDER-time transform produced by
 *    `resolveMediaUrl` below. Storing it double-wraps on the next render and
 *    pins the value to a proxy route rather than to the asset;
 *  - anything else, including bare relative paths that are not `/media/`.
 *
 * NOTE this is deliberately a strict SUPERSET of the rule it replaced (which
 * was `.url()` + an approved-host check). That old rule rejected the canonical
 * `/media/<slug>` form outright — which is what made every avatar save fail —
 * while happily accepting the raw Storage URLs CLAUDE.md bans. No value that
 * validated before stops validating now.
 */
export function isStoredMediaRef(value: string): boolean {
  if (!value || value.length > MEDIA_URL_MAX_LENGTH) return false;
  if (value.startsWith(MEDIA_PROXY_PREFIX)) return true;
  if (value.startsWith("blob:") || value.startsWith("data:")) return false;
  if (value.startsWith(MEDIA_ENDPOINTS.EXT)) return false;
  try {
    const { hostname } = new URL(value);
    return APPROVED_MEDIA_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch (_err) {
    void normalizeError(_err); // not an absolute URL, and not /media/ — reject
    return false;
  }
}

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
