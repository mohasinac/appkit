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

/*
 * 🛑 SUPERSEDED 2026-10-09 — seed photography is now LOCAL and costs nothing.
 *
 * The reasoning above is still correct about third-party fragility, and the
 * one-line-to-move property is still the goal. What it missed is the cost: every
 * one of these URLs was persisted as `/api/media/ext?url=…`, so every render of
 * every card was a Node lambda doing a third-party fetch (up to 2 × 4 s) plus a
 * full sharp decode/watermark/encode — ONE INVOCATION PER IMAGE. The homepage
 * alone referenced 160 of them at ~49.5 KB; `52.52 GB of origin transfer ÷
 * 49.5 KB ≈ 1.06 M` proxy responses in a week, which suspended the project
 * (HTTP 402).
 *
 * A placeholder is synthetic by definition, so there was never anything to
 * fetch. Six static tiles ship in `public/images/seed-tiles/`, chosen by the
 * same deterministic hash, and the homepage goes 160 images → 6.
 *
 * The trade accepted: the tile no longer renders the item's NAME. That text was
 * a genuine gain and it is lost here — but it cost a function invocation per
 * card to render text the card already displays beside the image, and `alt` still
 * carries it for assistive tech. `seedPhotoLabel` is kept and still exported for
 * exactly that use.
 *
 * 🛑 Do NOT reintroduce a third-party host here, and do NOT encode width/height
 * into the path — a per-size URL is a per-size CDN cache key, which is how 6
 * files become 400 again. `audit-media-proxy-hosts` blocks the first; this
 * comment is the only thing guarding the second.
 */
const SEED_TILE_PREFIX = "/images/seed-tiles/";

/**
 * Muted backgrounds, all dark enough for the same light foreground.
 *
 * Raw hex rather than theme tokens because an SVG served as the body of an
 * `<img>` has no stylesheet and no `var(--appkit-color-*)` in scope — the same
 * reason `_placeholder.ts` keeps its artwork in an asset file.
 *
 * 🛑 These six values ARE the filenames in `public/images/seed-tiles/`, and they
 * are mirrored a third time in `PLACEHOLDER_MEDIA_HOSTS`' sibling
 * `SEED_TILE_COLOURS` (`appkit/src/utils/media-url.ts`), which maps a legacy
 * stored `placehold.co` URL back to the same tile. Add a colour and all three
 * must move together; a missing one degrades to a deterministic fallback tile
 * rather than a broken image, so the failure mode is "less variety", never a 404.
 */
const SEED_PHOTO_COLOURS = ["1e293b", "334155", "3f3f46", "44403c", "312e81", "164e63"] as const;

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
export function seedPhoto(seed: string, _width?: number, _height?: number): string {
  const bg = SEED_PHOTO_COLOURS[seedHash(seed) % SEED_PHOTO_COLOURS.length];
  // Width/height are accepted and ignored. All 366 call sites pass them, and the
  // tiles carry `preserveAspectRatio="xMidYMid slice"` so one file fits every
  // aspect — baking the dimensions into the path would mint a separate cache
  // entry per size, which is the thing this change removes.
  return `${SEED_TILE_PREFIX}${bg}.svg`;
}
