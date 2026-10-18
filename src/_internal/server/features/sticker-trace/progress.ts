/*
 * WHY: "Even if we fail we know which stage it died in." A trace has eleven
 *      stages and any of them can fail; a generic spinner that stops moving is
 *      indistinguishable from a hang, and the gap only shows up on the day
 *      something breaks inside it.
 * WHAT: One emitter that writes BOTH the live RTDB node and the durable run
 *       document, plus the per-run token mint.
 *
 * 🛑 BOTH, because they answer different questions. RTDB answers "what is it
 * doing right now" and is pruned at 60 minutes; the run document answers "what
 * happened to run 2 last Tuesday" and is what the retry panel reads. Writing
 * only the first loses the history the whole feature exists for; writing only
 * the second means no live bar.
 *
 * 🛑 Per-part progress is RTDB-ONLY. A Firestore event per part would be ~60
 * writes per run instead of ~10, i.e. 6x the write cost to tell the operator
 * something the live bar already shows and the history does not need. The
 * `durable` flag is what expresses that, and `emitPartProgress` is the named
 * wrapper so a caller does not have to remember.
 *
 * EXPORTS: emitProgress, emitPartProgress, emitTerminalFailure,
 *   mintStickerTraceToken, stickerTraceChannelPath
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:functions/sticker-trace,api/admin/sticker-sheets
 * @tag sideEffects:rtdb,firestore
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { getAdminAuth, getAdminRealtimeDb } from "../../../../providers/db-firebase";
import { RTDB_PATHS } from "../../../../providers/db-firebase/rtdb-paths";
import { stickerTraceRunsRepository } from "../../../../features/sticker-trace/repository/sticker-trace-runs.repository";
import type {
  StickerTraceRunDocument,
  TraceRunError,
  TraceRunEvent,
} from "../../../../features/sticker-trace/schemas/firestore";
import type { TraceStage } from "../../../shared/features/sticker-trace/types";

/** Every value `TraceRunEvent.stage` can hold — the pipeline plus its two bookends. */
export type ProgressStage = TraceStage | "queued" | "done";

export function stickerTraceChannelPath(runId: string): string {
  return `${RTDB_PATHS.STICKER_TRACE}/${runId}`;
}

/**
 * Mint the read token for one run's channel.
 *
 * One claim, `stickerTraceRunId`, matching the rule in
 * `appkit/firebase/base/database.rules.json`. Modelled on `enqueueJob`'s
 * `bulkJobId` mint and deliberately NOT a general-purpose token: a broad token
 * enumerating everything a user may watch is a Firestore fan-out per refresh
 * and a 1000-byte claims ceiling waiting to be hit — which is why
 * `/api/realtime/token` was deleted.
 *
 * The uid is namespaced so it can never collide with a real account.
 */
export async function mintStickerTraceToken(runId: string): Promise<string> {
  return getAdminAuth().createCustomToken(`sticker_trace_${runId}`, {
    stickerTraceRunId: runId,
  });
}

export interface EmitProgressInput {
  runId: string;
  stage: ProgressStage;
  /** 0..100. Clamped rather than trusted — a bar that reads 140% reads as broken. */
  pct: number;
  message?: string;
  level?: "info" | "warn" | "error";
  partsDone?: number;
  partsTotal?: number;
  shardsDone?: number;
  shardsTotal?: number;
  /** Terminal nodes stop a client polling for more. */
  terminal?: boolean;
  /**
   * Append to the run document too. Default TRUE — stage transitions are
   * history. Pass `false` for per-part ticks; see the header.
   */
  durable?: boolean;
  /**
   * The run, when the caller already holds it. The coordinator and finalizer
   * both do, so threading it makes the durable append cost ZERO extra reads
   * (the § "Status History" discipline).
   */
  prior?: StickerTraceRunDocument | null;
}

/**
 * Write one progress transition.
 *
 * 🛑 NEVER THROWS. Progress reporting is observability, not the work: a failed
 * RTDB write must not fail a trace that is otherwise succeeding, and a failed
 * trace must still be able to report that it failed. Both writes are
 * independently guarded, so losing the live node does not lose the history.
 *
 * Returns what it managed to do, so a caller that genuinely cares (a test, a
 * diagnostic) can tell rather than having to assume.
 */
export async function emitProgress(
  input: EmitProgressInput,
): Promise<{ live: boolean; durable: boolean }> {
  const pct = Math.max(0, Math.min(100, Math.round(input.pct)));
  const result = { live: false, durable: false };

  try {
    await getAdminRealtimeDb()
      .ref(stickerTraceChannelPath(input.runId))
      .set({
        stage: input.stage,
        pct,
        ...(input.message ? { message: input.message } : {}),
        level: input.level ?? "info",
        ...(input.partsDone !== undefined ? { partsDone: input.partsDone } : {}),
        ...(input.partsTotal !== undefined ? { partsTotal: input.partsTotal } : {}),
        ...(input.shardsDone !== undefined ? { shardsDone: input.shardsDone } : {}),
        ...(input.shardsTotal !== undefined ? { shardsTotal: input.shardsTotal } : {}),
        ...(input.terminal ? { terminal: true } : {}),
        /*
         * 🛑 Epoch MILLISECONDS, and `cleanupRtdbEvents` reads this exact key.
         * A node with a missing or non-finite `updatedAt` is treated as stale
         * by definition there — it can never age out on its own, so leaving it
         * would pin the node forever.
         */
        updatedAt: Date.now(),
      });
    result.live = true;
  } catch (liveErr) {
    const n = normalizeError(liveErr);
    /*
     * Logged, not swallowed. The live bar going dark while the trace keeps
     * working is survivable — the run document still carries the history — but
     * it is NOT nothing: it means the operator is watching a stalled bar on a
     * healthy run, and the only way anyone learns that is this line.
     */
    serverLogger.warn("Sticker trace live progress write failed (non-fatal)", {
      runId: input.runId,
      stage: input.stage,
      message: n.message,
    });
  }

  if (input.durable !== false) {
    try {
      const event: TraceRunEvent = {
        at: new Date(),
        stage: input.stage,
        pct,
        ...(input.message ? { message: input.message } : {}),
        ...(input.level ? { level: input.level } : {}),
      };
      await stickerTraceRunsRepository.appendEvent(input.runId, event, input.prior);
      result.durable = true;
    } catch (durableErr) {
      const n = normalizeError(durableErr);
      /*
       * This one is worse than the live failure and is logged at error: the
       * durable append is the ONLY record a post-mortem or a retry panel can
       * read, and the RTDB node it was mirroring is pruned within the hour.
       * A gap here means the run's own history has a hole in it.
       */
      serverLogger.error("Sticker trace durable event append failed", {
        runId: input.runId,
        stage: input.stage,
        message: n.message,
      });
    }
  }

  return result;
}

/**
 * A per-part tick: live only.
 *
 * Named rather than left to a `durable: false` argument at ~60 call sites,
 * because the one that forgets is the one that costs 6x the write budget.
 */
export async function emitPartProgress(
  runId: string,
  partsDone: number,
  partsTotal: number,
  extra?: { shardsDone?: number; shardsTotal?: number },
): Promise<void> {
  // Guard the division: a run with zero parts is a real outcome (an empty
  // sheet, or the montage case), and 0/0 would publish NaN as the bar's width.
  const pct = partsTotal > 0 ? (partsDone / partsTotal) * 100 : 0;
  await emitProgress({
    runId,
    stage: "parts",
    pct,
    partsDone,
    partsTotal,
    ...extra,
    durable: false,
  });
}

/**
 * The last thing a failing run does.
 *
 * 🛑 `error.message` must ALREADY be user-safe — resolved through
 * `toUserMessage`, never raw server text. A Node `MODULE_NOT_FOUND` with a full
 * require stack rendered inside a progress panel is Root Cause #86, and it
 * reached a buyer's bid modal once already.
 *
 * Writes the terminal RTDB node FIRST and the run document second, so a client
 * watching the bar stops waiting even if the Firestore write is the thing that
 * is failing.
 */
export async function emitTerminalFailure(
  runId: string,
  error: TraceRunError,
  prior?: StickerTraceRunDocument | null,
): Promise<void> {
  await emitProgress({
    runId,
    stage: error.stage,
    pct: 100,
    message: error.message,
    level: "error",
    terminal: true,
    durable: true,
    prior,
  });

  try {
    await stickerTraceRunsRepository.markFailed(runId, error, undefined, prior);
  } catch (markErr) {
    const n = normalizeError(markErr);
    /*
     * 🛑 The most important log line in this file. If this write fails the run
     * stays `running` forever: the retry panel offers nothing, the history says
     * the trace is still going, and the RTDB node that said otherwise is gone
     * within the hour. There is no second mechanism that notices — so the only
     * trace of a run stuck in limbo is this.
     */
    serverLogger.error("Sticker trace run could not be marked failed — run left RUNNING", {
      runId,
      stage: error.stage,
      code: error.code,
      message: n.message,
    });
  }
}
