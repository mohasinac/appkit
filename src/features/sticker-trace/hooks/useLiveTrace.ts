"use client";

/*
 * WHY: Tuning a halftone scan takes several attempts, and a server round trip
 *      per attempt makes that unaffordable in both time and quota. The whole
 *      reason the codec is a port is so the identical trace runs in the tab.
 * WHAT: Decode once, re-trace on every parameter change, report timing.
 *
 * 🛑 A PARAMETER TWEAK MUST NOT RE-DECODE. Decoding is the expensive half, and
 * only decode-stage parameters can change its output — so the raster is cached
 * and reused, and the decision of when to drop it is DELEGATED to
 * `earliestChangedStage` from resume.ts rather than hand-written here. That is
 * the same clamp the retry panel shows, so the browser and the Function agree
 * on which parameters invalidate what; a second hand-rolled list would be the
 * drift Root Cause #42 describes.
 *
 * 🛑 It runs on the MAIN THREAD, debounced. The `draft` tier caps the working
 * long edge at 1200 (~1.4 Mpx) specifically so one trace stays near a second;
 * at `standard` (3000) it would not, which is why the tier selector and this
 * hook are coupled. If a real session janks, the escalation is a Worker — the
 * core is pure and already worker-safe, so that is a mechanical change rather
 * than a redesign. Do not reach for it before measuring.
 *
 * EXPORTS: useLiveTrace, LiveTraceState
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:sticker-trace/components
 * @tag sideEffects:none
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { canvasCodec } from "../../../_internal/client/features/sticker-trace/canvas-codec";
import { paramsForTier } from "../../../_internal/shared/features/sticker-trace/config";
import { traceStickerSheet } from "../../../_internal/shared/features/sticker-trace/index";
import { earliestChangedStage, stageIndex } from "../../../_internal/shared/features/sticker-trace/resume";
import type {
  DecodedRaster,
  TraceDiagnostics,
  TraceParams,
  PartGeometry,
} from "../../../_internal/shared/features/sticker-trace/types";

export interface LiveTraceState {
  parts: readonly PartGeometry[];
  diagnostics: TraceDiagnostics | null;
  /** The raster the trace ran on — what a canvas overlay draws under the paths. */
  raster: DecodedRaster | null;
  /** True while a trace is in flight; the previous result stays visible. */
  tracing: boolean;
  /** Wall time of the last trace, so a tier change's cost is visible. */
  lastMs: number | null;
  error: string | null;
}

const EMPTY: LiveTraceState = {
  parts: [],
  diagnostics: null,
  raster: null,
  tracing: false,
  lastMs: null,
  error: null,
};

/**
 * Re-trace `source` whenever `params` change.
 *
 * 🛑 The previous result is kept on screen while a new trace runs. Blanking to
 * a spinner on every keystroke makes the control feel broken and, worse, hides
 * the thing the operator is comparing against — the point of live tuning is
 * seeing what a change did.
 */
export function useLiveTrace(
  source: Uint8Array | null,
  params: TraceParams,
  opts?: { debounceMs?: number },
): LiveTraceState & { retrace: () => void } {
  const [state, setState] = useState<LiveTraceState>(EMPTY);

  // The cached decode, plus the params it was produced under.
  const rasterRef = useRef<DecodedRaster | null>(null);
  const decodedWithRef = useRef<TraceParams | null>(null);
  const sourceRef = useRef<Uint8Array | null>(null);
  /*
   * Monotonic token. A slow trace that resolves AFTER a newer one must not
   * overwrite it — without this, dragging a slider lands results out of order
   * and the canvas settles on whichever request happened to finish last.
   */
  const runRef = useRef(0);

  const run = useCallback(
    async (src: Uint8Array, p: TraceParams) => {
      const token = ++runRef.current;
      setState((s) => ({ ...s, tracing: true, error: null }));

      try {
        /*
         * Reuse the cached raster unless a DECODE-stage parameter moved.
         * `earliestChangedStage` returns the first stage whose params differ;
         * stage index 0 is decode, so anything else leaves the pixels valid.
         */
        const prior = decodedWithRef.current;
        const sameSource = sourceRef.current === src;
        const changed = prior ? earliestChangedStage(prior, p) : null;
        const mustDecode =
          !rasterRef.current ||
          !sameSource ||
          !prior ||
          (changed !== null && stageIndex(changed) === 0);

        if (mustDecode) {
          rasterRef.current = await canvasCodec.decode(src, {
            maxLongEdge: p.workingLongEdge,
          });
          decodedWithRef.current = p;
          sourceRef.current = src;
        }
        const raster = rasterRef.current!;
        if (token !== runRef.current) return;

        const t0 = performance.now();
        /*
         * `fullWidth` is the raster's own width here, not the original file's.
         * In the browser there is no confirmed dpi (the canvas codec cannot read
         * density), so mm-denominated output is withheld anyway — passing a
         * made-up full width would produce confident millimetre figures from a
         * number nobody measured.
         */
        const result = traceStickerSheet(raster, p, raster.width);
        const ms = performance.now() - t0;
        if (token !== runRef.current) return;

        setState({
          parts: result.parts,
          diagnostics: result.diagnostics,
          raster,
          tracing: false,
          lastMs: Math.round(ms),
          error: null,
        });
      } catch (err) {
        const n = normalizeError(err);
        /*
         * normalizeError FIRST, before the body touches the value — the
         * project-wide rule (Root Cause #31), and audit-catch-normalize caught
         * this file breaking it twice: once by not calling it at all, then by
         * putting an eight-line comment between the catch and the call, which
         * pushed it outside the audit's window. The rule is about the first
         * STATEMENT, so the explanation belongs after it.
         *
         * It also removes the hand-rolled `instanceof Error ? … : String(err)`
         * narrowing that every catch otherwise reinvents slightly differently.
         *
         * The message reaches an admin tuning their own scan, so the browser's
         * own text is useful rather than dangerous — Root Cause #86 is about
         * SERVER internals reaching a user, which this is not.
         */
        if (token !== runRef.current) return;
        setState((s) => ({ ...s, tracing: false, error: n.message }));
      }
    },
    [],
  );

  const retrace = useCallback(() => {
    if (sourceRef.current) void run(sourceRef.current, params);
  }, [run, params]);

  useEffect(() => {
    if (!source) {
      setState(EMPTY);
      rasterRef.current = null;
      decodedWithRef.current = null;
      sourceRef.current = null;
      return;
    }
    const delay = opts?.debounceMs ?? 250;
    const t = setTimeout(() => void run(source, params), delay);
    return () => clearTimeout(t);
    // `params` is a fresh object each render from the caller's form state, so
    // this intentionally depends on the whole object — the debounce is what
    // makes that affordable, and `run` compares params by VALUE through
    // earliestChangedStage rather than by identity.
  }, [source, params, run, opts?.debounceMs]);

  return { ...state, retrace };
}

/** Draft-tier defaults, the only tier sized for interactive use. */
export function liveTuningDefaults(): TraceParams {
  return paramsForTier("draft");
}
