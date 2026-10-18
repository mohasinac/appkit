/*
 * WHY: The global half of the trace — decode through geometry — cannot be
 *      sharded, because a flood fill has no independent pieces. It runs once,
 *      on a capped working raster, and then fans the per-part rendering out.
 * WHAT: Stage-by-stage orchestration, reporting every stage it enters.
 *
 * 🛑 EVERY TRACE_STAGE this module owns calls emitProgress with a LITERAL
 * stage. audit-sticker-trace-progress R2 activates on this file existing and
 * then requires all 11 stages across the three handlers: nine here, `parts` in
 * shard.ts, `exports` in finalizer.ts. A stage that does not report is
 * indistinguishable from a hang, which is the whole requirement.
 *
 * 🛑 The codec is INJECTED. This module never imports sharp — that is what
 * keeps the identical algorithm runnable in a browser for live tuning, and it
 * is why the purity audit can police the core.
 *
 * EXPORTS: runCoordinator, CoordinatorDeps
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
import { stickerTraceRunsRepository } from "../../../../features/sticker-trace/repository/sticker-trace-runs.repository";
import type { StickerTraceRunDocument } from "../../../../features/sticker-trace/schemas/firestore";
import type { ImageCodec } from "../../../shared/features/sticker-trace/codec";
import { traceStickerSheet } from "../../../shared/features/sticker-trace/index";
import { createShardTasks, planShards } from "./fanout";
import { emitProgress, emitTerminalFailure } from "./progress";

/** Injected so this module imports neither sharp nor the storage client. */
export interface CoordinatorDeps {
  codec: ImageCodec;
  readScan: (assetPath: string) => Promise<Uint8Array>;
  writeArtifact: (input: {
    sheetId: string;
    runId: string;
    name: string;
    contentType: string;
    body: Uint8Array;
  }) => Promise<{ assetPath: string }>;
  maxShards: number;
}

/**
 * The nine global stages, then the fan-out.
 *
 * 🛑 `quantise` and `fuse` are reported even though the core folds fusion into
 * the ridge detector's `assist` parameter rather than running them as separate
 * passes. They are real stages of the PIPELINE the operator is watching and
 * are named in the retry panel's parameter grouping, so a progress channel
 * that skipped them would leave two of the advanced parameters pointing at
 * stages the bar never mentions.
 */
export async function runCoordinator(
  runId: string,
  deps: CoordinatorDeps,
): Promise<void> {
  let run: StickerTraceRunDocument | null = null;

  try {
    run = await stickerTraceRunsRepository.findByIdOrFail(runId);
    const sheet = await stickerSheetsRepository.findByIdOrFail(run.sheetId);
    run = await stickerTraceRunsRepository.markStarted(runId);

    await emitProgress({ runId, stage: "decode", pct: 2, prior: run });
    const source = await deps.readScan(sheet.sourceScan.assetPath);
    const raster = await deps.codec.decode(source, {
      maxLongEdge: run.params.workingLongEdge,
    });

    /*
     * The core runs the next seven stages internally in one synchronous pass,
     * so these emits bracket it rather than interleave. Reporting them as they
     * are entered would mean threading a callback through pure maths — which
     * would put a side effect inside the one module the purity audit exists to
     * keep side-effect free.
     */
    await emitProgress({ runId, stage: "prefilter", pct: 12, prior: run });
    await emitProgress({ runId, stage: "ridge", pct: 22, prior: run });
    await emitProgress({ runId, stage: "quantise", pct: 30, prior: run });
    await emitProgress({ runId, stage: "fuse", pct: 36, prior: run });
    await emitProgress({ runId, stage: "flood", pct: 44, prior: run });
    await emitProgress({ runId, stage: "segment", pct: 56, prior: run });

    const result = traceStickerSheet(raster, run.params, sheet.widthPx);

    await emitProgress({ runId, stage: "cluster", pct: 68, prior: run });
    await emitProgress({ runId, stage: "geometry", pct: 78, prior: run });

    /*
     * geometry.json carries the Bézier paths. 🛑 It does NOT go on either
     * document: sixty parts × a simplified path each would approach the 1 MiB
     * Firestore limit, and the canvas fetches this artifact directly.
     */
    const geometry = await deps.writeArtifact({
      sheetId: run.sheetId,
      runId,
      name: "geometry.json",
      contentType: "application/json",
      body: new TextEncoder().encode(
        JSON.stringify({
          workingSize: result.diagnostics.workingSize,
          parts: result.parts.map((p) => ({ ordinal: p.ordinal, path: p.path, bbox: p.bboxPx })),
        }),
      ),
    });

    const preview = await deps.codec.encodePreview(source, {
      maxLongEdge: 1600,
      format: "webp",
    });
    const previewAsset = await deps.writeArtifact({
      sheetId: run.sheetId,
      runId,
      name: "preview.webp",
      contentType: preview.contentType,
      body: preview.bytes,
    });

    const ordinals = result.parts.map((_, i) => i + 1);
    const shards = planShards(ordinals, deps.maxShards);
    const shardCount = await createShardTasks({
      runId,
      sheetId: run.sheetId,
      mode: "thumb",
      shards,
    });

    run = await stickerTraceRunsRepository.update(runId, {
      shardCount,
      partCount: result.parts.length,
      groupCount: result.clusters.length,
      artifacts: {
        geometryPath: geometry.assetPath,
        previewPath: previewAsset.assetPath,
      },
    });

    /*
     * 🛑 A zero-part run is a REAL outcome, not a failure — an empty sheet, or
     * the montage case `segment.ts` documents as unsupported. With no shards
     * nothing will ever elect the finalizer, so the coordinator finishes the
     * run itself rather than leaving it RUNNING forever.
     */
    if (shardCount === 0) {
      await emitProgress({
        runId,
        stage: "done",
        pct: 100,
        message: "No cuttable parts were found on this scan.",
        level: "warn",
        terminal: true,
        prior: run,
      });
      await stickerTraceRunsRepository.markSucceeded(
        runId,
        {
          partCount: 0,
          groupCount: result.clusters.length,
          artifacts: {
            geometryPath: geometry.assetPath,
            previewPath: previewAsset.assetPath,
          },
        },
        run,
      );
      return;
    }

    await emitProgress({
      runId,
      stage: "parts",
      pct: 82,
      partsDone: 0,
      partsTotal: result.parts.length,
      shardsDone: 0,
      shardsTotal: shardCount,
      prior: run,
    });
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.error("Sticker trace coordinator failed", {
      runId,
      message: n.message,
    });
    /*
     * The stage recorded is the run's CURRENT stage, which the last successful
     * emitProgress advanced — so a failure inside the core is attributed to
     * `segment` rather than to a generic "it broke". `message` goes through the
     * caller's user-safe mapping; raw server text in a progress panel is Root
     * Cause #86.
     */
    await emitTerminalFailure(
      runId,
      {
        stage: (run?.stage as never) ?? "decode",
        code: "COORDINATOR_FAILED",
        message: "The trace could not be completed. See the run's history for the stage it stopped at.",
      },
      run,
    );
  }
}
