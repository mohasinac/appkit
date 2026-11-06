/*
 * WHY: `shard.ts` and `progress.ts` both document the same gap from the inside
 *      — a shard or the coordinator can die without ever reaching its own
 *      `catch`/`finally` (GCF hard-kills at `timeoutSeconds`), and "nothing
 *      sweeps it" is recorded as a known, unclosed hole. This closes it.
 * WHAT: Find runs sitting in `queued` or `running` long past any realistic
 *       completion time, and give them the terminal failure they never got.
 *
 * 🛑 The threshold is NOT the per-function `timeoutSeconds`. A healthy run
 * queues, waits for a cold start, runs the coordinator (<=540s) and its shards
 * (<=300s, in parallel) before a finalizer closes it out — 20 minutes is
 * generous above that whole chain, not a tight bound on any one stage.
 *
 * EXPORTS: sweepStuckStickerTraceRuns
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:jobs/core/stickerTraceSweep
 * @tag sideEffects:firestore,rtdb
 */

import { stickerTraceRunsRepository } from "../../../../features/sticker-trace/repository/sticker-trace-runs.repository";
import { TraceRunStatusValues } from "../../../../features/sticker-trace/schemas/firestore";
import { emitTerminalFailure } from "./progress";

const STUCK_THRESHOLD_MS = 20 * 60 * 1000;

export interface SweepResult {
  scanned: number;
  timedOut: number;
}

/**
 * Mark every `queued`/`running` run older than the threshold as `failed`.
 *
 * Reuses `emitTerminalFailure` rather than calling `markFailed` directly —
 * the sweep found the run because its RTDB channel went quiet, and a terminal
 * write there (not just Firestore) is what stops a client still subscribed to
 * a dead run's channel from watching a bar that will never move again.
 */
export async function sweepStuckStickerTraceRuns(now: Date): Promise<SweepResult> {
  const cutoff = new Date(now.getTime() - STUCK_THRESHOLD_MS);
  const stuck = [
    ...(await stickerTraceRunsRepository.listStuckByStatus(TraceRunStatusValues.QUEUED, cutoff)),
    ...(await stickerTraceRunsRepository.listStuckByStatus(TraceRunStatusValues.RUNNING, cutoff)),
  ];

  for (const run of stuck) {
    await emitTerminalFailure(
      run.id,
      {
        stage: (run.stage as never) ?? "queued",
        code: "RUN_TIMED_OUT",
        message:
          "This run stopped reporting progress for over 20 minutes and was marked failed. Retry it — a transient crash in the processing pipeline, not your parameters, caused this.",
      },
      run,
    );
  }

  return { scanned: stuck.length, timedOut: stuck.length };
}
