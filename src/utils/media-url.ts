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

/* ── Placeholder imagery ─────────────────────────────────────────────────── */

/**
 * Local, static stand-ins for seed photography. Served straight out of
 * `public/` — no function, no upstream fetch, no sharp pipeline.
 *
 * 🛑 This is the single most load-bearing cost control in the app. Every seed
 * image used to resolve to `/api/media/ext?url=https://placehold.co/…`, i.e. a
 * Node lambda that fetched a third party (up to 2 × 4 s) and ran a full sharp
 * decode/watermark/encode — ONE INVOCATION PER IMAGE. Measured 2026-10-09: the
 * homepage referenced **160** such images at ~49.5 KB each, and
 * `52.52 GB of Fast Origin Transfer ÷ 49.5 KB ≈ 1.06 M` proxy responses in a
 * week. That is what suspended the project (HTTP 402).
 *
 * Six tiles, because the stored URL already encodes which of the six
 * `SEED_PHOTO_COLOURS` it was generated with — so the mapping needs no new
 * data and no migration. The homepage goes 160 images → 6.
 */
export const SEED_TILE_PREFIX = "/images/seed-tiles/";

/**
 * Must stay in lockstep with `SEED_PHOTO_COLOURS` in
 * `appkit/src/seed/_helpers/media.ts`, and with the filenames in
 * `public/images/seed-tiles/`. A colour missing here is not an error — it falls
 * back to a deterministic pick — so the failure mode is "less variety", never a
 * broken image.
 */
const SEED_TILE_COLOURS: readonly string[] = [
  "1e293b",
  "334155",
  "3f3f46",
  "44403c",
  "312e81",
  "164e63",
];

/**
 * Hosts that only ever serve synthetic placeholder imagery.
 *
 * These are the four the seed helper documents having cycled through as each
 * one fell over (picsum 503 on 2026-08-31, placekitten 521, loremflickr too
 * slow for the proxy's 4 s timeout). Watermarking a generated placeholder is
 * pointless, and proxying one costs a function invocation plus full origin
 * transfer for an image we can synthesise locally for free.
 */
const PLACEHOLDER_MEDIA_HOSTS: ReadonlySet<string> = new Set([
  "placehold.co",
  "placeholder.com",
  "via.placeholder.com",
  "picsum.photos",
  "fastly.picsum.photos",
  "placekitten.com",
  "loremflickr.com",
  "dummyimage.com",
]);

/** Deterministic 32-bit hash — same input, same tile, every render. */
function tileHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The inner `url=` of a stored `/api/media/ext?url=…` value, or null.
 *
 * This is what lets the fix reach data that is ALREADY in Firestore. `seedPhoto`
 * persisted the wrapped form for ~400 assets, and `resolveMediaUrl` used to hand
 * such a value straight back untouched — `new URL()` throws on the relative path
 * and the `catch` returns the input — so the proxy was entered on every render.
 * Unwrapping here fixes every stored row with no migration.
 */
function innerExtUrl(value: string): string | null {
  if (!value.startsWith(MEDIA_ENDPOINTS.EXT)) return null;
  const q = value.indexOf("?");
  if (q === -1) return null;
  try {
    return new URLSearchParams(value.slice(q + 1)).get("url");
  } catch (_err) {
    void normalizeError(_err);
    return null;
  }
}

/**
 * A local tile for `absUrl` when it points at a placeholder host, else undefined.
 *
 * placehold.co bakes its colours into the path (`/{w}x{h}/{bg}/{fg}/png`), so the
 * first 6-hex segment IS the background the fixture was generated with — the
 * size segment contains an `x` and cannot match, and the foreground comes after
 * the background, so `.find()` picks the right one.
 */
export function placeholderTileFor(absUrl: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(absUrl);
  } catch (_err) {
    void normalizeError(_err);
    return undefined;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (!PLACEHOLDER_MEDIA_HOSTS.has(host)) return undefined;
  const bg = parsed.pathname
    .split("/")
    .find((seg) => /^[0-9a-fA-F]{6}$/.test(seg))
    ?.toLowerCase();
  if (bg && SEED_TILE_COLOURS.includes(bg)) return `${SEED_TILE_PREFIX}${bg}.svg`;
  // Unknown or absent colour (picsum/placekitten carry none) — pick
  // deterministically from the path so the same fixture always gets the same
  // tile and the grid keeps its variety.
  const fallback = SEED_TILE_COLOURS[tileHash(parsed.pathname) % SEED_TILE_COLOURS.length];
  return `${SEED_TILE_PREFIX}${fallback}.svg`;
}

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
  /*
   * 🛑 Type-guard first: this predicate is reached through `.refine()` from two
   * schemas and from several hand-written call sites, so it receives whatever
   * the document actually holds — not whatever the signature says.
   *
   * Without this line a non-string reached `value.startsWith(...)` and threw
   * `TypeError: e.startsWith is not a function`, which killed the whole render
   * of the panel it was validating. Measured on production 2026-10-02: expanding
   * the Branding section of /admin/site threw exactly that and the section body
   * never appeared — so the Site Settings editor looked like it rendered no
   * fields for ANY section, and five checklist cases were blocked behind what
   * read as a missing feature.
   *
   * `!value` already caught null/undefined/"" and 0; an object or an array is
   * truthy with `length === undefined`, so `undefined > MAX` is false and
   * execution fell straight through to `.startsWith`.
   *
   * A VALIDATOR MUST REJECT, NEVER THROW. Returning false is the correct answer
   * for a non-string, and the warn keeps the real defect findable — some caller
   * is passing the wrong shape (a `{ url }` object where its `.url` was meant
   * is the obvious candidate) and that is a separate fix at the call site.
   */
  if (typeof value !== "string") {
    // eslint-disable-next-line no-console -- client-side; the server path has its own recorder
    console.warn(
      "[isStoredMediaRef] expected a string, received",
      Object.prototype.toString.call(value),
    );
    return false;
  }
  if (!value || value.length > MEDIA_URL_MAX_LENGTH) return false;
  if (value.startsWith(MEDIA_PROXY_PREFIX)) return true;
  // A local seed tile (`/images/seed-tiles/<hex>.svg`). Persistable: it is a
  // static asset we ship, so unlike the `/api/media/ext?url=` form rejected
  // below it is not a render-time transform and does not double-wrap.
  if (value.startsWith(SEED_TILE_PREFIX)) return true;
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
  /*
   * 🛑 Same type-guard as `isStoredMediaRef`, and for the same reason: this is a
   * RENDER-path helper called from `MediaImage`, every avatar, every logo and
   * every card, with whatever the document happens to hold. `!url` catches
   * null/undefined/""; an object or array is truthy and falls straight through
   * to `.startsWith`, throwing `TypeError: e.startsWith is not a function` and
   * taking out the whole subtree it was rendering.
   *
   * Returning undefined is the documented behaviour for a falsy input and is the
   * right answer here too — the caller renders its placeholder instead of
   * crashing. The warn names the shape so the real caller stays findable.
   */
  if (typeof url !== "string") {
    // eslint-disable-next-line no-console -- render path; a throw here kills the subtree
    console.warn(
      "[resolveMediaUrl] expected a string, received",
      Object.prototype.toString.call(url),
    );
    return undefined;
  }
  if (url.startsWith(PROXY_PREFIX)) return url;
  if (url.startsWith(SEED_TILE_PREFIX)) return url;
  // A blob:/data: URI is only ever valid in the tab that created it (e.g. a
  // freshly-selected file preview via URL.createObjectURL, or a FileReader
  // data URL fed to a crop modal). Routing it through the external-URL
  // watermark proxy would try to fetch it server-side and 400 — it must be
  // rendered directly instead.
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  /*
   * An ALREADY-WRAPPED `/api/media/ext?url=…` value, which is what the seed
   * catalogue persisted ~400 times. Unwrap and look at what it actually points
   * at: a placeholder host becomes a local tile (no function, no fetch), and
   * anything else falls through to the old behaviour of returning the wrapped
   * value untouched. Without this the branch below is unreachable for stored
   * data, because `new URL()` throws on the relative path.
   */
  const inner = innerExtUrl(url);
  if (inner) {
    const innerTile = placeholderTileFor(inner);
    if (innerTile) return innerTile;
    return url;
  }
  try {
    const parsed = new URL(url);
    // Synthetic placeholder imagery: never worth a function invocation. The
    // placeholder hosts and our own Storage hosts are disjoint sets, so this
    // can sit before the own-bucket branches without shadowing a real asset.
    const tile = placeholderTileFor(url);
    if (tile) return tile;
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
