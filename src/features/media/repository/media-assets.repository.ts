import { BaseRepository } from "../../../providers/db-firebase";

export interface MediaAssetDocument {
  /** SEO-friendly slug used in /media/{id} URLs (e.g. "product-image-charizard-1-20260805"). */
  id: string;
  /** Actual path inside the Firebase Storage bucket. Changes from tmp/ → media/ on finalize. */
  storagePath: string;
  /** Firebase Auth UID of the uploader. */
  uploadedBy: string;
  contentType: string;
  /** File size in bytes. */
  size: number;
  isPublic: boolean;
  /** staged = still in tmp/; finalized = moved to media/ by finalizeStagedMediaUrl. */
  status: "staged" | "finalized";
  /**
   * The media-filename context type this asset was uploaded under (e.g.
   * "catalogue-image", "product-image") — stamped at finalize time from the
   * same ctx.type already passed to generateMediaFilename(). Undefined for
   * every asset uploaded before this field existed. Lets the watermark
   * resolver distinguish "this image belongs to a personal catalogue" from
   * any other upload without parsing filename strings.
   */
  contextType?: string;
  /**
   * When the watermark was composited INTO the stored bytes, at upload time.
   *
   * 🛑 Absent means "legacy" and is the load-bearing default. Until 2026-10-19
   * `/api/media/[...slug]` sharp-decoded, composited and re-encoded EVERY image
   * response — the cost profile behind the HTTP 402 Fast Origin Transfer
   * suspension (Root Cause #104). Now `/api/media/finalize` bakes the mark once
   * and stamps this field, and the proxy skips the composite when it is set.
   *
   * So an asset uploaded before this existed has no field, the proxy watermarks
   * it on read exactly as it always did, and **no backfill is required** for the
   * 504 rows that predate it. A backfill can run later via the Async Job
   * Primitive, or never.
   *
   * It is written in the SAME operation that stores the watermarked bytes, so a
   * row can never claim a mark the object does not carry — which would show an
   * unwatermarked image, or double-watermark it the other way round.
   */
  watermarkedAt?: Date;
  /**
   * A7 — provenance concerns recorded for human review. See
   * `features/media/trust-signals.ts` for the vocabulary and, more
   * importantly, for what is deliberately NOT flagged.
   *
   * 🛑 ADVISORY. Nothing reads this to block an upload, hide a listing or
   * refuse a seller; it exists so a moderator can look. A heuristic that
   * auto-rejects refuses honest sellers on a filename.
   *
   * Absent means "not evaluated" (every row predating A7, and every non-image
   * asset), which is NOT the same as "clean" — a reader must not treat the
   * absence as a pass.
   */
  trustFlags?: string[];
  /**
   * A7 — 16-char hex dHash of the image, for near-duplicate detection.
   *
   * Perceptual, not cryptographic: stable across re-encoding and resizing, so
   * it answers "is this the same photograph" rather than "is this the same
   * file". Images only; absent when the hash could not be computed, which is
   * deliberately non-fatal.
   */
  dHash?: string;
  createdAt: Date;
}

export type MediaAssetCreateInput = Omit<MediaAssetDocument, "id" | "createdAt">;

function generateRand4(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const indices = new Uint8Array(4);
  globalThis.crypto.getRandomValues(indices);
  return Array.from(indices, (i) => chars[i % chars.length]).join("");
}

export class MediaAssetsRepository extends BaseRepository<MediaAssetDocument> {
  constructor() {
    super("mediaAssets");
  }

  async findByStoragePath(
    storagePath: string,
  ): Promise<MediaAssetDocument | null> {
    return this.findOneBy("storagePath", storagePath);
  }

  /**
   * A7 — assets sharing a dHash, for the cross-seller duplicate check.
   *
   * 🛑 BOUNDED, and exact-match only. An equality on `dHash` is served by
   * Firestore's automatic single-field index, so this needs no composite —
   * whereas a true nearest-neighbour search over 64-bit hashes would need
   * either a full scan or a BK-tree, and a full collection scan on every
   * upload is precisely the unbounded-read shape Rule #6 exists to prevent.
   *
   * 🛑 The trade is narrower than it first looks, and it was MEASURED rather
   * than assumed. Against the same source image:
   *
   *     resized to 220px wide     -> distance 0   (exact match CATCHES it)
   *     re-encoded jpeg q55       -> distance 3   (exact match MISSES it)
   *     a different bey entirely  -> distance 9
   *
   * So this online check reliably catches a RESIZE and will miss a re-encode.
   * An earlier revision of this comment claimed both produce an identical
   * hash; that was wrong. `dHashDistance` and `DHASH_DUPLICATE_MAX_DISTANCE`
   * are exported for an offline sweep that can afford the pairwise
   * comparison, which is where the distance-3 case gets caught.
   */
  async findByDHash(dHash: string, limit = 5): Promise<MediaAssetDocument[]> {
    if (!dHash) return [];
    const snapshot = await this.getCollection()
      .where("dHash", "==", dHash)
      .limit(limit)
      .get();
    return snapshot.docs.map((d) => this.mapDoc<MediaAssetDocument>(d));
  }

  /**
   * Create a new mediaAssets document with a collision-safe shortId.
   * Tries `preferredShortId` first, then appends a random 4-char suffix up to
   * MAX_ATTEMPTS times. Falls back to a base-36 timestamp suffix.
   */
  async createAsset(
    preferredShortId: string,
    data: MediaAssetCreateInput,
  ): Promise<MediaAssetDocument> {
    const MAX_ATTEMPTS = 5;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const shortId =
        i === 0 ? preferredShortId : `${preferredShortId}-${generateRand4()}`;
      const existing = await this.findById(shortId);
      if (!existing) {
        return this.createWithId(shortId, data);
      }
    }
    const fallbackId = `${preferredShortId}-${Date.now().toString(36)}`;
    return this.createWithId(fallbackId, data);
  }

  /**
   * Update storagePath + status when the file is promoted from tmp/ to media/.
   * Called by finalizeStagedMediaUrl.
   */
  async promoteToFinalized(
    shortId: string,
    finalStoragePath: string,
  ): Promise<void> {
    await this.update(shortId, {
      storagePath: finalStoragePath,
      status: "finalized",
    });
  }
}

export const mediaAssetsRepository = new MediaAssetsRepository();
