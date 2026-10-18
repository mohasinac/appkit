/*
 * WHY: Rendering parts is the only embarrassingly parallel stage, and the only
 *      one that cannot fit one invocation at `precise`/`max` on a 34 MP scan
 *      with sixty parts.
 * WHAT: One shard's slice of the parts, then its vote in the finalizer
 *       election.
 *
 * 🛑 Owns the `parts` TRACE_STAGE for audit-sticker-trace-progress R2.
 *
 * 🛑 Per-part progress is RTDB-ONLY, via emitPartProgress. A Firestore event
 * per part would be ~60 writes per run instead of ~10 — 6x the write budget to
 * say something the live bar already shows and the history does not need.
 *
 * EXPORTS: runShard, ShardDeps
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:functions/consumer-functions
 * @tag sideEffects:firestore,storage,rtdb
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { stickerSheetsRepository } from "../../../../features/sticker-trace/repository/sticker-sheets.repository";
import type { StickerTraceTaskDocument } from "../../../../features/sticker-trace/schemas/firestore";
import type { ImageCodec } from "../../../shared/features/sticker-trace/codec";
import type { Rect } from "../../../shared/features/sticker-trace/types";
import { completeShardAndMaybeElectFinalizer } from "./fanout";
import { emitPartProgress, emitProgress } from "./progress";

export interface ShardDeps {
  codec: ImageCodec;
  readScan: (assetPath: string) => Promise<Uint8Array>;
  readGeometry: (runId: string, sheetId: string) => Promise<{
    workingSize: Rect;
    parts: { ordinal: number; bbox: Rect }[];
  }>;
  /** Rasterise one part's path into an alpha mask at full resolution. */
  rasterise: (ordinal: number, bbox: Rect, scale: number) => Promise<Uint8Array>;
  writeArtifact: (input: {
    sheetId: string;
    runId: string;
    name: string;
    contentType: string;
    body: Uint8Array;
  }) => Promise<{ assetPath: string }>;
}


/**
 * One promoted part at full resolution.
 *
 * Extracted because the inline version sat at brace-depth 6 and tripped
 * audit-code-quality's DEEP_NESTING — which was a fair call: the render is a
 * distinct step, and naming it makes the mode branch in `runShard` read as the
 * decision it is rather than as two blocks of plumbing.
 */
async function writeFullPart(
  deps: ShardDeps,
  input: {
    sheetId: string;
    runId: string;
    ordinal: number;
    source: Uint8Array;
    region: Rect;
    alpha: Uint8Array;
  },
): Promise<void> {
  const png = await deps.codec.encodePngRegion(input.source, input.region, input.alpha);
  await deps.writeArtifact({
    sheetId: input.sheetId,
    runId: input.runId,
    name: `part-${String(input.ordinal).padStart(3, "0")}.png`,
    contentType: png.contentType,
    body: png.bytes,
  });
}

/**
 * Render this shard's parts, then report done.
 *
 * 🛑 `mode` decides resolution, and that is the single decision keeping this
 * feature inside the Storage allowance. `thumb` renders review thumbnails into
 * ONE sprite atlas; `full` renders full-resolution parts and only runs when a
 * human promotes a run. Rendering full-res on every run costs ~600 MB per
 * sheet across a tuning session against ~95 MB — roughly 8 sheets inside 5 GB
 * instead of 52.
 *
 * 🛑 The shard reports done even when a part THROWS. Leaving the counter short
 * means the finalizer is never elected and the run sits RUNNING forever — a
 * stuck run is worse than a run that completes reporting a bad part, because
 * nothing sweeps it and the RTDB channel prunes within the hour.
 */
export async function runShard(
  task: StickerTraceTaskDocument,
  deps: ShardDeps,
): Promise<void> {
  const { runId, sheetId } = task;
  let rendered = 0;
  const failures: number[] = [];

  try {
    const sheet = await stickerSheetsRepository.findByIdOrFail(sheetId);
    const geometry = await deps.readGeometry(runId, sheetId);
    const source = await deps.readScan(sheet.sourceScan.assetPath);

    /*
     * 🛑 Scale is derived from the SHEET's full width against the working
     * raster the geometry was traced on. Carrying vectors is what makes this
     * exact — an upscaled mask would soften every cut line by the ratio.
     */
    const scale = sheet.widthPx / Math.max(1, geometry.workingSize.width);
    const mine = geometry.parts.filter((p) => task.partOrdinals.includes(p.ordinal));

    const tiles: { raster: Awaited<ReturnType<ImageCodec["decodeTile"]>>; ordinal: number }[] = [];

    for (const part of mine) {
      try {
        const region: Rect = {
          x: Math.round(part.bbox.x * scale),
          y: Math.round(part.bbox.y * scale),
          width: Math.max(1, Math.round(part.bbox.width * scale)),
          height: Math.max(1, Math.round(part.bbox.height * scale)),
        };
        const alpha = await deps.rasterise(part.ordinal, region, scale);

        if (task.mode === "full") {
          await writeFullPart(deps, { sheetId, runId, ordinal: part.ordinal, source, region, alpha });
        } else {
          tiles.push({ raster: await deps.codec.decodeTile(source, region), ordinal: part.ordinal });
        }
        rendered++;
      } catch (partErr) {
        const n = normalizeError(partErr);
        failures.push(part.ordinal);
        serverLogger.warn("Sticker trace part render failed", {
          runId,
          ordinal: part.ordinal,
          message: n.message,
        });
      }
      /*
       * No shard counters here on purpose. A shard knows its own index but not
       * how many others have finished — that lives in the transactional
       * counter — and the first draft of this call passed
       * `task.shardIndex !== undefined ? undefined : undefined`, which is
       * always undefined: a nonsense expression that typechecked and published
       * nothing.
       */
      await emitPartProgress(runId, rendered, mine.length);
    }

    /*
     * One atlas per SHARD, not per run: a shard cannot see the other shards'
     * tiles, and waiting to combine them would need the finalizer to re-read
     * every thumbnail. Object count stays bounded by shard count (<= 8), which
     * is the property that mattered — sixty individual thumbnails is what this
     * avoids.
     */
    if (task.mode === "thumb" && tiles.length > 0) {
      const atlas = await deps.codec.encodeAtlas(tiles, { maxLongEdge: 1024 });
      await deps.writeArtifact({
        sheetId,
        runId,
        name: `atlas-${task.shardIndex ?? 0}.png`,
        contentType: atlas.image.contentType,
        body: atlas.image.bytes,
      });
    }
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.error("Sticker trace shard failed", {
      runId,
      shardIndex: task.shardIndex,
      message: n.message,
    });
  } finally {
    // See the header: report done regardless, or the run never finishes.
    const election = await completeShardAndMaybeElectFinalizer({
      runId,
      sheetId,
      shardIndex: task.shardIndex ?? 0,
      shardCount: await resolveShardCount(runId),
      mode: task.mode,
    });

    if (failures.length > 0) {
      await emitProgress({
        runId,
        stage: "parts",
        pct: 90,
        message: `${failures.length} part(s) could not be rendered.`,
        level: "warn",
        durable: true,
      });
    }

    if (election.electedFinalizer) {
      serverLogger.info("Sticker trace finalizer elected", { runId });
    }
  }
}

/**
 * The run's own `shardCount`, read rather than passed.
 *
 * A shard receives its task, not the run, and trusting a count copied onto the
 * task would be a mirror that drifts the moment the coordinator retries with a
 * different fan-out (Root Cause #42).
 */
async function resolveShardCount(runId: string): Promise<number> {
  const { stickerTraceRunsRepository } = await import(
    "../../../../features/sticker-trace/repository/sticker-trace-runs.repository"
  );
  const run = await stickerTraceRunsRepository.findById(runId);
  return run?.shardCount ?? 1;
}
