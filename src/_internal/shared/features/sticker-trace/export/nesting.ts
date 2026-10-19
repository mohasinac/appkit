/*
 * WHY: Parts have to be placed on a page before anything can be printed, and
 *      the placement decides how much paper a sheet costs. A naive grid on the
 *      widest part wastes most of an A4 when one sticker is large and twenty
 *      are small.
 * WHAT: Shelf packing — parts sorted tall-first, laid in rows, each row only as
 *       tall as its own tallest member.
 *
 * 🛑 SHELF PACKING, NOT A BIN-PACKING OPTIMUM, and that is a deliberate
 * ceiling. Optimal 2D packing is NP-hard; a shelf pack is O(n log n), gives a
 * layout a human can predict by eye, and the residual waste is paper rather
 * than correctness. An operator who can see why a part landed where it did can
 * drag it; one looking at a solver's output cannot.
 *
 * 🛑 Everything here is MILLIMETRES. The one unit that survives from the trace
 * to the paper — see page-sizes.ts.
 *
 * EXPORTS: NestablePart, PlacedPart, NestResult, nestParts
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/export
 * @tag sideEffects:none
 */

import type { PrintPageSize } from "./page-sizes";
import { printableAreaMm } from "./page-sizes";

export interface NestablePart {
  ordinal: number;
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface PlacedPart extends NestablePart {
  /** Page index, 0-based. */
  page: number;
  /** Top-left corner, in page coordinates including the margin. */
  xMm: number;
  yMm: number;
  /** True when the part was turned 90° to fit. */
  rotated: boolean;
}

export interface NestResult {
  placed: PlacedPart[];
  pageCount: number;
  /**
   * Parts that fit on NO page at any rotation.
   *
   * 🛑 Returned rather than thrown, and rather than silently dropped. A part
   * that cannot be placed is a real operator decision — tile it, or send it to
   * a profile with no width limit — and both a crash and a silent omission
   * take that decision away. A silently dropped part is the worse of the two:
   * the export looks complete and is missing a sticker.
   */
  unplaceable: NestablePart[];
}

export interface NestOptions {
  /** Gap between neighbouring parts. Default 2mm — enough for a blade to turn. */
  gapMm?: number;
  /**
   * Nest into the Print-Then-Cut sub-area rather than the printable page.
   *
   * 🛑 Must be passed through from the caller's machine profile, never guessed.
   * `printableAreaMm` defaults it false on purpose so a forgotten flag yields a
   * layout the machine REJECTS rather than one that silently wastes two thirds
   * of the page — a rejected file is noticed, a wasteful one is not.
   */
  forPrintThenCut?: boolean;
}

const DEFAULT_GAP_MM = 2;

/**
 * Lay parts out across as many pages as they need.
 *
 * Tall-first because a shelf's height is set by its tallest member: feeding
 * short parts first leaves tall ones to open a new shelf each, which is the
 * pathological case for this algorithm and costs real paper.
 */
export function nestParts(
  parts: readonly NestablePart[],
  page: PrintPageSize,
  opts: NestOptions = {},
): NestResult {
  const gap = opts.gapMm ?? DEFAULT_GAP_MM;
  const area = printableAreaMm(page, opts.forPrintThenCut ?? false);
  const originX = page.marginMm;
  const originY = page.marginMm;

  const placed: PlacedPart[] = [];
  const unplaceable: NestablePart[] = [];

  /*
   * Decide orientation ONCE, up front: the orientation that makes the part
   * shortest is the one that packs best into shelves, and re-deciding per shelf
   * would make placement depend on arrival order in a way nobody can predict.
   */
  const oriented = parts
    .map((p) => {
      const fitsUnrotated = p.widthMm <= area.widthMm && p.heightMm <= area.heightMm;
      const fitsRotated = p.heightMm <= area.widthMm && p.widthMm <= area.heightMm;
      if (!fitsUnrotated && !fitsRotated) return { part: p, placeable: false as const };
      /*
       * Prefer NOT rotating when both fit. A rotated sticker is harder to
       * check against the original sheet by eye, and the packing gain from
       * turning a part that already fits is marginal.
       */
      const rotated = fitsUnrotated ? false : true;
      return {
        part: p,
        placeable: true as const,
        rotated,
        w: rotated ? p.heightMm : p.widthMm,
        h: rotated ? p.widthMm : p.heightMm,
      };
    })
    .filter((o) => {
      if (!o.placeable) {
        unplaceable.push(o.part);
        return false;
      }
      return true;
    }) as Array<{ part: NestablePart; rotated: boolean; w: number; h: number }>;

  oriented.sort((a, b) => b.h - a.h || b.w - a.w);

  let pageIndex = 0;
  let shelfY = 0;
  let shelfHeight = 0;
  let cursorX = 0;

  for (const item of oriented) {
    // New shelf when this one is full across.
    if (cursorX > 0 && cursorX + item.w > area.widthMm) {
      shelfY += shelfHeight + gap;
      shelfHeight = 0;
      cursorX = 0;
    }
    // New page when the shelf would run off the bottom.
    if (shelfY + item.h > area.heightMm) {
      pageIndex += 1;
      shelfY = 0;
      shelfHeight = 0;
      cursorX = 0;
    }

    placed.push({
      ...item.part,
      page: pageIndex,
      xMm: Math.round((originX + cursorX) * 100) / 100,
      yMm: Math.round((originY + shelfY) * 100) / 100,
      rotated: item.rotated,
    });

    cursorX += item.w + gap;
    shelfHeight = Math.max(shelfHeight, item.h);
  }

  return {
    placed,
    // 0 placed parts is 0 pages, not 1 — an empty page in a PDF is a wasted sheet.
    pageCount: placed.length === 0 ? 0 : pageIndex + 1,
    unplaceable,
  };
}
