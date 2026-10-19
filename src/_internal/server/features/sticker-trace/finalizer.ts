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
  /**
   * Builds the cut SVG from geometry.json.
   *
   * 🛑 OPTIONAL, and that is a phase boundary rather than laxity. The exporter
   * belongs to the export suite (machine profiles, node budgets, oversized-part
   * tiling), not to the fan-out — so the fan-out ships without it and a run
   * succeeds with no `cutSvgPath`. Requiring it here would have made the whole
   * Functions pipeline wait on the export work, and a run that traced correctly
   * is useful before anything can be cut: the parts and the overlay are what a
   * human reviews.
   */
  buildCutSvg?: (runId: string, sheetId: string) => Promise<Uint8Array>;
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

    /*
     * No exporter wired yet -> the run still SUCCEEDS, with no cutSvgPath.
     * Writing a placeholder artifact was the alternative and is worse: a zero
     * length cut.svg is indistinguishable from a real one that failed to
     * generate, and the review UI would offer a download that cuts nothing.
     * An absent field is honest and is what the UI can branch on.
     */
    let cutSvgPath: string | undefined;
    if (deps.buildCutSvg) {
      const svg = await deps.buildCutSvg(runId, sheetId);
      const cut = await deps.writeArtifact({
        sheetId,
        runId,
        name: "cut.svg",
        contentType: "image/svg+xml",
        body: svg,
      });
      cutSvgPath = cut.assetPath;
    } else {
      serverLogger.info("Sticker trace finished without a cut file (no exporter wired)", {
        runId,
      });
    }

    run = await stickerTraceRunsRepository.markSucceeded(
      runId,
      {
        partCount: run.partCount,
        groupCount: run.groupCount,
        artifacts: {
          ...run.artifacts,
          ...(cutSvgPath ? { cutSvgPath } : {}),
        },
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
  /*
   * `void` because `close()` is the await point, not each delete.
   *
   * BulkWriter returns a promise per operation and resolves them through
   * `close()`, which also surfaces their failures — so awaiting each delete
   * here would serialise the whole batch and defeat the reason BulkWriter was
   * chosen. Marking them ignored is the rule's own prescribed form, and it is
   * accurate: they are not unhandled, they are handled one line down.
   */
  for (const doc of snap.docs) void writer.delete(doc.ref);
  await writer.close();
}
