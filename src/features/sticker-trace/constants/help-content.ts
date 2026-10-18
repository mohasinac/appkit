/*
 * WHY: Every number in this tool has a reason that was measured, and none of
 *      them is guessable from the label. An operator deciding between tiers, or
 *      staring at a scan that produced nine parts instead of fifteen, needs the
 *      reason — not a tooltip restating the field name.
 * WHAT: One source for that copy, rendered by the help panel AND by each
 *       field's inline `?`.
 *
 * 🛑 ONE source, two renderers. Two copies drift, and the inline hint is the
 * one people actually read — so it must be the same text as the panel rather
 * than a shortened paraphrase that loses the number.
 *
 * 🛑 Every figure here was MEASURED on the nine reference scans, not estimated.
 * Where a claim is an expectation rather than a measurement it says so. Do not
 * add a confident number to this file without one, because this is the copy an
 * operator will trust over their own eyes.
 *
 * EXPORTS: TIER_HELP, PARAM_HELP, DIAGNOSTIC_HELP, LIMITATION_HELP
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:StickerTraceStudio,StickerTracerHelpPanel
 * @tag sideEffects:none
 */

import type { PrecisionTier } from "../../../_internal/shared/features/sticker-trace/types";

export interface HelpEntry {
  title: string;
  body: string;
}

/**
 * What each tier actually buys, in the terms that decide between them.
 *
 * 🛑 A `Record<PrecisionTier, …>`, so a fifth tier cannot be added without
 * answering "what does it buy" — the thing a tier selector exists to tell you.
 */
export const TIER_HELP: Record<PrecisionTier, HelpEntry> = {
  draft: {
    title: "Draft — interactive",
    body:
      "Works at a 1200px long edge, which is what keeps one trace near a second. " +
      "This is the only tier the live tuner offers: the trace runs in your browser " +
      "on the main thread, so a heavier tier would freeze the page while you drag a " +
      "slider. Use it to find parameters that work, then commit a run at a higher " +
      "tier with those parameters.",
  },
  standard: {
    title: "Standard",
    body:
      "3000px long edge, median prefilter, integer contours. The default for a real " +
      "run, and what the reference corpus was measured at — the part counts you see " +
      "quoted anywhere in this tool are standard-tier counts.",
  },
  precise: {
    title: "Precise",
    body:
      "5000px (or native, whichever is smaller), bilateral prefilter, and SUB-PIXEL " +
      "contours: the mask is blurred before tracing so an edge lands between pixels " +
      "rather than on one. Reach for it when a halftone scan merges two stickers at " +
      "standard, which is the case it exists for.",
  },
  max: {
    title: "Max",
    body:
      "Native resolution, with the ridge pass TILED and overlapped so a cut line " +
      "crossing a tile seam is not broken. Expensive in both time and quota, and the " +
      "tier most likely to produce a cut file Design Space cannot open — its finer " +
      "simplify tolerance can push a sheet past the ~50,000-node ceiling. Export " +
      "simplification is a separate budget for exactly that reason.",
  },
};

/**
 * The parameters an operator actually moves.
 *
 * Keyed by the `TraceParams` member name so a field can look its own help up
 * by `name`, which is what makes the inline `?` and the panel the same text.
 */
export const PARAM_HELP: Record<string, HelpEntry> = {
  ridgeHysteresisLow: {
    title: "Ridge sensitivity (low)",
    body:
      "The threshold a pixel must clear to COUNT as part of a cut line once a " +
      "neighbour is already certain. Lower finds fainter lines and more noise with " +
      "them. This is the first thing to try when parts are missing: the detector " +
      "reads an emboss ridge, which on the reference scans sits 10-20x above noise " +
      "even where colour shows nothing at all.",
  },
  ridgeHysteresisHigh: {
    title: "Ridge sensitivity (high)",
    body:
      "The threshold at which a line is certain enough to start from. Raise it if " +
      "the trace is finding cut lines inside artwork; lower it if whole stickers are " +
      "being missed. The two thresholds work as a pair — a line is kept when it " +
      "clears the low bar AND connects to something that cleared the high one.",
  },
  paperTolerance: {
    title: "Paper tolerance",
    body:
      "How far a pixel may differ from the sampled paper colour and still count as " +
      "background. Only used on sheets that HAVE a background: a full-bleed art sheet " +
      "is segmented a different way entirely, and this control does nothing there. " +
      "The result panel tells you which model ran.",
  },
  minPartAreaMm2: {
    title: "Minimum part area",
    body:
      "Anything smaller is dropped as speckle. Raise it when the part count is full " +
      "of fragments. Measured in mm², so it depends on a trustworthy DPI — with no " +
      "confirmed DPI the tool falls back to a fraction of the image instead, which " +
      "still removes dust but cannot honour a figure in millimetres.",
  },
  bridgeMm: {
    title: "Bridge gap",
    body:
      "Closes small breaks in a cut line before the outline is traced. Useful on a " +
      "scan where the emboss fades; too high and two adjacent stickers fuse into one " +
      "part.",
  },
  simplifyMm: {
    title: "Simplify tolerance",
    body:
      "How far the final outline may deviate from the traced curve. Tighter means " +
      "more nodes, and node count is what Design Space runs out of — so the Cricut " +
      "export re-simplifies to its own budget and reports the resulting deviation " +
      "rather than inheriting this value.",
  },
};

/** How to read the result panel's numbers. */
export const DIAGNOSTIC_HELP: Record<string, HelpEntry> = {
  background: {
    title: "paper vs art",
    body:
      "Two completely different segmentation models, chosen automatically. PAPER " +
      "floods inward from the sheet edge, so a sticker is anything the flood cannot " +
      "reach — which is why a region inside a sticker stays opaque no matter what " +
      "colour it is. ART has no background to flood, so it partitions on the cut " +
      "lines and merges back across the weak ones. If the wrong model is chosen, " +
      "paper tolerance will appear to do nothing.",
  },
  sheetSized: {
    title: "sheet-sized",
    body:
      "Components covering more than 60% of the image. One of these usually means " +
      "the flood never got in — the cut lines sealed the border, or the scan has no " +
      "background at all.",
  },
  tooSmall: {
    title: "too small",
    body:
      "Components dropped for being under the minimum part area. A large number here " +
      "with few real parts usually means the detector is reading noise as cut lines; " +
      "try a prefilter before raising the minimum.",
  },
};

/** Things the tool cannot do, stated plainly rather than discovered. */
export const LIMITATION_HELP: readonly HelpEntry[] = Object.freeze([
  {
    title: "Several sheets in one scan",
    body:
      "Unsupported, and measured rather than assumed: a 2x3 montage of six " +
      "full-bleed sheets returns ZERO parts by both models, because the background " +
      "estimate samples the outer frame and the gutters and gets one colour that is " +
      "wrong for five of the six panels. A projection-profile splitter was built for " +
      "this and removed — it still read the montage as one panel while breaking " +
      "single sheets that had worked. Scan sheets individually, or crop.",
  },
  {
    title: "No DPI means no millimetres",
    body:
      "Five of the nine reference scans declare 72 or 96 DPI, which is a number the " +
      "encoder wrote rather than anything about the scanner. When DPI cannot be " +
      "trusted the tool shows sizes in pixels and withholds millimetres entirely — a " +
      "fabricated millimetre on a cut file is a physical production error, not a " +
      "cosmetic one. Confirm or measure the DPI to unlock mm output.",
  },
  {
    title: "Halftone scans are the hard case",
    body:
      "A screened (dot-pattern) scan carries the weakest cut-line signal of the " +
      "corpus — roughly 3x noise against 10-20x for the rest. Expect to tune it, and " +
      "expect the bilateral prefilter at `precise` to matter more than any threshold.",
  },
  {
    title: "Parts wider than the cutter",
    body:
      "A Cricut Joy 2's Print-Then-Cut area on A4 is a column about 78mm wide, and " +
      "several stickers on a typical sheet are wider than that. Those parts are named " +
      "before export rather than silently scaled — scaling would produce a cut file " +
      "that looks correct and yields stickers the wrong physical size. Oversized parts " +
      "can be tiled across sheets, or sent to the print-shop profile, which has no " +
      "width limit.",
  },
]);
