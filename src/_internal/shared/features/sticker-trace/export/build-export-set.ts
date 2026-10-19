/*
 * WHY: The finalizer has carried an optional `buildCutSvg` hook since the
 *      fan-out shipped, deliberately unfilled — the exporter belongs to the
 *      export suite, not the pipeline. This is the function that fills it, and
 *      it is the one place the six export modules are composed in the right
 *      order.
 * WHAT: Geometry in pixels → a machine-ready, millimetre-true cut file, plus a
 *       report of everything the operator needs to know before printing.
 *
 * 🛑 PIXELS BECOME MILLIMETRES HERE, AND ONLY HERE, AND ONLY WITH A REAL DPI.
 * With no trustworthy dpi there is no honest conversion, so this REFUSES rather
 * than picking 72 or 96 — the numbers five of the nine reference scans falsely
 * declare. A cut file is a physical artefact: emitting one at a guessed scale
 * produces stickers that are confidently the wrong size, and nothing downstream
 * can detect it. An absent file with a stated reason is strictly better.
 *
 * 🛑 THE ORDER OF THE STEPS IS THE CONTRACT. Simplify BEFORE nesting, because
 * simplification cannot change a bounding box but nesting depends on one;
 * oversize-check AFTER nesting, because the page's own cuttable area may be
 * tighter than the machine's width. Swapping either produces a layout that is
 * self-consistent and wrong.
 *
 * EXPORTS: ExportInput, ExportReport, ExportSet, buildExportSet
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/finalizer,PrintLayoutModal
 * @tag sideEffects:none
 */

import type { CutPath, Point, Rect } from "../types";
import { buildCutSvg, countNodes, type CutSvgPart } from "./cut-svg";
import {
  partFitsProfile,
  type MachineProfile,
  type PartFitVerdict,
} from "./machine-profiles";
import { nestParts, type NestablePart, type PlacedPart } from "./nesting";
import type { PrintPageSize } from "./page-sizes";
import { simplifyToBudget } from "./simplify-budget";

/** One traced part as the geometry artifact stores it — pixels, sheet-relative. */
export interface ExportPartInput {
  ordinal: number;
  name: string;
  /** Position and size within the working raster, in PIXELS. */
  bboxPx: Rect;
  /** Outline in the same pixel space. */
  path: CutPath;
}

export interface ExportInput {
  parts: readonly ExportPartInput[];
  profile: MachineProfile;
  page: PrintPageSize;
  /**
   * Pixels per millimetre for the working raster.
   *
   * 🛑 `null` means the scan's dpi could not be trusted. `buildExportSet` then
   * returns `null` for the file and says why — see the header.
   */
  pxPerMm: number | null;
  /** Written into the SVG as a comment, so a file on disk names its run. */
  provenance?: string;
}

/** A part this machine cannot cut, with the machine's own reasons. */
export interface UnfitPart {
  ordinal: number;
  name: string;
  widthMm: number;
  heightMm: number;
  verdict: PartFitVerdict;
}

export interface ExportReport {
  /** Parts this machine cannot cut, NAMED rather than scaled. */
  unfit: UnfitPart[];
  /** Parts the nester could not place at any rotation on any page. */
  unplaceable: Array<{ ordinal: number; name: string }>;
  nodesBefore: number;
  nodesAfter: number;
  /** Worst-case error the node budget introduced, in mm. */
  maxDeviationMm: number;
  /** True when the node budget could not be met — the file may not open. */
  overBudget: boolean;
  pageCount: number;
}

export interface ExportSet {
  /** One SVG per page, in page order. Empty when `refusedReason` is set. */
  pages: string[];
  report: ExportReport;
  /**
   * Set when no file could honestly be produced. The UI shows this verbatim —
   * it is the difference between "no cut file yet" and "we cannot make one
   * until you confirm the DPI".
   */
  refusedReason: string | null;
}

/** Scale a path from pixel space into millimetres, relative to its own bbox. */
function pathToLocalMm(path: CutPath, bbox: Rect, pxPerMm: number): CutPath {
  const toMm = (p: Point): Point => ({
    x: (p.x - bbox.x) / pxPerMm,
    y: (p.y - bbox.y) / pxPerMm,
  });
  return {
    start: toMm(path.start),
    segments: path.segments.map((s) => ({
      c1: toMm(s.c1),
      c2: toMm(s.c2),
      to: toMm(s.to),
    })),
  };
}

export function buildExportSet(input: ExportInput): ExportSet {
  const emptyReport: ExportReport = {
    unfit: [],
    unplaceable: [],
    nodesBefore: 0,
    nodesAfter: 0,
    maxDeviationMm: 0,
    overBudget: false,
    pageCount: 0,
  };

  if (input.pxPerMm === null || !(input.pxPerMm > 0)) {
    return {
      pages: [],
      report: emptyReport,
      refusedReason:
        "This scan has no confirmed DPI, so its parts have no real-world size. " +
        "A cut file must be millimetre-true — confirm or measure the DPI and " +
        "the export becomes available.",
    };
  }

  if (input.parts.length === 0) {
    return { pages: [], report: emptyReport, refusedReason: "This run produced no parts." };
  }

  const pxPerMm = input.pxPerMm;

  // 1 — into local millimetre space, one part at a time.
  const localMm = input.parts.map((p) => ({
    ordinal: p.ordinal,
    name: p.name,
    widthMm: p.bboxPx.width / pxPerMm,
    heightMm: p.bboxPx.height / pxPerMm,
    path: pathToLocalMm(p.path, p.bboxPx, pxPerMm),
  }));

  /*
   * 2 — simplify to the machine's node budget.
   *
   * Before nesting: dropping nodes cannot change a part's bounding box (the
   * extremes are kept), so the layout computed afterwards is still valid. Doing
   * it after would mean nesting against one geometry and exporting another.
   */
  const simplified = simplifyToBudget(
    localMm.map((p) => p.path),
    input.profile.nodeBudget,
  );

  // 3 — nest onto pages.
  const nestable: NestablePart[] = localMm.map((p) => ({
    ordinal: p.ordinal,
    name: p.name,
    widthMm: p.widthMm,
    heightMm: p.heightMm,
  }));
  const nest = nestParts(nestable, input.page, {
    forPrintThenCut: input.profile.registrationMarks,
  });

  /*
   * 4 — fitness check, AFTER nesting and against the PAGE as well as the
   * machine.
   *
   * `partFitsProfile` resolves the width limit through `maxCutWidthMmForPage`,
   * so a Joy's 114mm material is intersected with its A4 Print-Then-Cut column
   * (~78mm) rather than quoted on its own. It REPORTS only — never scales,
   * crops or rotates to make something fit, because an output that looks right
   * is the worst available failure here.
   */
  const unfit: UnfitPart[] = [];
  for (const p of localMm) {
    const verdict = partFitsProfile(
      { widthMm: p.widthMm, heightMm: p.heightMm },
      input.profile,
      input.page,
    );
    if (!verdict.fits) {
      unfit.push({
        ordinal: p.ordinal,
        name: p.name,
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        verdict,
      });
    }
  }

  // 5 — one SVG per page.
  const byOrdinal = new Map<number, { path: CutPath; widthMm: number; heightMm: number }>();
  localMm.forEach((p, i) => {
    byOrdinal.set(p.ordinal, {
      path: simplified.paths[i] ?? p.path,
      widthMm: p.widthMm,
      heightMm: p.heightMm,
    });
  });

  const pages: string[] = [];
  for (let pageIndex = 0; pageIndex < nest.pageCount; pageIndex++) {
    const onThisPage: CutSvgPart[] = nest.placed
      .filter((pl: PlacedPart) => pl.page === pageIndex)
      .map((pl) => {
        const geo = byOrdinal.get(pl.ordinal)!;
        return {
          ordinal: pl.ordinal,
          name: pl.name,
          path: geo.path,
          xMm: pl.xMm,
          yMm: pl.yMm,
          rotated: pl.rotated,
          widthMm: geo.widthMm,
          heightMm: geo.heightMm,
        };
      });

    pages.push(
      buildCutSvg(onThisPage, {
        page: input.page,
        // The spot colour is the print-shop contract; a Cricut ignores the name
        // and wants plain geometry, so the emit kind decides rather than a flag.
        cutContourSpot: input.profile.emits === "cutcontour-svg",
        provenance: input.provenance
          ? `${input.provenance} · page ${pageIndex + 1}/${nest.pageCount} · ${input.profile.label}`
          : undefined,
      }),
    );
  }

  return {
    pages,
    report: {
      unfit,
      unplaceable: nest.unplaceable.map((u) => ({ ordinal: u.ordinal, name: u.name })),
      nodesBefore: simplified.nodesBefore,
      nodesAfter: simplified.nodesAfter,
      maxDeviationMm: simplified.maxDeviationMm,
      overBudget: simplified.overBudget,
      pageCount: nest.pageCount,
    },
    refusedReason: null,
  };
}

/** Total nodes across every page, for a UI that wants one number. */
export function totalNodes(set: ExportSet, parts: readonly CutSvgPart[]): number {
  return set.pages.length === 0 ? 0 : countNodes(parts);
}
