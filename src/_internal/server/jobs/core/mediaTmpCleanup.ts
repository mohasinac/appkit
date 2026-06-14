import { normalizeError } from "../../../../errors/normalize";
/**
 * Core: media tmp cleanup.
 *
 * Sweeps Firebase Storage for stale objects under the tmp/ prefix. Layer 2 of
 * the dual-layer scheme — Layer 1 is the form-level onAbort() DELETE call;
 * this job mops up anything that escaped (crashes, expired sessions).
 *
 * Safety invariants:
 *  - Only touches objects whose name starts with `tmp/`.
 *  - Only deletes objects older than `ttlHours` (default 24).
 *  - Idempotent: 404s on delete are swallowed (Layer 1 already removed it).
 */

import { getAdminStorageLite } from "../../../../providers/db-firebase/admin-storage-lite";
import type { JobContext } from "../runtime/types";

const TMP_PREFIX = "tmp/";
const DEFAULT_TTL_HOURS = 24;

function getBucket() {
  const bucketName =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET?.trim() ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  return bucketName ? getAdminStorageLite().bucket(bucketName) : getAdminStorageLite().bucket();
}

export async function runMediaTmpCleanup(ctx: JobContext): Promise<void> {
  const ttlHours = Number(ctx.env("MEDIA_TMP_TTL_HOURS") ?? DEFAULT_TTL_HOURS);
  const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

  ctx.logger.info("Starting media tmp cleanup", { prefix: TMP_PREFIX, ttlHours });

  let scanned = 0;
  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const bucket = getBucket();
    const [files] = await bucket.getFiles({ prefix: TMP_PREFIX, autoPaginate: true });
    scanned = files.length;
    ctx.logger.info("Objects under tmp prefix", { count: scanned });

    for (const file of files) {
      try {
        if (!file.name.startsWith(TMP_PREFIX)) {
          skipped++;
          continue;
        }
        const [metadata] = await file.getMetadata();
        const updated = (metadata.updated as string | undefined) ?? (metadata.timeCreated as string | undefined);
        if (!updated) {
          skipped++;
          continue;
        }
        if (new Date(updated) >= cutoff) {
          skipped++;
          continue;
        }
        await file.delete();
        deleted++;
      } catch (fileError: unknown) {
        void normalizeError(fileError);
        errors++;
        const code = (fileError as { code?: number } | null)?.code;
        if (code === 404) {
          continue;
        }
        ctx.logger.error("Failed to delete tmp file", fileError, { name: file.name });
      }
    }
  } catch (err) {
    ctx.logger.error("Fatal error during media tmp cleanup", err);
    throw err;
  }

  ctx.logger.info("Media tmp cleanup complete", { scanned, deleted, skipped, errors });
}
