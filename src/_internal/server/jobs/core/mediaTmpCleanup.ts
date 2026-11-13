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
/*
 * The collection `MediaAssetsRepository` is constructed with
 * (`super("mediaAssets")`). Declared here rather than imported because this
 * job runs in the Cloud Functions bundle and must not pull a repository — and
 * therefore its whole provider graph — in for one collection name.
 */
const MEDIA_ASSETS_COLLECTION = "mediaAssets";

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
  /*
   * Reference-side counters, reported separately from the byte-side ones so
   * "bytes gone, row kept" is VISIBLE in the log rather than inferred. The
   * 2026-11-10 incident was diagnosed late precisely because one number
   * covered both halves.
   */
  let rowsDeleted = 0;
  let rowErrors = 0;

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

        /*
         * ── 🛑 DELETE THE REFERENCE TOO, NOT JUST THE BYTES ─────────────────
         *
         * This job is "Layer 2 — sweep Storage", and it swept Storage ONLY.
         * The `mediaAssets` row that points at the object was left behind, so
         * every sweep manufactured a dangling reference: a document whose
         * `storagePath` names bytes that no longer exist.
         *
         * ⚠ That is the exact failure already recorded here from 2026-11-10 —
         * a cleanup emptied the bucket and *"the Firestore rows SURVIVED …
         * so the database looked healthy and only the bytes were missing"*.
         * Nothing alerts on it, because a row is a row.
         *
         * Measured on production 2026-11-13 before this fix: 30 staged assets,
         * 27 with bytes present and **3 already dangling** — so the drift was
         * not hypothetical, it had started.
         *
         * 🛑 Scoped by EXACT `storagePath`, never by prefix. A prefix-scoped
         * delete is what wiped the whole bucket on 2026-11-10, because the
         * test upload and the real content shared a uid segment.
         *
         * ⚠ Failure here must NOT fail the sweep. The bytes are already gone;
         * leaving the row is the lesser, repairable half, and a throw would
         * abort the remaining files and strand far more objects than it saves.
         */
        try {
          const rows = await ctx.db
            .collection(MEDIA_ASSETS_COLLECTION)
            .where("storagePath", "==", file.name)
            .get();
          for (const row of rows.docs) {
            await row.ref.delete();
            rowsDeleted++;
          }
        } catch (rowError: unknown) {
          void normalizeError(rowError);
          rowErrors++;
          ctx.logger.error("Deleted tmp object but could not delete its mediaAssets row", rowError, {
            name: file.name,
          });
        }
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

  ctx.logger.info("Media tmp cleanup complete", { scanned, deleted, skipped, errors, rowsDeleted, rowErrors });
}
