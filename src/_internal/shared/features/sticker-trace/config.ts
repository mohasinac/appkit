/*
 * WHY: Every number the tracer depends on, in one place, with the reason it has
 *      the value it has. Most were derived from measurements against the nine
 *      reference scans rather than chosen, and a tuned constant whose origin is
 *      forgotten is one nobody can safely change later.
 * WHAT: Precision tiers, working-resolution caps, and the default parameter set
 *       each tier produces.
 *
 * EXPORTS:
 *   WORKING_LONG_EDGE, PREVIEW_LONG_EDGE, THUMB_LONG_EDGE,
 *   STICKER_SHEET_MAX_BYTES, MAX_PARTS_PER_SHEET, SHEET_CLUSTER_GAP_MM,
 *   CRICUT_MIN_FEATURE_MM, CRICUT_NODE_BUDGET, TIER_PRESETS, paramsForTier
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:trace/*,export/*,run,StickerTraceParamsForm
 * @tag sideEffects:none
 */

import type { PrecisionTier, TraceParams } from "./types";

/**
 * The memory cap, and the reason the core never sees a 34 MP buffer.
 *
 * The downscale happens inside the CODEC, not here — sharp does it in native
 * code, canvas in `drawImage` — so no Float32Array is ever allocated at source
 * resolution. At 3000px long edge a mask is ~9 MB as Uint8 and a distance
 * transform ~36 MB as Float32, with several live at once; that fits a 2 GiB
 * Function with room. The `max` tier deliberately exceeds it and pays for that
 * by tiling the ridge pass instead (see trace/tiling).
 */
export const WORKING_LONG_EDGE = 3000;

/** The review image. Must stay ≤1 MB — the UI loads it on every sheet open. */
export const PREVIEW_LONG_EDGE = 2000;

/** Per-part review thumbnails, packed into ONE sprite atlas rather than N objects. */
export const THUMB_LONG_EDGE = 220;

/**
 * Upload ceiling. Deliberately its own constant rather than the shared
 * MAX_IMAGE_BYTES (10 MB), which is sized for product photography and must not
 * be raised — a 4948x6955 scan is legitimately 80 MB.
 */
export const STICKER_SHEET_MAX_BYTES = 120 * 1024 * 1024;

/**
 * A hard bound, not a tuning knob. A noise-dominated scan whose ridges survive
 * hysteresis produces thousands of components, and without this the failure
 * mode is thousands of Storage writes rather than an error message.
 */
export const MAX_PARTS_PER_SHEET = 400;

/**
 * Gap between physical sheets in one scan. Stickers on a sheet sit a few mm
 * apart; separate sheets land centimetres apart, so the threshold has a wide
 * safe margin either side.
 */
export const SHEET_CLUSTER_GAP_MM = 12;

/**
 * Cricut's documented minimum reliable detail / line spacing: 0.25 in. A part
 * with an internal neck below this tears instead of cutting.
 */
export const CRICUT_MIN_FEATURE_MM = 6.35;

/**
 * Design Space degrades past roughly 50,000 nodes. The exporter re-simplifies
 * to this budget INDEPENDENTLY of the trace tolerance — tying the two together
 * would mean a more precise trace producing a file Design Space cannot open.
 */
export const CRICUT_NODE_BUDGET = 45_000;

interface TierPreset {
  readonly workingLongEdge: number;
  readonly prefilter: TraceParams["prefilter"];
  readonly prefilterRadius: number;
  readonly simplifyMm: number;
  readonly smoothMm: number;
  readonly subPixelContours: boolean;
  readonly tiled: boolean;
}

/**
 * `draft` exists for the browser's live loop and nothing else — 1200px traces
 * in about a second, which is what makes threshold tuning feel like a slider
 * rather than a job submission.
 *
 * `max` is the only tier that tiles. Its simplify tolerance is fine enough that
 * the Cricut exporter will almost certainly have to re-simplify; that is
 * expected and reported, not a misconfiguration.
 */
export const TIER_PRESETS: Readonly<Record<PrecisionTier, TierPreset>> = {
  draft: {
    workingLongEdge: 1200,
    prefilter: "none",
    prefilterRadius: 0,
    simplifyMm: 0.25,
    smoothMm: 0.35,
    subPixelContours: false,
    tiled: false,
  },
  standard: {
    workingLongEdge: WORKING_LONG_EDGE,
    prefilter: "median",
    prefilterRadius: 1,
    simplifyMm: 0.08,
    smoothMm: 0.25,
    subPixelContours: false,
    tiled: false,
  },
  precise: {
    workingLongEdge: 5000,
    prefilter: "bilateral",
    prefilterRadius: 2,
    simplifyMm: 0.03,
    smoothMm: 0.18,
    subPixelContours: true,
    tiled: false,
  },
  max: {
    workingLongEdge: Number.POSITIVE_INFINITY,
    prefilter: "bilateral",
    prefilterRadius: 3,
    simplifyMm: 0.015,
    smoothMm: 0.12,
    subPixelContours: true,
    tiled: true,
  },
};

/**
 * Defaults measured against the reference corpus, not guessed:
 *
 * - `ridgeHysteresisLow/High` — the cut line reads as a dark-trough/light-ridge
 *   doublet at 10-20x scan noise on four sampled scanlines (−40/+27 against ±2
 *   on yellow-on-yellow, +22 against ±1 on red-on-red). The low threshold sits
 *   just above the worst measured noise floor (±7, a JPEG scan) so a faint but
 *   continuous line links, while isolated speckle does not seed.
 * - `quantiseWeight` below 1 on purpose: the colour channel REINFORCES a weak
 *   ridge but must not invent a cut where only a colour change exists, or every
 *   gradient band inside a sticker becomes an outline.
 * - `bridgeMm` closes white channels narrower than 2x itself. It must sit
 *   between the widest intra-sticker band and the narrowest real gap between
 *   neighbours; 0.45 was measured on the Driger G sheet.
 */
export function paramsForTier(tier: PrecisionTier, overrides: Partial<TraceParams> = {}): TraceParams {
  const preset = TIER_PRESETS[tier];
  return {
    tier,
    scanType: "auto",

    workingLongEdge: preset.workingLongEdge,

    prefilter: preset.prefilter,
    prefilterRadius: preset.prefilterRadius,

    // PERCENTILES of this scan's own ridge response, not absolute values — see
    // the measured justification in trace/ridge. Seeded here at p60/p80 and
    // confirmed against the corpus; the separation that matters is cut-line
    // versus BACKGROUND, not versus artwork edges, which the flood never
    // reaches anyway.
    ridgeHysteresisLow: 1.8,
    ridgeHysteresisHigh: 2.8,
    ridgeKernelScale: 1,

    quantiseEnabled: true,
    quantiseColours: 12,
    quantiseWeight: 0.6,

    paperTolerance: 14,
    seedBandPx: 2,

    minPartAreaMm2: 12,
    maxParts: MAX_PARTS_PER_SHEET,
    bridgeMm: 0.45,

    smoothMm: preset.smoothMm,
    borderMm: 0,
    bleedMm: 0.4,
    simplifyMm: preset.simplifyMm,
    cleanMm: 0.18,

    clusterGapMm: SHEET_CLUSTER_GAP_MM,

    ...overrides,
  };
}
