"use client";

/*
 * WHY: A trace takes minutes and fans out across shards. "Even if we fail we
 *      know" was the requirement, and a spinner cannot express which of eleven
 *      stages a run died in.
 * WHAT: Subscribe to one run's live progress on sticker_trace/{runId}.
 *
 * 🛑 Built on `useRealtimeEvent`, not on a fresh RTDB subscription. That hook
 * already owns the per-event custom-token sign-in, the reference-counted
 * session lease, the timeout and the unsubscribe — and `useBulkEvent` is the
 * precedent for wrapping it per feature. Rolling a second subscription would
 * duplicate the lease accounting, which is the part that leaks a connection
 * when it is wrong.
 *
 * 🛑 This is the LIVE bar only. The durable record is the run document's capped
 * `events[]`, which is what a post-mortem reads weeks later — and the RTDB node
 * is pruned at 60 minutes. A UI that treats this hook as the history will show
 * nothing for any run older than an hour.
 *
 * EXPORTS: useStickerTraceProgress, StickerTraceProgress
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:sticker-trace/components
 * @tag sideEffects:none
 */

import { useCallback, useMemo } from "react";
import { useRealtimeEvent } from "../../../react/hooks/useRealtimeEvent";
import { RealtimeEventType } from "../../../react/hooks/realtime-event-constants";
import { RTDB_PATHS } from "../../../providers/db-firebase/rtdb-paths";
import type { TraceStage } from "../../../_internal/shared/features/sticker-trace/types";

/** One snapshot of the channel. Every field is optional — see `extract`. */
export interface StickerTraceProgress {
  stage: TraceStage | "queued" | "done" | null;
  pct: number;
  partsDone: number | null;
  partsTotal: number | null;
  shardsDone: number | null;
  shardsTotal: number | null;
  message: string | null;
  level: "info" | "warn" | "error" | null;
  terminal: boolean;
}

const BLANK: StickerTraceProgress = {
  stage: null,
  pct: 0,
  partsDone: null,
  partsTotal: null,
  shardsDone: null,
  shardsTotal: null,
  message: null,
  level: null,
  terminal: false,
};

/**
 * 🛑 Every field is read DEFENSIVELY, and nulls are preserved rather than
 * defaulted to 0.
 *
 * The writer is the coordinator, the shards and the finalizer — three
 * processes, writing partial payloads at different stages (a shard reports
 * parts and knows nothing about exports). Defaulting a missing `partsTotal` to
 * 0 would render "12 of 0 parts", which reads as a bug in the tracer rather
 * than as a field this stage does not populate. Null means "not applicable
 * here", and the UI can omit the clause.
 */
function extract(raw: unknown): StickerTraceProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

  return {
    stage: (str(r.stage) as StickerTraceProgress["stage"]) ?? null,
    pct: num(r.pct) ?? 0,
    partsDone: num(r.partsDone),
    partsTotal: num(r.partsTotal),
    shardsDone: num(r.shardsDone),
    shardsTotal: num(r.shardsTotal),
    message: str(r.message),
    level: (str(r.level) as StickerTraceProgress["level"]) ?? null,
    terminal: r.terminal === true,
  };
}

export interface UseStickerTraceProgressReturn {
  progress: StickerTraceProgress;
  /** Call once with the run id and the token the create route minted. */
  subscribe: (runId: string, customToken: string) => void;
  /** A one-line summary for a status row, or null when there is nothing to say. */
  label: string | null;
  error: string | null;
}

export function useStickerTraceProgress(): UseStickerTraceProgressReturn {
  const { data, subscribe, error } = useRealtimeEvent<StickerTraceProgress>({
    type: RealtimeEventType.STICKER_TRACE,
    rtdbPath: RTDB_PATHS.STICKER_TRACE,
    extractData: (raw) => extract(raw),
    /*
     * 20 minutes. The channel's own prune window is 60, and a `max`-tier
     * fan-out across sixty parts can run for several — so a short client
     * timeout would report a dead run that is still working, which is the one
     * false signal this channel exists to prevent. The run document remains
     * authoritative either way.
     */
    timeoutMs: 20 * 60 * 1000,
  });

  const progress = data ?? BLANK;

  /*
   * The label names the STAGE, never just a percentage. "Processing 43%" is
   * what a spinner says; "ridge 22%" is what lets an operator recognise that a
   * halftone scan is stuck in the detector rather than in the upload.
   */
  const label = useMemo(() => {
    if (!progress.stage) return null;
    const parts =
      progress.partsDone !== null && progress.partsTotal !== null
        ? ` ${progress.partsDone}/${progress.partsTotal} parts`
        : "";
    const shards =
      progress.shardsDone !== null && progress.shardsTotal !== null
        ? ` · shard ${progress.shardsDone}/${progress.shardsTotal}`
        : "";
    return `${progress.stage} ${progress.pct}%${parts}${shards}`;
  }, [progress]);

  const start = useCallback(
    (runId: string, customToken: string) => subscribe(runId, customToken),
    [subscribe],
  );

  return { progress, subscribe: start, label, error };
}
