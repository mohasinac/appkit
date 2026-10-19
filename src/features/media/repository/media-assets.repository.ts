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
