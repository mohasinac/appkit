/*
 * WHY: The print modal, the nester and the PDF writer each need to know how big
 *      a page is and how much of it may be printed on. Three copies of that
 *      table would disagree the first time one of them was corrected, and the
 *      symptom would be a cut file that is subtly the wrong size — which is only
 *      discoverable after it has been printed and cut.
 * WHAT: Every page the tool can target, as data, in millimetres. Includes the
 *       Cricut mat sizes, because a mat IS a page as far as nesting is concerned.
 *
 * 🛑 Names are deliberately `PrintPageSize*`, not `PageSize*`. appkit already
 * exports `PageSizeKey` from constants/pagination-presets, where it means ROWS
 * PER PAGE. Two things called a page size, one of them paper and one of them
 * pagination, is a confusion worth spending six characters to avoid.
 *
 * EXPORTS:
 *   MM_PER_INCH, inchesToMm, PrintPageSizeId, PrintPageSize, PtcArea,
 *   PRINT_PAGE_SIZES, PRINT_PAGE_SIZE_IDS, pageSizeById, customPageSize,
 *   printableAreaMm
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:export/machine-profiles,export/nesting,export/pdf-mosaic,StickerPrintModal
 * @tag sideEffects:none
 */

/** The definition of the inch, exact by international agreement since 1959. */
export const MM_PER_INCH = 25.4;

/**
 * Cricut publishes every dimension in inches, so the constants below are
 * written in inches and converted here rather than being pre-multiplied. A
 * pre-multiplied `114.3` loses the fact that it is 4.5", which is what you need
 * when checking a number against Cricut's own documentation.
 */
export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

/**
 * The Print-Then-Cut cuttable sub-region of a page.
 *
 * 🛑 This is NOT the page minus a uniform margin. Cricut reserves area for the
 * sensor registration marks, and the Joy's 4.5" material width caps the result
 * further — on A4 the cuttable region is a ~78 mm column, roughly a THIRD of
 * the page width. Treating it as "page minus margin" produces a layout the
 * machine silently refuses to register.
 */
export interface PtcArea {
  readonly widthMm: number;
  readonly heightMm: number;
}

export type PrintPageSizeId =
  | "a3"
  | "a4"
  | "a5"
  | "letter"
  | "legal"
  | "tabloid"
  | "joy-mat-standard"
  | "joy-mat-long"
  | "joy-mat-card"
  | "joy-smart-material"
  | "custom";

export interface PrintPageSize {
  readonly id: PrintPageSizeId;
  readonly label: string;
  readonly widthMm: number;
  readonly heightMm: number;
  /**
   * Unprintable border. For paper this is the printer's mechanical margin; for
   * a Cricut mat it is 0, because the mat's stated size IS its usable area —
   * the gridded border sits outside it.
   */
  readonly marginMm: number;
  /** Present only where the page is a Print-Then-Cut target. */
  readonly ptcArea?: PtcArea;
  /**
   * True for a Cricut mat / Smart Material roll rather than a sheet of paper.
   * The nester uses this to decide whether a page may be rotated: paper may,
   * a 4.5"-wide mat may not — rotating it would claim a width the machine
   * does not have.
   */
  readonly isMat: boolean;
}

/**
 * 5 mm is a conservative margin that every consumer inkjet and laser printer
 * clears, chosen rather than measured. It is a DEFAULT, not a constraint: the
 * print modal lets it be overridden per job, and borderless printers can take
 * it to 0. Erring large costs a few mm of nesting area; erring small puts a cut
 * line in the unprintable zone, where it simply does not appear.
 */
const PAPER_MARGIN_MM = 5;

/*
 * Cricut Joy 2 figures below come from Cricut's own published documentation, as
 * researched during planning — not from inference:
 *
 *   cut width          4.5 in
 *   Smart Materials    4.5 x 48 in (one continuous shape to 4 ft)
 *   mats               StandardGrip 4.5 x 6.5 · LightGrip 4.5 x 12 · Card 4.5 x 6.25
 *   PTC area, Letter   9.94 x 3.19 in
 *   PTC area, A4       10.62 x 3.07 in
 *
 * 🛑 Read the PTC pair carefully: the LONG number runs along the page's long
 * edge and the SHORT one across it. On portrait A4 that is a 269.7 x 78.0 mm
 * column. Transposing them yields an area wider than A4 itself, which is the
 * obvious tell that they have been swapped.
 */
const JOY_MAT_WIDTH_IN = 4.5;

export const PRINT_PAGE_SIZES: Readonly<Record<PrintPageSizeId, PrintPageSize>> = {
  a3: {
    id: "a3",
    label: "A3",
    widthMm: 297,
    heightMm: 420,
    marginMm: PAPER_MARGIN_MM,
    isMat: false,
  },
  a4: {
    id: "a4",
    label: "A4",
    widthMm: 210,
    heightMm: 297,
    marginMm: PAPER_MARGIN_MM,
    ptcArea: {
      widthMm: inchesToMm(3.07),
      heightMm: inchesToMm(10.62),
    },
    isMat: false,
  },
  a5: {
    id: "a5",
    label: "A5",
    widthMm: 148,
    heightMm: 210,
    marginMm: PAPER_MARGIN_MM,
    isMat: false,
  },
  letter: {
    id: "letter",
    label: "Letter",
    widthMm: inchesToMm(8.5),
    heightMm: inchesToMm(11),
    marginMm: PAPER_MARGIN_MM,
    ptcArea: {
      widthMm: inchesToMm(3.19),
      heightMm: inchesToMm(9.94),
    },
    isMat: false,
  },
  legal: {
    id: "legal",
    label: "Legal",
    widthMm: inchesToMm(8.5),
    heightMm: inchesToMm(14),
    marginMm: PAPER_MARGIN_MM,
    isMat: false,
  },
  tabloid: {
    id: "tabloid",
    label: "Tabloid",
    widthMm: inchesToMm(11),
    heightMm: inchesToMm(17),
    marginMm: PAPER_MARGIN_MM,
    isMat: false,
  },

  "joy-mat-standard": {
    id: "joy-mat-standard",
    label: 'Cricut Joy StandardGrip mat (4.5 x 6.5")',
    widthMm: inchesToMm(JOY_MAT_WIDTH_IN),
    heightMm: inchesToMm(6.5),
    marginMm: 0,
    isMat: true,
  },
  "joy-mat-long": {
    id: "joy-mat-long",
    label: 'Cricut Joy LightGrip mat (4.5 x 12")',
    widthMm: inchesToMm(JOY_MAT_WIDTH_IN),
    heightMm: inchesToMm(12),
    marginMm: 0,
    isMat: true,
  },
  "joy-mat-card": {
    id: "joy-mat-card",
    label: 'Cricut Joy Card mat (4.5 x 6.25")',
    widthMm: inchesToMm(JOY_MAT_WIDTH_IN),
    heightMm: inchesToMm(6.25),
    marginMm: 0,
    isMat: true,
  },
  "joy-smart-material": {
    id: "joy-smart-material",
    label: 'Cricut Joy Smart Material (4.5 x 48")',
    widthMm: inchesToMm(JOY_MAT_WIDTH_IN),
    heightMm: inchesToMm(48),
    marginMm: 0,
    isMat: true,
  },

  /**
   * A placeholder row so the id union is total and the picker has something to
   * select. Its dimensions are meaningless — always build the real one with
   * `customPageSize()`, which is why both are 0 rather than a plausible-looking
   * A4 that would silently stand in for a forgotten override.
   */
  custom: {
    id: "custom",
    label: "Custom size",
    widthMm: 0,
    heightMm: 0,
    marginMm: PAPER_MARGIN_MM,
    isMat: false,
  },
};

/** Stable display order for pickers: papers first, then mats, then custom. */
export const PRINT_PAGE_SIZE_IDS: readonly PrintPageSizeId[] = [
  "a4",
  "a3",
  "a5",
  "letter",
  "legal",
  "tabloid",
  "joy-mat-standard",
  "joy-mat-long",
  "joy-mat-card",
  "joy-smart-material",
  "custom",
];

export function pageSizeById(id: PrintPageSizeId): PrintPageSize {
  return PRINT_PAGE_SIZES[id];
}

/**
 * Build a custom page. Dimensions are caller-supplied and validated here rather
 * than at each call site: a zero or negative page silently produces an empty
 * nest, which reads as "nothing fitted" instead of "the page was never set".
 */
export function customPageSize(
  widthMm: number,
  heightMm: number,
  marginMm: number = PAPER_MARGIN_MM,
): PrintPageSize {
  if (!(widthMm > 0) || !(heightMm > 0)) {
    throw new Error(
      `customPageSize: width and height must both be > 0 (got ${widthMm}x${heightMm})`,
    );
  }
  if (marginMm < 0 || marginMm * 2 >= Math.min(widthMm, heightMm)) {
    throw new Error(
      `customPageSize: margin ${marginMm}mm leaves no printable area on ${widthMm}x${heightMm}mm`,
    );
  }
  return {
    ...PRINT_PAGE_SIZES.custom,
    widthMm,
    heightMm,
    marginMm,
  };
}

/**
 * The area parts may actually be nested into.
 *
 * `forPrintThenCut` is not a styling choice — on a PTC target the usable region
 * is the sensor-constrained sub-area, which is dramatically smaller than the
 * page minus its margin. Defaulting it to `false` means a caller who forgets it
 * gets the LARGER area, so the failure is a layout the machine rejects rather
 * than one that silently wastes two thirds of the page. That direction is
 * chosen deliberately: a rejected file is noticed, a wasteful one is not.
 */
export function printableAreaMm(
  page: PrintPageSize,
  forPrintThenCut = false,
): { widthMm: number; heightMm: number } {
  if (forPrintThenCut) {
    if (!page.ptcArea) {
      throw new Error(
        `printableAreaMm: ${page.id} has no Print-Then-Cut area; only ${PRINT_PAGE_SIZE_IDS.filter(
          (id) => PRINT_PAGE_SIZES[id].ptcArea,
        ).join(", ")} do`,
      );
    }
    return { widthMm: page.ptcArea.widthMm, heightMm: page.ptcArea.heightMm };
  }
  return {
    widthMm: page.widthMm - page.marginMm * 2,
    heightMm: page.heightMm - page.marginMm * 2,
  };
}
