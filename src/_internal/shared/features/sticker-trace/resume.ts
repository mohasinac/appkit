/*
 * WHY: A retry is a NEW named run, but it may resume rather than restart,
 *      because the expensive stage is usually not the one that failed. Resuming
 *      is only safe if the parameters the earlier stages ran under have not
 *      changed.
 * WHAT: The clamp, and the param-to-stage grouping it reads.
 *
 * 🛑 THE CLAMP IS WHAT MAKES RESUME HONEST.
 *
 * Without it, "resume from `parts` but with a different ridge threshold"
 * produces a run whose stored artifacts were generated under DIFFERENT
 * parameters than the run records — and nothing anywhere contradicts it. The
 * parts look plausible, the run says `hysteresisLow 0.3`, and the two have
 * nothing to do with each other. That is the same class of silent lie as a
 * mirror field drifting from its source (Root Cause #42), which is why the
 * grouping below is structural rather than a convention someone remembers.
 *
 * 🛑 The clamp is SHOWN, never applied silently. `explainResume` returns the
 * sentence the retry panel displays — "you changed a ridge threshold, so this
 * run restarts from ridge rather than resuming from parts". An adjustment the
 * user did not ask for and cannot see is indistinguishable from the tool
 * ignoring them.
 *
 * Pure: no codec, no node, no providers. Enforced by
 * scripts/audit-sticker-trace-purity.mjs.
 *
 * EXPORTS: PARAM_STAGE, STAGE_ORDER, stageIndex, earliestChangedStage,
 *   resolveResumeStage, explainResume
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/actions,functions/sticker-trace
 * @tag sideEffects:none
 */

import { TRACE_STAGES, type TraceParams, type TraceStage } from "./types";

/**
 * Which stage each parameter first affects.
 *
 * 🛑 A `Record<keyof TraceParams, TraceStage>` on purpose. Adding a parameter
 * without classifying it is then a COMPILE error rather than a parameter that
 * silently never invalidates anything — which would let a changed value resume
 * past the stage it governs, i.e. exactly the defect this file exists to
 * prevent. If `tsc` sends you here, the question to answer is "what is the
 * earliest stage this value changes the output of".
 */
export const PARAM_STAGE: Record<keyof TraceParams, TraceStage> = {
  // decode
  workingLongEdge: "decode",
  scanType: "decode",
  /*
   * Both map to the FIRST stage, i.e. changing either forces a full restart.
   *
   * `tier` carries workingLongEdge and subPixelContours, so it reaches decode
   * and geometry at once — there is no partial resume that honours a new tier.
   * `dpi` is the px-per-mm scale, and every mm-denominated parameter after it
   * (minPartAreaMm2, bridgeMm, smoothMm, simplifyMm, clusterGapMm) converts
   * through it — so a changed dpi silently re-means all five. That is the
   * subtle one: nothing about those values changed, but what they MEAN did.
   */
  tier: "decode",
  dpi: "decode",
  // prefilter
  prefilter: "prefilter",
  prefilterRadius: "prefilter",
  // ridge
  ridgeHysteresisLow: "ridge",
  ridgeHysteresisHigh: "ridge",
  ridgeKernelScale: "ridge",
  // quantise + fuse — the second detector channel and its union into the barrier
  quantiseEnabled: "quantise",
  quantiseColours: "quantise",
  quantiseWeight: "fuse",
  // flood
  paperTolerance: "flood",
  seedBandPx: "flood",
  // segment
  minPartAreaMm2: "segment",
  maxParts: "segment",
  bridgeMm: "segment",
  mergeStrengthFactor: "segment",
  // geometry
  smoothMm: "geometry",
  borderMm: "geometry",
  bleedMm: "geometry",
  simplifyMm: "geometry",
  cleanMm: "geometry",
  /*
   * 🛑 `subPixelContours` is NOT here, and that is not an omission. It lives on
   * the TIER config, not on TraceParams — so it cannot change without the tier
   * changing, and a tier change is a new run rather than a resume. The
   * `Record<keyof TraceParams, …>` above rejected it on the first compile,
   * which is the whole reason the map is typed that way.
   */
  // cluster
  clusterGapMm: "cluster",
};

/** The pipeline order, straight from the union so it cannot drift from it. */
export const STAGE_ORDER: readonly TraceStage[] = TRACE_STAGES;

export function stageIndex(stage: TraceStage): number {
  const i = STAGE_ORDER.indexOf(stage);
  /*
   * 🛑 Fails LOUD. An unknown stage reaching here means the union moved and
   * this file did not; returning -1 or 0 would make the clamp silently resume
   * from the beginning (merely wasteful) or from wherever was asked (actively
   * wrong), and both read as working.
   */
  if (i === -1) throw new Error(`Unknown trace stage: ${stage}`);
  return i;
}

/**
 * The earliest stage whose parameters differ between two runs.
 *
 * `null` means nothing relevant changed, so the requested resume point stands.
 *
 * Compared with `!==` after a JSON round-trip is deliberately NOT what happens
 * here — every `TraceParams` member is a number, boolean or short string
 * union, so a direct comparison is exact. A nested object would need the
 * key-order-independent treatment Root Cause #92 is about; there isn't one, and
 * the `Record` above is what stops one being added unnoticed.
 */
export function earliestChangedStage(
  previous: TraceParams,
  next: TraceParams,
): TraceStage | null {
  let earliest: TraceStage | null = null;
  for (const key of Object.keys(PARAM_STAGE) as Array<keyof TraceParams>) {
    if (previous[key] === next[key]) continue;
    const stage = PARAM_STAGE[key];
    if (earliest === null || stageIndex(stage) < stageIndex(earliest)) {
      earliest = stage;
    }
  }
  return earliest;
}

export interface ResumeDecision {
  /** Where the new run actually starts. */
  stage: TraceStage;
  /** True when the clamp moved it earlier than asked. */
  clamped: boolean;
  requested: TraceStage;
  /** The parameter stage that forced the clamp, when one did. */
  forcedBy: TraceStage | null;
}

/**
 * `resumeStage = max(requested, earliestChangedParamStage)` — where "max" means
 * EARLIER in the pipeline, because a changed parameter invalidates its own
 * stage and everything after it.
 */
export function resolveResumeStage(
  requested: TraceStage,
  previous: TraceParams,
  next: TraceParams,
): ResumeDecision {
  const changed = earliestChangedStage(previous, next);
  if (changed === null || stageIndex(changed) >= stageIndex(requested)) {
    return { stage: requested, clamped: false, requested, forcedBy: changed };
  }
  return { stage: changed, clamped: true, requested, forcedBy: changed };
}

/**
 * The sentence the retry panel shows. Empty when nothing was clamped.
 *
 * Returns plain text rather than a translation key because this is the one
 * place the two stage names have to appear together, and a key would hide the
 * fact that the message is load-bearing rather than decorative.
 */
export function explainResume(decision: ResumeDecision): string {
  if (!decision.clamped) return "";
  return (
    `You changed a ${decision.forcedBy} parameter, so this run restarts from ` +
    `${decision.stage} rather than resuming from ${decision.requested}.`
  );
}
