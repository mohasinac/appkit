/*
 * WHY: Exactly one invocation gets to say a run finished, and it is the only
 *      place that can — it alone knows every shard is done.
 * WHAT: Overlay, cut SVG, the run's terminal status, and task cleanup.
 *
 * 🛑 Owns the `exports` TRACE_STAGE for audit-sticker-trace-progress R2, which
 * with coordinator.ts's nine and shard.ts's `parts` completes all 11.
 *
 * EXPORTS: runFinalizer, FinalizerDeps
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
import { getAdminDb } from "../../../../providers/db-firebase";
import { stickerTraceRunsRepository } from "../../../../features/sticker-trace/repository/sticker-trace-runs.repository";
import {
  STICKER_TRACE_TASKS_COLLECTION,
  type StickerTraceTaskDocument,
} from "../../../../features/sticker-trace/schemas/firestore";
import { emitProgress, emitTerminalFailure } from "./progress";

export interface FinalizerDeps {
  /** Builds the cut SVG from geometry.json. Pure given the geometry. */
  buildCutSvg: (runId: string, sheetId: string) => Promise<Uint8Array>;
  writeArtifact: (input: {
    sheetId: string;
    runId: string;
    name: string;
    contentType: string;
    body: Uint8Array;
  }) => Promise<{ assetPath: string }>;
}

export async function runFinalizer(
  task: StickerTraceTaskDocument,
  deps: FinalizerDeps,
): Promise<void> {
  const { runId, sheetId } = task;
  let run = null;

  try {
    run = await stickerTraceRunsRepository.findByIdOrFail(runId);
    await emitProgress({ runId, stage: "exports", pct: 94, prior: run });

    const svg = await deps.buildCutSvg(runId, sheetId);
    const cut = await deps.writeArtifact({
      sheetId,
      runId,
      name: "cut.svg",
      contentType: "image/svg+xml",
      body: svg,
    });

    run = await stickerTraceRunsRepository.markSucceeded(
      runId,
      {
        partCount: run.partCount,
        groupCount: run.groupCount,
        artifacts: { ...run.artifacts, cutSvgPath: cut.assetPath },
      },
      run,
    );

    await emitProgress({
      runId,
      stage: "done",
      pct: 100,
      terminal: true,
      prior: run,
    });

    /*
     * 🛑 Tasks are deleted LAST, and only after the run is terminal. Deleting
     * them first would make a redelivered finalizer re-run against a run whose
     * election record no longer exists — the one state where `create()` at the
     * fixed id cannot refuse it.
     *
     * The counter doc goes too: it is per-run bookkeeping, and leaving it
     * behind turns `stickerTraceTasks` into the unpruned collection the
     * Firebase budget notes are about.
     */
    await deleteRunTasks(runId);
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.error("Sticker trace finalizer failed", { runId, message: n.message });
    /*
     * The parts ARE rendered at this point — only the export failed — so this
     * deliberately does NOT delete the tasks. A retry can resume from
     * `exports` rather than re-rendering everything, which is exactly what the
     * resume clamp exists to allow.
     */
    await emitTerminalFailure(
      runId,
      {
        stage: "exports",
        code: "FINALIZER_FAILED",
        message: "The parts were traced but the cut file could not be written. Retry from exports.",
      },
      run,
    );
  }
}

async function deleteRunTasks(runId: string): Promise<void> {
  const db = getAdminDb();
  const snap = await db
    .collection(STICKER_TRACE_TASKS_COLLECTION)
    .where("runId", "==", runId)
    .get();
  if (snap.empty) return;

  /*
   * BulkWriter rather than a hand-sized batch: it sizes and retries its own
   * requests, so it is correct regardless of document size. A 400-doc batch is
   * a guess that broke on `categories` with `Transaction too big`.
   */
  const writer = db.bulkWriter();
  for (const doc of snap.docs) writer.delete(doc.ref);
  await writer.close();
}
