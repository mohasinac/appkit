/*
 * WHY: All three machine profiles emit the same geometry and differ only in how
 *      the cut line is LABELLED — a CutContour spot colour for a print broker,
 *      plain stroked geometry for a Cricut. Writing three SVG serialisers would
 *      be three places for a coordinate convention to drift, and a drifted
 *      coordinate is a sticker cut in the wrong place.
 * WHAT: One millimetre-true SVG writer, with the per-profile differences passed
 *       in rather than branched on internally.
 *
 * 🛑 MILLIMETRE-TRUE, which means `width="210mm"` AND a `viewBox` in the same
 * units. An SVG with only a viewBox is scaled by whatever opens it, and
 * "whatever opens it" includes Design Space — a file that looks right in a
 * browser and imports at 96/25.4 the intended size is the classic version of
 * this bug. Both attributes, always, and the numbers must agree.
 *
 * 🛑 Y GROWS DOWNWARD in both SVG and the tracer's raster space, so no flip is
 * applied anywhere. Writing one in "to be safe" mirrors every sticker, which is
 * invisible on a symmetric part and obvious on lettering — i.e. discovered
 * after cutting.
 *
 * EXPORTS: CutSvgPart, CutSvgOptions, buildCutSvg, pathToSvgD, countNodes
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/export,finalizer
 * @tag sideEffects:none
 */

import type { CutPath } from "../types";
import {
  CUT_CONTOUR_HEX,
  CUT_CONTOUR_SVG_NAME,
  CUT_GEOMETRY_HEX,
} from "../cut-contour";
import type { PrintPageSize } from "./page-sizes";

/** One part, already positioned on a page by the nester. */
export interface CutSvgPart {
  ordinal: number;
  name: string;
  /** The outline, in the part's own local millimetre space (origin at 0,0). */
  path: CutPath;
  /** Where the part's top-left corner sits on the page. */
  xMm: number;
  yMm: number;
  /** Turned 90° clockwise by the nester. */
  rotated: boolean;
  /** The part's own size, before rotation. */
  widthMm: number;
  heightMm: number;
}

export interface CutSvgOptions {
  page: PrintPageSize;
  /**
   * Emit the cut line as a CutContour spot colour.
   *
   * 🛑 This is what a print broker's RIP looks for: a named spot colour on a
   * magenta stroke, which their workflow separates into a cut path. A Cricut
   * wants ordinary geometry and ignores the name — so this is `true` for the
   * print-shop profile and `false` for both Cricut profiles.
   */
  cutContourSpot: boolean;
  /** Stroke width in mm. Hairline for a cutter; a cut has no width. */
  strokeMm?: number;
  /** Rendered as an SVG comment, so the file says which run produced it. */
  provenance?: string;
}

/** A cut line has no width; this is only so the path is VISIBLE when opened. */
const DEFAULT_STROKE_MM = 0.1;

/** Trim to 0.001mm — a micron, far below any cutter's mechanical tolerance. */
function mm(n: number): string {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

/**
 * Serialise one closed outline to an SVG `d` attribute.
 *
 * 🛑 Always closed with `Z`. An open cut path makes a cutter travel back to the
 * start with the blade DOWN, scoring a line across the artwork — the one
 * failure here that damages the material rather than just the file.
 */
export function pathToSvgD(
  path: CutPath,
  offsetXMm = 0,
  offsetYMm = 0,
): string {
  const parts: string[] = [
    `M ${mm(path.start.x + offsetXMm)} ${mm(path.start.y + offsetYMm)}`,
  ];
  for (const seg of path.segments) {
    parts.push(
      `C ${mm(seg.c1.x + offsetXMm)} ${mm(seg.c1.y + offsetYMm)} ` +
        `${mm(seg.c2.x + offsetXMm)} ${mm(seg.c2.y + offsetYMm)} ` +
        `${mm(seg.to.x + offsetXMm)} ${mm(seg.to.y + offsetYMm)}`,
    );
  }
  parts.push("Z");
  return parts.join(" ");
}

/**
 * Node count for the whole file, against a machine's budget.
 *
 * One per cubic segment plus the start point — the same thing Design Space
 * counts, and the number that decides whether it can open the file at all.
 */
export function countNodes(parts: readonly CutSvgPart[]): number {
  let total = 0;
  for (const p of parts) total += p.path.segments.length + 1;
  return total;
}

/** XML text escape. Part names are human-entered and reach an attribute. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the cut file for one page.
 *
 * Rotation is applied as a TRANSFORM rather than by rewriting coordinates: the
 * geometry then stays byte-identical to what the tracer produced, so a part can
 * be checked against its own outline without undoing an arithmetic step.
 */
export function buildCutSvg(
  parts: readonly CutSvgPart[],
  opts: CutSvgOptions,
): string {
  const { page, cutContourSpot } = opts;
  const stroke = opts.strokeMm ?? DEFAULT_STROKE_MM;

  const body = parts
    .map((part) => {
      /*
       * A rotated part is placed by its top-left corner, so the rotation has to
       * carry the part back into that box: rotate 90° about the origin, then
       * translate right by its own height. Getting this wrong puts the part
       * exactly one dimension off the page — which is at least obvious.
       */
      const transform = part.rotated
        ? ` transform="translate(${mm(part.xMm + part.heightMm)} ${mm(part.yMm)}) rotate(90)"`
        : ` transform="translate(${mm(part.xMm)} ${mm(part.yMm)})"`;
      return (
        `  <path id="part-${part.ordinal}" data-name="${esc(part.name)}"` +
        `${transform} d="${pathToSvgD(part.path)}" fill="none" ` +
        `stroke="${cutContourSpot ? CUT_CONTOUR_HEX : CUT_GEOMETRY_HEX}" stroke-width="${mm(stroke)}" />`
      );
    })
    .join("\n");

  /*
   * 🛑 The CutContour wrapper is a NAMED GROUP, and the name is the contract —
   * brokers key their cut separation on it. It comes from the shared constant
   * rather than a literal so the studio overlay, this file and the print-shop
   * export cannot disagree about what the cut layer is called.
   */
  const inner = cutContourSpot
    ? `<g id="${CUT_CONTOUR_SVG_NAME}" data-cut-layer="true">\n${body}\n</g>`
    : body;

  const provenance = opts.provenance
    ? `\n  <!-- ${esc(opts.provenance)} -->`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
    `width="${mm(page.widthMm)}mm" height="${mm(page.heightMm)}mm" ` +
    `viewBox="0 0 ${mm(page.widthMm)} ${mm(page.heightMm)}">${provenance}\n` +
    `${inner}\n</svg>\n`
  );
}
