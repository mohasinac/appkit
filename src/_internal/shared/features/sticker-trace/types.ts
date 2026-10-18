/*
 * WHY: A scanned sticker sheet has to become cut-ready geometry, and the same
 *      algorithm has to run in two places — a browser tuning it live, and a
 *      Firebase Function rendering it at full resolution. Two implementations
 *      would drift (CLAUDE.md Root Cause #59/#73), so there is exactly one, and
 *      these are the shapes it speaks in.
 * WHAT: Every type the tracing core exchanges with its callers. Deliberately
 *       free of any image-codec, Firestore or DOM type: the core takes decoded
 *       pixels and returns geometry, and knows nothing about where either came
 *       from.
 *
 * Coordinates are a constant source of error here, so the rule is stated once:
 * every geometric value in this module is in WORKING-RASTER PIXELS unless its
 * name ends in `Mm`. The working raster is a downscale of the source (see
 * config.WORKING_LONG_EDGE), so a caller rendering at full resolution scales by
 * `source.width / raster.width`. Carrying vectors rather than masks is what
 * makes that rescale exact.
 *
 * EXPORTS:
 *   DecodedRaster, EncodedImage, Rect, Point, CubicSegment, CutPath,
 *   TraceStage, TRACE_STAGES, ScanType, PrecisionTier, PrefilterKind,
 *   TraceParams, PartGeometry, SheetCluster, TraceResult, TraceDiagnostics
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:trace/*,math/*,export/*,canvas-codec,sharp-codec,run
 * @tag sideEffects:none
 */

/** Decoded pixels. Always RGBA8, row-major, tightly packed. */
export interface DecodedRaster {
  readonly width: number;
  readonly height: number;
  /** length === width * height * 4 */
  readonly data: Uint8Array;
  /**
   * Scan resolution, when the source declared one AND an operator confirmed it.
   *
   * Absent is a real answer and must stay representable: five of the nine
   * reference scans declare 72 or 96 dpi, which is a default the encoder wrote
   * rather than a measurement. Millimetre output is WITHHELD when this is
   * undefined — a fabricated mm figure on a cut file is a physical production
   * error, which is a different class of wrong from a missing number.
   */
  readonly dpi?: number;
}

export interface EncodedImage {
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** One cubic Bézier segment; the start point is the previous segment's end. */
export interface CubicSegment {
  readonly c1: Point;
  readonly c2: Point;
  readonly to: Point;
}

/**
 * One closed outline. Kiss-cut sheets cut the outer boundary only — interior
 * holes are never cut, or the sticker falls apart on the backing — so a part
 * carries exactly one path and `segments` always closes back to `start`.
 */
export interface CutPath {
  readonly start: Point;
  readonly segments: readonly CubicSegment[];
}

/**
 * The pipeline, in order. A failure reports the stage it died in, which is the
 * difference between "it broke" and "the ridge detector found nothing on a
 * halftone scan" — so the union is shared by the runner, the progress channel
 * and the retry panel rather than restated in each.
 */
export const TRACE_STAGES = [
  "decode",
  "prefilter",
  "ridge",
  "quantise",
  "fuse",
  "flood",
  "segment",
  "cluster",
  "geometry",
  "parts",
  "exports",
] as const;

export type TraceStage = (typeof TRACE_STAGES)[number];

/**
 * `paper` — stickers sit on bare backing; the sheet border is background.
 * `art`   — the whole sheet is printed and the only signal is the cut line.
 * `auto`  — decide from the border band's colour spread (see trace/paper).
 *
 * Several real sheets are BOTH (black-dranzer is paper on the left, solid red
 * and blue panels on the right), which is why this selects an emphasis rather
 * than switching algorithms: the ridge pass runs regardless, and this only
 * weights how much the paper-flood is trusted.
 */
export type ScanType = "auto" | "paper" | "art";

export type PrecisionTier = "draft" | "standard" | "precise" | "max";

export type PrefilterKind = "none" | "median" | "bilateral";

/**
 * Grouped BY STAGE, and that grouping is load-bearing rather than cosmetic: a
 * resumed run may only skip stages whose parameters did not change. Without the
 * grouping, "resume from `parts` with a different ridge threshold" yields a run
 * whose stored artifacts were produced under different parameters than the run
 * records, and nothing anywhere contradicts it.
 */
export interface TraceParams {
  readonly tier: PrecisionTier;
  readonly scanType: ScanType;

  /** decode */
  readonly workingLongEdge: number;
  readonly dpi?: number;

  /** prefilter */
  readonly prefilter: PrefilterKind;
  readonly prefilterRadius: number;

  /** ridge */
  readonly ridgeHysteresisLow: number;
  readonly ridgeHysteresisHigh: number;
  readonly ridgeKernelScale: number;

  /** quantise — the second detector channel; see trace/quantise */
  readonly quantiseEnabled: boolean;
  readonly quantiseColours: number;
  readonly quantiseWeight: number;

  /** flood */
  readonly paperTolerance: number;
  readonly seedBandPx: number;

  /** segment */
  readonly minPartAreaMm2: number;
  readonly maxParts: number;
  readonly bridgeMm: number;
  /**
   * Art sheets only. A region boundary below this multiple of the sheet's
   * MEDIAN boundary strength is treated as printing rather than a cut, and the
   * two regions merge. See trace/merge for why this exists at all.
   */
  readonly mergeStrengthFactor: number;

  /** geometry */
  readonly smoothMm: number;
  readonly borderMm: number;
  readonly bleedMm: number;
  readonly simplifyMm: number;
  readonly cleanMm: number;

  /** cluster */
  readonly clusterGapMm: number;
}

export interface PartGeometry {
  /** 1-based, stable within a run; what the admin renames and references. */
  readonly ordinal: number;
  /** Which physical sheet this part belongs to, when one scan holds several. */
  readonly groupIndex: number;
  readonly bboxPx: Rect;
  readonly areaPx: number;
  /** Null whenever DPI is unknown — never a guess. */
  readonly bboxMm: Rect | null;
  readonly areaMm2: number | null;
  /**
   * Narrowest internal width, in mm when DPI is known. Cricut's minimum
   * reliable detail is 0.25in (6mm); a part with a neck below that tears rather
   * than cuts, so the exporter needs this to warn before a sheet is wasted.
   */
  readonly minFeatureMm: number | null;
  readonly path: CutPath;
}

/**
 * One physical sheet within a scan. A 4948x6955 scan can hold several, and
 * grouping them by large border gaps is what makes the part list navigable
 * rather than one run of sixty.
 */
export interface SheetCluster {
  readonly index: number;
  readonly bboxPx: Rect;
  readonly partOrdinals: readonly number[];
}

/**
 * Reported whether or not the trace succeeded, because the numbers that explain
 * a BAD result are the same ones that explain a good one. `ridgeCoverage` near
 * zero on an `art` scan means the detector found nothing — which is a different
 * remedy from `droppedBelowMinArea` in the hundreds, which means it found noise.
 */
export interface TraceDiagnostics {
  readonly workingSize: Rect;
  readonly paperColour: readonly [number, number, number] | null;
  readonly ridgeCoverage: number;
  readonly quantiseCoverage: number;
  readonly fusedCoverage: number;
  readonly componentsFound: number;
  readonly droppedBelowMinArea: number;
  /**
   * Components covering more than MAX_PART_FRACTION of the raster.
   *
   * 🛑 Named for what it counts. It was `droppedTouchingBorder`, which told a
   * reader diagnosing a zero-part scan that a sticker had run off the edge —
   * a different and wrong story. A sheet-sized component means the flood never
   * got IN, and that is the one thing worth knowing at that moment.
   */
  readonly droppedSheetSized: number;
  /**
   * Fraction of the raster the paper path could flood through.
   *
   * The paper model needs real background; `isAvailable`-style negation has
   * nothing to work with when there is none. Measured across this corpus at
   * `standard`, the three paper scans that segment correctly sit at 27.7%,
   * 51.3% and 74.2%, and the one that returns zero parts sits at **7.8%** — so
   * this is the statistic that separates "this sheet has no stickers" from
   * "this model cannot read this scan", which otherwise look identical.
   *
   * 1 on an art scan, where the question does not arise.
   */
  readonly backgroundCoverage: number;
  readonly bridgedComponents: number;
  /**
   * Reserved. Art-background sheets WERE unsupported — see the git history for
   * the four approaches that failed and why — and are now handled by the
   * Hessian line filter plus the region merge. Kept as a field rather than
   * deleted because the art path is the one whose accuracy depends on a tuned
   * constant (mergeStrengthFactor), so a future sheet that defeats it needs a
   * way to say so without a schema change.
   */
  readonly artBackgroundUnsupported: boolean;
}

export interface TraceResult {
  readonly parts: readonly PartGeometry[];
  readonly clusters: readonly SheetCluster[];
  readonly diagnostics: TraceDiagnostics;
  /** Pixels per millimetre, or null when DPI is unknown. */
  readonly pxPerMm: number | null;
  /** Scale from working-raster pixels back to the source image. */
  readonly sourceScale: number;
}
