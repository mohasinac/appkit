/**
 * Seed-time media URL helper.
 *
 * Wraps a 3rd-party image/video URL in the /api/media/ext proxy path so
 * seed data never persists raw upstream URLs. The proxy adds watermarking,
 * survives upstream rate-limits, and keeps CSP / image hosts under our
 * control.
 *
 * Companion runtime helper: `resolveMediaUrl()` in ../../utils/media-url.ts
 * — defends consumers that still see raw URLs (e.g. live Firestore reads
 * from older docs). Both produce the same `/api/media/ext?url=<encoded>`
 * shape for external https URLs.
 *
 * Idempotent: already-proxied URLs (`/media/...` or `/api/media/ext?url=...`)
 * pass through untouched, so wrapping a wrapped URL is safe.
 */
import { MEDIA_ENDPOINTS } from "../../constants/api-endpoints";

const PROXY_PREFIX = "/media/";
// audit-hardcoded-api-routes-ok: idempotency prefix check for MEDIA_ENDPOINTS.EXT_URL's own output shape, not a call site
const EXT_PREFIX = "/api/media/ext?url=";

export function seedExtMedia(url: string): string {
  if (url.startsWith(PROXY_PREFIX)) return url;
  if (url.startsWith(EXT_PREFIX)) return url;
  return MEDIA_ENDPOINTS.EXT_URL(url);
}

/* ── Seed photography ────────────────────────────────────────────────────── */

/*
 * WHY THIS EXISTS
 *
 * The seed catalogue used to name its image host **409 times**, in 30 files, as
 * `https://picsum.photos/seed/<seed>/<w>/<h>` literals. On 2026-08-31 picsum
 * went down — 503 from its origin AND its Fastly CDN — and because the host was
 * written into every URL rather than referenced from one place, virtually every
 * image on the production site broke at once and there was no single edit that
 * could move them.
 *
 * That is the actual defect. A third party going down is not preventable; being
 * unable to react to it in one line is.
 *
 * Measured the same day, direct: picsum 503 · fastly.picsum 503 (10.5s) ·
 * placekitten 521 · loremflickr 200 but 5.4s, which exceeds the proxy's own 4s
 * fetch timeout · placehold.co 200 in 0.58s. Hence placehold.co.
 *
 * It renders the item's own NAME on the tile, which is a real gain over random
 * photography for a demo catalogue: every card now says what it is, and nobody
 * can mistake seeded data for real inventory.
 */

/** The one place a seed image host is named. Changing it is a one-line edit. */
const SEED_PHOTO_HOST = "https://placehold.co";

/**
 * Muted backgrounds, all dark enough for the same light foreground.
 *
 * Raw hex rather than theme tokens because these are baked into a URL that a
 * third party renders — no stylesheet and no CSS custom property is in scope.
 */
const SEED_PHOTO_COLOURS = ["1e293b", "334155", "3f3f46", "44403c", "312e81", "164e63"] as const;
const SEED_PHOTO_FG = "f8fafc";

/** Deterministic 32-bit hash. Same seed, same colour, every reseed. */
function seedHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Turn a seed key into something a person would read.
 *
 * `art-image-dranzer-phoenix-2-20260817` → `Dranzer Phoenix`
 *
 * Strips the trailing `-YYYYMMDD` stamp, a trailing image index, and the
 * leading `<kind>-image-` prefix that every seed key carries — all of which are
 * bookkeeping, not the name of the thing.
 */
export function seedPhotoLabel(seed: string): string {
  const cleaned = seed
    .replace(/-\d{8}$/, "")
    .replace(/-\d+$/, "")
    .replace(/^(?:product|art|sticker|stickers|auction|preorder|prizedraw|classified|digitalcode|live|blog|event|store|user|category|brand|bundle|group|review|ad|carousel|slide)-(?:image|cover|banner|logo|avatar|photo)-/, "")
    .replace(/^(?:image|cover|banner|logo|avatar|photo)-/, "")
    .replace(/-/g, " ")
    .trim();
  if (!cleaned) return "LetItRip";
  return cleaned.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * A deterministic, labelled placeholder image for seed data, already wrapped in
 * the media proxy.
 *
 * Deterministic on purpose — Root Cause #25: a seed file is re-executed on every
 * `appkit-seed` invocation, so anything non-stable here would give the same
 * fixture a different URL on every run.
 */
export function seedPhoto(seed: string, width: number, height: number): string {
  const bg = SEED_PHOTO_COLOURS[seedHash(seed) % SEED_PHOTO_COLOURS.length];
  const text = encodeURIComponent(seedPhotoLabel(seed));
  return seedExtMedia(
    `${SEED_PHOTO_HOST}/${width}x${height}/${bg}/${SEED_PHOTO_FG}/png?text=${text}`,
  );
}
