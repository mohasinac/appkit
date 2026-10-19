/*
 * WHY: Machine capability is DATA, not hardcode. The exporters, the nester and
 *      the pre-export report all need the same answer to "can this machine cut
 *      a part this wide", and the one failure this file exists to prevent is a
 *      part being silently scaled or cropped to fit. That produces a cut file
 *      which looks correct and yields stickers the wrong size — discovered only
 *      after printing, cutting and measuring.
 * WHAT: The three machine profiles, and the fit check that reports per-part by
 *       name instead of adjusting anything.
 *
 * 🛑 PDF mosaic is deliberately NOT a machine profile. It targets paper, has no
 * cut head and no width limit, and giving it a profile would mean inventing
 * capability numbers for a machine that does not exist. It is an exporter that
 * takes a page size; see export/pdf-mosaic.
 *
 * EXPORTS:
 *   MachineProfileId, CutWidthSource, MachineProfile, MACHINE_PROFILES,
 *   MACHINE_PROFILE_IDS, machineProfileById, maxCutWidthMmForPage,
 *   PartFitVerdict, partFitsProfile
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:export/nesting,export/cricut-svg,export/print-then-cut,export/part-tiling,StickerExportPanel
 * @tag sideEffects:none
 */

import { CRICUT_MIN_FEATURE_MM, CRICUT_NODE_BUDGET } from "../config";
import { inchesToMm, printableAreaMm, type PrintPageSize } from "./page-sizes";

export type MachineProfileId = "print-shop" | "cricut-cut" | "cricut-ptc";

/**
 * Where a profile's usable cut width comes from. Modelled as a SOURCE rather
 * than a stored millimetre value because the Print-Then-Cut width is a property
 * of the page, not of the machine — a second copy of it on the profile would be
 * a denormalised mirror, and it would drift the first time a page's PTC area
 * was corrected (CLAUDE.md Root Cause #42).
 */
export type CutWidthSource =
  /** No machine-imposed limit — the print shop's plotter takes roll media. */
  | "unbounded"
  /** The machine's own material width, carried on the profile. */
  | "material"
  /** The target page's sensor-constrained PTC sub-area. */
  | "page-ptc-area";

export interface MachineProfile {
  readonly id: MachineProfileId;
  readonly label: string;
  /** The units this machine's own documentation and UI speak in. */
  readonly units: "mm" | "in";
  readonly cutWidthSource: CutWidthSource;
  /** Set only when `cutWidthSource` is `"material"`. */
  readonly materialWidthMm: number | null;
  /**
   * Longest single continuous shape. `null` is genuinely unbounded (roll media
   * at a print shop); a number is a documented machine limit.
   */
  readonly maxCutLengthMm: number | null;
  /** Whether the exporter must emit sensor registration marks. */
  readonly registrationMarks: boolean;
  /**
   * Narrowest internal feature the machine cuts reliably. Below this the
   * material tears rather than cuts. `null` where the process has no such
   * limit worth modelling.
   */
  readonly minFeatureMm: number | null;
  /**
   * Node ceiling for the emitted path data, re-simplified to independently of
   * the TRACE tolerance. Tying the two together would mean a more precise trace
   * producing a file the software cannot open.
   */
  readonly nodeBudget: number | null;
  readonly emits: "cutcontour-svg" | "cut-only-svg" | "print-then-cut";
  /** One line, shown in the export picker. */
  readonly summary: string;
}

/** Cricut Joy 2 material width: 4.5 in, from Cricut's published documentation. */
const JOY_MATERIAL_WIDTH_MM = inchesToMm(4.5);

/**
 * Joy 2 Smart Materials cut one continuous shape up to 4 ft. Repeated cuts can
 * reach 20 ft, but a single PART is what this bounds, so 4 ft is the honest
 * number — quoting 20 would admit a shape the machine cannot cut in one pass.
 */
const JOY_MAX_CONTINUOUS_MM = inchesToMm(48);

export const MACHINE_PROFILES: Readonly<Record<MachineProfileId, MachineProfile>> = {
  "print-shop": {
    id: "print-shop",
    label: "Print shop (Roland / Graphtec)",
    units: "mm",
    cutWidthSource: "unbounded",
    materialWidthMm: null,
    maxCutLengthMm: null,
    registrationMarks: false,
    minFeatureMm: null,
    nodeBudget: null,
    emits: "cutcontour-svg",
    summary:
      "Artwork PNG plus a magenta CutContour layer — the format contour-cutting brokers accept. No width limit.",
  },
  "cricut-cut": {
    id: "cricut-cut",
    label: "Cricut Joy 2 — cut only",
    units: "in",
    cutWidthSource: "material",
    materialWidthMm: JOY_MATERIAL_WIDTH_MM,
    maxCutLengthMm: JOY_MAX_CONTINUOUS_MM,
    registrationMarks: false,
    minFeatureMm: CRICUT_MIN_FEATURE_MM,
    nodeBudget: CRICUT_NODE_BUDGET,
    emits: "cut-only-svg",
    summary:
      "Outlines only, true millimetre scale, nested into strips within the 4.5 inch material width.",
  },
  "cricut-ptc": {
    id: "cricut-ptc",
    label: "Cricut Joy 2 — Print Then Cut",
    units: "in",
    cutWidthSource: "page-ptc-area",
    materialWidthMm: null,
    maxCutLengthMm: JOY_MAX_CONTINUOUS_MM,
    registrationMarks: true,
    minFeatureMm: CRICUT_MIN_FEATURE_MM,
    nodeBudget: CRICUT_NODE_BUDGET,
    emits: "print-then-cut",
    summary:
      "Printable sheet plus cut lines, laid out inside the machine's real sensor-constrained area — on A4 that is a 78 mm column, not the page.",
  },
};

export const MACHINE_PROFILE_IDS: readonly MachineProfileId[] = [
  "print-shop",
  "cricut-cut",
  "cricut-ptc",
];

export function machineProfileById(id: MachineProfileId): MachineProfile {
  return MACHINE_PROFILES[id];
}

/**
 * The usable cut width for this profile on this page.
 *
 * Returns `null` only for a genuinely unbounded profile. Every caller must
 * treat `null` as "no limit" and NOT as "unknown" — the two are different, and
 * conflating them is how an unbounded print-shop export would start reporting
 * every part as unmeasurable.
 */
export function maxCutWidthMmForPage(
  profile: MachineProfile,
  page: PrintPageSize,
): number | null {
  switch (profile.cutWidthSource) {
    case "unbounded":
      return null;
    case "material":
      return profile.materialWidthMm;
    case "page-ptc-area": {
      // printableAreaMm throws on a page with no PTC area, which is correct:
      // choosing a PTC profile against a page the machine cannot register is a
      // configuration error, not a part that happens not to fit.
      const area = printableAreaMm(page, true);
      return Math.min(area.widthMm, JOY_MATERIAL_WIDTH_MM);
    }
  }
}

export interface PartFitVerdict {
  readonly fits: boolean;
  /** Wider than the machine can cut. The part must be tiled, or sent elsewhere. */
  readonly tooWide: boolean;
  /** Longer than one continuous cut. */
  readonly tooLong: boolean;
  /** Has an internal neck below the machine's reliable minimum; it will tear. */
  readonly tooFine: boolean;
  /** The limit that was applied, for the message the UI shows. */
  readonly limitWidthMm: number | null;
  readonly limitLengthMm: number | null;
  readonly reasons: readonly string[];
}

/**
 * Report whether a part can be cut on this profile. **Reports only** — it never
 * scales, never crops and never rotates to make something fit. The plan is
 * explicit that scaling here is the worst available failure, because the output
 * looks right.
 *
 * `minFeatureMm` is the part's measured narrowest internal feature (the trace
 * already computes it from the EDT); pass `null` when it has not been measured,
 * which suppresses the `tooFine` check rather than guessing it passed.
 *
 * Rotation is intentionally not considered. On a 4.5-inch-wide material the
 * long axis must run along the roll, so "it would fit sideways" is false for
 * the one profile where width is actually binding — and letting the caller
 * believe otherwise would hide exactly the parts that need tiling.
 */
export function partFitsProfile(
  part: { readonly widthMm: number; readonly heightMm: number; readonly minFeatureMm?: number | null },
  profile: MachineProfile,
  page: PrintPageSize,
): PartFitVerdict {
  const limitWidthMm = maxCutWidthMmForPage(profile, page);
  const limitLengthMm = profile.maxCutLengthMm;

  const tooWide = limitWidthMm !== null && part.widthMm > limitWidthMm;
  const tooLong = limitLengthMm !== null && part.heightMm > limitLengthMm;

  const measuredFeature = part.minFeatureMm ?? null;
  const tooFine =
    profile.minFeatureMm !== null &&
    measuredFeature !== null &&
    measuredFeature < profile.minFeatureMm;

  const reasons: string[] = [];
  if (tooWide) {
    reasons.push(
      `${part.widthMm.toFixed(1)} mm wide exceeds the ${limitWidthMm?.toFixed(1)} mm cut width — tile it, or use the print-shop profile where no width limit applies.`,
    );
  }
  if (tooLong) {
    reasons.push(
      `${part.heightMm.toFixed(1)} mm long exceeds the ${limitLengthMm?.toFixed(1)} mm single continuous cut.`,
    );
  }
  if (tooFine) {
    reasons.push(
      `narrowest feature ${measuredFeature?.toFixed(2)} mm is below the ${profile.minFeatureMm?.toFixed(2)} mm reliable minimum — it will tear rather than cut.`,
    );
  }

  return {
    fits: !tooWide && !tooLong && !tooFine,
    tooWide,
    tooLong,
    tooFine,
    limitWidthMm,
    limitLengthMm,
    reasons,
  };
}
