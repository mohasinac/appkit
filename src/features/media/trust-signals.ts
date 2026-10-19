/**
 * Provenance signals on uploaded imagery — plan A7.
 *
 * ## 🛑 A FLAG, never a rejection
 *
 * Nothing here blocks an upload or hides a listing. Every signal is recorded
 * on the `mediaAssets` row for a human to look at, because every one of them
 * has a legitimate explanation: a seller may genuinely own the Amazon listing
 * the photo came from, and an AI-generated image is a reasonable choice for an
 * art listing's mock-up. Auto-rejecting on a heuristic means refusing honest
 * sellers on a filename.
 *
 * ## What is grounded in measurement
 *
 * From the fifteen-site competitor crawl
 * (`docs/research/competitor-crawl-2026-10/images.md`):
 *
 *   bladekingbeys — **138 images named with Amazon's CDN pattern**
 *                   (`..._AC_SL1500_.jpg`) plus `ChatGPT-Image-*.png` files.
 *                   A storefront built from other people's product shots.
 *
 * ## 🛑 What is deliberately NOT a signal
 *
 * `rn-image_picker_lib_temp_*` (React Native's image picker) and
 * `WhatsApp-Image-*` are what REAL sellers' uploads look like — measured,
 * toycollectorsindia and beyyuniverse upload exactly that way, and
 * beyyuniverse's entire catalogue is `WhatsApp-Image-*.jpeg`. Flagging them
 * would put a flag on nearly every honest phone upload, which trains
 * moderators to dismiss the queue — and a queue nobody reads is worse than no
 * queue, because it looks like oversight.
 *
 * That asymmetry is the whole design: flag the patterns that indicate the
 * image came from someone ELSE'S listing, never the ones that merely indicate
 * it came from a phone.
 */

/** One recorded provenance concern. Stable strings — they are persisted. */
export const MEDIA_TRUST_FLAG = {
  /** Filename carries Amazon's CDN size suffix, e.g. `..._AC_SL1500_.jpg`. */
  AMAZON_CDN_FILENAME: "amazon-cdn-filename",
  /** Filename is an AI image generator's default output name. */
  AI_GENERATED_FILENAME: "ai-generated-filename",
  /**
   * Byte-level near-duplicate of an image a DIFFERENT uploader already has.
   *
   * Same-uploader duplicates are normal and are NOT flagged — a seller
   * reusing one photo across their own variants is ordinary behaviour.
   */
  CROSS_SELLER_DUPLICATE: "cross-seller-duplicate",
} as const;

export type MediaTrustFlag =
  (typeof MEDIA_TRUST_FLAG)[keyof typeof MEDIA_TRUST_FLAG];

/*
 * `_AC_` is Amazon's image-transform marker and `_SL<digits>_` its size
 * directive; together they are unmistakable and do not occur in ordinary
 * filenames. Matching `_AC_` alone would false-positive on anything with those
 * letters between underscores.
 */
const AMAZON_CDN_RX = /_AC_[A-Z]{0,4}\d*_|_SL\d{3,4}_/;

/*
 * Default output names from the common generators. Anchored to the START so a
 * seller who writes "chatgpt-image-of-my-bey.jpg" by hand is not caught by a
 * substring — the signal is "this is the tool's untouched default", not "the
 * word appears".
 */
const AI_FILENAME_RX =
  /^(?:chatgpt-image-|dall[·e-]*e-|midjourney_|stable-?diffusion-|gemini-generated-image)/i;

/**
 * Provenance flags derivable from the filename alone.
 *
 * Takes the ORIGINAL client filename, not the storage path — our own paths are
 * content-derived slugs (§ Media Filename Slug Patterns) and carry none of
 * this.
 */
export function filenameTrustFlags(originalFilename: string | undefined | null): MediaTrustFlag[] {
  if (!originalFilename) return [];
  const name = originalFilename.trim();
  if (!name) return [];
  const flags: MediaTrustFlag[] = [];
  if (AMAZON_CDN_RX.test(name)) flags.push(MEDIA_TRUST_FLAG.AMAZON_CDN_FILENAME);
  if (AI_FILENAME_RX.test(name)) flags.push(MEDIA_TRUST_FLAG.AI_GENERATED_FILENAME);
  return flags;
}

/**
 * Hamming distance between two hex dHashes — the number of differing bits.
 *
 * 0 is byte-identical-after-downscale; under ~5 is "the same photograph,
 * re-encoded or lightly cropped". Returns `null` when the two cannot be
 * compared (different lengths, non-hex), because a fabricated distance would
 * feed a flag.
 */
export function dHashDistance(a: string | undefined, b: string | undefined): number | null {
  if (!a || !b || a.length !== b.length) return null;
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = Number.parseInt(a[i]!, 16);
    const y = Number.parseInt(b[i]!, 16);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    let diff = x ^ y;
    while (diff) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance;
}

/**
 * How close two dHashes must be to count as the same photograph.
 *
 * 🛑 Deliberately TIGHT, and the number comes from measurement rather than
 * from the usual "distance < 10" folklore. Against one real catalogue image:
 *
 *     resized to 220px wide    -> 0
 *     re-encoded jpeg q55      -> 3
 *     a DIFFERENT bey          -> 9
 *
 * So the usable gap is 3-vs-9, which is real but not generous: product
 * photography is self-similar (same item class, same white background, same
 * angle), so a loose threshold here is a flag GENERATOR rather than a signal,
 * and a queue full of false flags is worse than no queue because it looks like
 * oversight. 5 sits above the re-encode and well below the different-item
 * case.
 */
export const DHASH_DUPLICATE_MAX_DISTANCE = 5;
