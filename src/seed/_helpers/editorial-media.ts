/**
 * Slot key -> published image URL, for editorial seed fixtures.
 *
 * The image pipeline that fills these slots lives in the consumer repo:
 *
 *   scripts/fetch-editorial-images.mjs    Wikimedia Commons -> staging cache
 *   scripts/fetch-elevate-bit-image.mjs   beyblade.fandom.com -> staging cache
 *   scripts/push-editorial-images.mjs     cache -> Storage + mediaAssets rows
 *
 * ── 🛑 TWO KINDS OF SLOT, AND THE DIFFERENCE MATTERS ──────────────────────
 *
 * Most slots are FETCHED, so their URL is just `/media/<slot key>` — the
 * shortId and the slot key are the same string by construction.
 *
 * The Beyblade ones are REUSED: they point at photographs this project
 * already owns, from the taxonomy and parts pipelines. Commons has almost no
 * Beyblade photography and returns the SAME U.S. Air Force crowd shot for
 * every Beyblade query, so fetching those would have put one stock photo on
 * six different articles — each reporting success. Reuse is both cheaper and
 * better.
 *
 * 🛑 This map is MIRRORED in `scripts/lib/editorial-image-manifest.mjs`
 * (`REUSED_MEDIA`), which is what the push script verifies against live
 * Firestore before writing anything. They must agree. They are two files
 * because one is TypeScript inside the published package and the other is a
 * plain `.mjs` the Node scripts import without a build step — and the audit
 * that would catch the drift is `push-editorial-images.mjs` itself, which
 * fails loudly on a `/media/` id with no `mediaAssets` row.
 *
 * @tag domain:blog,events
 * @tag layer:seed
 * @tag access:server-only
 */

/**
 * Slots served from images already in the bucket.
 *
 * 🛑 DELIBERATELY EMPTY since 2026-10-21. It held 14 Beyblade slots pointing
 * at catalogue photography, which worked but meant three images each served
 * two different articles — visible duplicates on the blog index — and made
 * the editorial pages look like the shop. Every slot is now a distinct item
 * shot fetched by `scripts/fetch-vertical-item-images.mjs`, so they all
 * resolve to `/media/<slot key>` through the fallback below.
 */
const REUSED_MEDIA: Record<string, string> = {};

/**
 * The published URL for an editorial image slot.
 *
 * 🛑 Never `seedExtMedia()` and never a raw upstream URL. Root Cause #104:
 * persisting `/api/media/ext?url=<third party>` makes every render a Node
 * lambda plus an upstream fetch plus a sharp re-encode — ~400 of those
 * contributed 52.52 GB of Fast Origin Transfer against a 10 GB allowance and
 * suspended the project. `/media/<shortId>` streams from our own bucket behind
 * a 30-day immutable cache instead.
 */
export function editorialImage(slotKey: string): string {
  return REUSED_MEDIA[slotKey] ?? `/media/${slotKey}`;
}

/*
 * ── 🛑 CHANGING AN IMAGE MEANS CHANGING ITS KEY ───────────────────────────
 *
 * `/api/media/[...slug]` answers `Cache-Control: public, max-age=2592000,
 * immutable`. Under `immutable` the URL *is* the version identifier: new
 * bytes uploaded to the same shortId are never re-fetched for the life of the
 * cache entry, at any edge that already has one.
 *
 * Measured 2026-10-21, rebranding the cashback event for Diwali. The obvious
 * move was to keep `event-cover-cashback-10` so the Storage object and the
 * `mediaAssets` row were not orphaned — which is sound reasoning and produced
 * a bug anyway:
 *
 *   Firestore  → the Diwali copy, correct
 *   Storage    → the fireworks, correct (mean RGB 107,98,92)
 *   The page   → the ₹2000 banknote, `X-Vercel-Cache: HIT`, `age=2890`,
 *                mean RGB 188,146,173
 *
 * Everything was right except what anyone could actually see, and no check in
 * this repo looks at rendered pixels. The fix was a NEW key
 * (`event-cover-diwali-fireworks`), which is self-healing because nothing has
 * ever cached that URL.
 *
 * So: a slot's key names its CONTENT, not its slot. Re-cropping or re-sourcing
 * an image is a new key; the old object stays uploaded and unreferenced, which
 * costs a few KB and is the honest price of an immutable cache.
 *
 * 🛑 Do NOT "fix" this by lowering the TTL. That turns every product image
 * into a repeat function invocation, which is Root Cause #104 — ~900K proxy
 * responses and 52.52 GB of origin transfer against a 10 GB allowance, and a
 * suspended project.
 */
