/*
 * WHY: `PrintCenterView` sized its labels `w-[200px]` and emitted no `@page`
 *      rule at all, so printing to a thermal label printer produced the
 *      browser's default page — A4 — with a 200-pixel card floating in the
 *      corner of it. Nothing errored. The operator discovered it by holding a
 *      mostly-blank 50 x 25 mm label.
 * WHAT: Every label stock this project can target, in MILLIMETRES, plus the
 *       check that says whether a given payload actually fits on one.
 *
 * 🛑 IMPORTS `page-sizes.ts` RATHER THAN RESTATING IT. That module already owns
 * `MM_PER_INCH`, `inchesToMm` and the A4/Letter geometry, and its own header
 * explains why: three copies of a page table disagree the first time one of
 * them is corrected, and the symptom is a print that is subtly the wrong size,
 * discoverable only after it has been printed.
 *
 * EXPORTS:
 *   LabelProfileId, LabelProfile, SheetLayout, LABEL_PROFILES,
 *   LABEL_PROFILE_IDS, labelProfileById, labelPageCss, labelFitsProfile,
 *   code128WidthMm, SAFE_MODULE_MM, MIN_SCANNABLE_MODULE_MM
 *
 * @tag domain:print
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import {
  MM_PER_INCH,
  PRINT_PAGE_SIZES,
  type PrintPageSize,
} from "../sticker-trace/export/page-sizes";

// ── Barcode physics ─────────────────────────────────────────────────────────

/**
 * CODE128 module width at which essentially every handheld scanner reads
 * reliably, including cheap CCD units at an angle. 0.25 mm ≈ 10 mil.
 */
export const SAFE_MODULE_MM = 0.25;

/**
 * The floor. Below this a symbol is a lottery: good scanners manage it under
 * good light at a good angle, and a receive station is none of those things.
 */
export const MIN_SCANNABLE_MODULE_MM = 0.19;

/**
 * How wide a CODE128-B symbol must be, in mm, INCLUDING its quiet zones.
 *
 * Structure, from the symbology itself rather than from a chart:
 *   start   11 modules
 *   each data character 11 modules
 *   check   11 modules
 *   stop    13 modules
 *   quiet   10 modules each side (the spec minimum)
 *
 * so `11 x (n + 2) + 13 + 20` modules for `n` data characters.
 *
 * 🛑 THE QUIET ZONE IS PART OF THE SYMBOL, not padding around it. A label sized
 * to the bars alone prints a barcode whose first bar touches the die-cut edge,
 * and a scanner has nothing to lock onto — it reads as a smudged or damaged
 * label rather than as a layout mistake.
 *
 * 🛑 This also CORRECTS a number already written down elsewhere. The
 * barcode-vs-SKU header in `id-generators.ts` derives "a ~42 mm minimum" from
 * the 12-character `LIR-XXXXXXXX` form; that figure omits the quiet zones.
 * 11 x 14 + 13 = 167 modules of bars, but 187 with them, which is 46.75 mm at
 * `SAFE_MODULE_MM` — not 42. The smaller figure is the dangerous direction to
 * be wrong in, because it says yes to stock that cannot carry the symbol.
 */
export function code128WidthMm(
  characters: number,
  moduleMm: number = SAFE_MODULE_MM,
): number {
  if (!(characters > 0)) {
    throw new Error(`code128WidthMm: characters must be > 0 (got ${characters})`);
  }
  if (!(moduleMm > 0)) {
    throw new Error(`code128WidthMm: moduleMm must be > 0 (got ${moduleMm})`);
  }
  const modules = 11 * (characters + 2) + 13 + 20;
  return modules * moduleMm;
}

// ── Profiles ────────────────────────────────────────────────────────────────

/**
 * An A4 sheet of die-cut labels: where the first one starts and how far apart
 * they are. `null` on a thermal profile, where the page IS the label.
 *
 * 🛑 PITCH, NOT GAP. Pitch is centre-to-centre and is what positions label
 * number 40; a gap has to be added to a width to get there, and any rounding in
 * the width then accumulates down the column. Avery publish pitch for the same
 * reason.
 */
export interface SheetLayout {
  readonly columns: number;
  readonly rows: number;
  /** Distance from the page's left edge to the first label's left edge. */
  readonly marginLeftMm: number;
  /** Distance from the page's top edge to the first label's top edge. */
  readonly marginTopMm: number;
  /** Centre-to-centre horizontal spacing. */
  readonly pitchXMm: number;
  /** Centre-to-centre vertical spacing. */
  readonly pitchYMm: number;
}

export type LabelProfileId =
  | "thermal-50x25"
  | "thermal-38x25"
  | "thermal-100x50"
  | "a4-65up"
  | "a4-24up"
  | "a4-8up";

export interface LabelProfile {
  readonly id: LabelProfileId;
  readonly label: string;
  /** One label's die-cut size. */
  readonly widthMm: number;
  readonly heightMm: number;
  /** Printable inset inside the label. */
  readonly paddingMm: number;
  /** The page the printer is fed. For thermal, the page is one label. */
  readonly page: { readonly widthMm: number; readonly heightMm: number };
  /** Null for thermal — a roll has no grid. */
  readonly sheet: SheetLayout | null;
  readonly isThermal: boolean;
}

/*
 * 🛑 THE A4 SHEET GEOMETRY BELOW IS FROM AVERY'S PUBLISHED TEMPLATE SPECS, NOT
 * MEASURED. That distinction matters more here than almost anywhere else in
 * this codebase: a pitch that is wrong by half a millimetre is invisible on
 * label one and has drifted off the die-cut entirely by label thirteen, and the
 * cost is a whole sheet of label stock per attempt.
 *
 * PRINT ONE SHEET ON PLAIN PAPER AND HOLD IT AGAINST THE LABEL STOCK BEFORE ANY
 * BATCH RUN. That is the only check that settles it, and it costs one sheet of
 * paper. Corrections belong here, with the date and the stock they were
 * measured against.
 */
const A4 = PRINT_PAGE_SIZES.a4;
const a4Page = { widthMm: A4.widthMm, heightMm: A4.heightMm } as const;

/** Thermal page = one label, so margins are zero by construction. */
function thermal(
  id: LabelProfileId,
  label: string,
  widthMm: number,
  heightMm: number,
): LabelProfile {
  return {
    id,
    label,
    widthMm,
    heightMm,
    /*
     * 1.5 mm, which is a DIE-CUT tolerance rather than a design margin.
     * Thermal label rolls wander laterally by about a millimetre as they feed,
     * so ink placed closer than this to the edge lands on the liner on some
     * labels and not others — the defect appears on one label in ten and reads
     * as a printer fault.
     */
    paddingMm: 1.5,
    page: { widthMm, heightMm },
    sheet: null,
    isThermal: true,
  };
}

export const LABEL_PROFILES: Readonly<
  Record<LabelProfileId, LabelProfile>
> = {
  "thermal-50x25": thermal(
    "thermal-50x25",
    "Thermal roll 50 x 25 mm",
    50,
    25,
  ),
  "thermal-38x25": thermal(
    "thermal-38x25",
    "Thermal roll 38 x 25 mm",
    38,
    25,
  ),
  "thermal-100x50": thermal(
    "thermal-100x50",
    "Thermal roll 100 x 50 mm (box labels)",
    100,
    50,
  ),

  "a4-65up": {
    id: "a4-65up",
    label: "A4 sheet, 65-up (38.1 x 21.2 mm — Avery L7651)",
    widthMm: 38.1,
    heightMm: 21.2,
    paddingMm: 1,
    page: a4Page,
    sheet: {
      columns: 5,
      rows: 13,
      marginLeftMm: 4.65,
      marginTopMm: 10.7,
      pitchXMm: 40.6,
      pitchYMm: 21.2,
    },
    isThermal: false,
  },
  "a4-24up": {
    id: "a4-24up",
    label: "A4 sheet, 24-up (63.5 x 33.9 mm — Avery L7159)",
    widthMm: 63.5,
    heightMm: 33.9,
    paddingMm: 1.5,
    page: a4Page,
    sheet: {
      columns: 3,
      rows: 8,
      marginLeftMm: 7.1,
      marginTopMm: 13.1,
      pitchXMm: 66.0,
      pitchYMm: 34.0,
    },
    isThermal: false,
  },
  "a4-8up": {
    id: "a4-8up",
    label: "A4 sheet, 8-up (99.1 x 67.7 mm — Avery L7165)",
    widthMm: 99.1,
    heightMm: 67.7,
    paddingMm: 2,
    page: a4Page,
    sheet: {
      columns: 2,
      rows: 4,
      marginLeftMm: 4.65,
      marginTopMm: 13.1,
      pitchXMm: 101.6,
      pitchYMm: 67.7,
    },
    isThermal: false,
  },
};

/** Thermal first — it is what the warehouse actually uses day to day. */
export const LABEL_PROFILE_IDS: readonly LabelProfileId[] = [
  "thermal-50x25",
  "thermal-38x25",
  "thermal-100x50",
  "a4-65up",
  "a4-24up",
  "a4-8up",
];

export function labelProfileById(id: LabelProfileId): LabelProfile {
  return LABEL_PROFILES[id];
}

// ── The @page rule ──────────────────────────────────────────────────────────

/**
 * The real print geometry, as CSS.
 *
 * 🛑 `@page { size: <w>mm <h>mm; margin: 0 }` IS THE WHOLE POINT OF THIS
 * MODULE. Without it the browser prints the user's default paper and the label
 * is a small rectangle somewhere on an A4 sheet. `margin: 0` is not tidiness:
 * a thermal page IS one label, so any page margin shrinks the label and the
 * content no longer lines up with the die-cut.
 *
 * 🛑 `@page` IS DOCUMENT-GLOBAL AND CANNOT BE SCOPED. Two components each
 * emitting one does not give two geometries — the later in document order
 * wins, silently. So exactly ONE owner may call this per printable view, and
 * that owner is the thing that knows which profile the user picked.
 *
 * The screen preview is deliberately NOT styled from here. A label shown at its
 * true physical size on a 27-inch monitor is a postage stamp nobody can read,
 * and mm in a browser depend on a reported DPI that is usually a guess.
 */
export function labelPageCss(profile: LabelProfile): string {
  const { widthMm, heightMm } = profile.page;
  return [
    `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`,
    `@media print {`,
    `  html, body { margin: 0; padding: 0; }`,
    `  .no-print { display: none !important; }`,
    /*
     * One label per page on thermal: the printer advances to the next label on
     * a page break, so a break after each one is what keeps content and
     * die-cut aligned. On a sheet the labels are positioned within one page
     * instead, so breaking after each would waste 64 of 65.
     */
    profile.isThermal
      ? `  .appkit-label { break-after: page; page-break-after: always; }`
      : `  .appkit-label-sheet { break-inside: avoid; page-break-inside: avoid; }`,
    `  .appkit-label { break-inside: avoid; page-break-inside: avoid; }`,
    `}`,
  ].join("\n");
}

/**
 * The `@page` rule for an ordinary printed DOCUMENT — a packing slip, a box
 * contents sheet — rather than a label.
 *
 * 🛑 Lives here rather than in the view for one reason: `audit-label-profiles`
 * R3 allows exactly one module to author `@page`, because the rule is
 * document-global and a second author does not add a geometry — the later one
 * silently wins. A view that needed A4 would otherwise have to write its own
 * and defeat that guarantee.
 *
 * 🛑 It takes explicit mm, never `size: A4`. A named paper size is the original
 * bug this module exists to fix: the browser prints its default page, which is
 * A4 for some users and Letter for others, and the layout silently differs by
 * 18 mm of height between them.
 */
export function documentPageCss(
  page: { widthMm: number; heightMm: number } = {
    widthMm: PRINT_PAGE_SIZES.a4.widthMm,
    heightMm: PRINT_PAGE_SIZES.a4.heightMm,
  },
  marginMm = 0,
): string {
  return [
    `@page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: ${marginMm}mm; }`,
    `@media print {`,
    `  html, body { margin: 0; padding: 0; }`,
    `  .no-print { display: none !important; }`,
    `  .appkit-label-sheet { break-inside: avoid; page-break-inside: avoid; }`,
    `}`,
  ].join("\n");
}

// ── The fit check ───────────────────────────────────────────────────────────

export interface LabelFitReport {
  readonly fits: boolean;
  /** Width the symbol needs at `SAFE_MODULE_MM`, quiet zones included. */
  readonly requiredMm: number;
  /** Width the label actually offers once padding is removed. */
  readonly availableMm: number;
  /**
   * The module width this stock would force. Compare against
   * `MIN_SCANNABLE_MODULE_MM` — below it the symbol is unreliable rather than
   * merely small.
   */
  readonly impliedModuleMm: number;
  /** Plain-language reason, safe to show an operator verbatim. */
  readonly reason: string;
}

/**
 * Does a barcode of `characters` length fit this label — and if not, why.
 *
 * 🛑 THIS REPORTS. IT NEVER SCALES, AND THAT IS THE ENTIRE DESIGN.
 *
 * Scaling a barcode to fit is the obvious, wrong answer, and it fails in the
 * worst possible way: the label looks perfect. The bars are narrower, the
 * proportions are right, a human sees a barcode — and the module width has
 * dropped below what a scanner can resolve, so it does not read. The failure
 * surfaces weeks later at a receive station as "the scanner is broken", and the
 * labels have all been printed and stuck to things by then.
 *
 * A refusal to print is noticed in the second it happens, by the person who can
 * still choose different stock. That is the only trade this function makes.
 *
 * 🛑 COMPUTED AGAINST THE PROFILES ABOVE, NOT ASSERTED. A 12-character
 * `LIR-XXXXXXXX` symbol needs 187 modules = 46.75 mm at `SAFE_MODULE_MM`, and
 * the six stocks answer differently enough that a single "does it fit" boolean
 * would have been a lie:
 *
 *   thermal-100x50   97.0 mm   0.519 mm/module   comfortable
 *   a4-8up           95.1 mm   0.509 mm/module   comfortable
 *   a4-24up          60.5 mm   0.324 mm/module   comfortable
 *   thermal-50x25    47.0 mm   0.251 mm/module   fits by 0.25 mm — no slack
 *   a4-65up          36.1 mm   0.193 mm/module   over the floor by 0.003 mm
 *   thermal-38x25    35.0 mm   0.187 mm/module   BELOW the floor
 *
 * 🛑 An earlier draft of this comment claimed `a4-65up` "cannot carry" the
 * symbol. It can, barely — 0.193 against a 0.19 floor — and overstating it
 * would have had someone discard working stock. The two genuinely notable rows
 * are the last two, and they are notable for opposite reasons: 65-up is
 * technically above the floor with no margin whatsoever for a worn printhead,
 * and 38x25 is the one stock that simply cannot do it.
 *
 * All six stay in the list. 38x25 is fine for a shorter code or a text-only
 * label, and silently dropping stock the warehouse already owns teaches nobody
 * why it was dropped.
 */
export function labelFitsProfile(
  profile: LabelProfile,
  characters: number,
): LabelFitReport {
  const availableMm = profile.widthMm - profile.paddingMm * 2;
  const requiredMm = code128WidthMm(characters, SAFE_MODULE_MM);
  const modules = 11 * (characters + 2) + 13 + 20;
  const impliedModuleMm = availableMm / modules;
  const fits = availableMm >= requiredMm;

  if (fits) {
    return {
      fits: true,
      requiredMm,
      availableMm,
      impliedModuleMm,
      reason: `${characters}-character barcode fits ${profile.label} with ${(availableMm - requiredMm).toFixed(1)} mm to spare.`,
    };
  }

  /*
   * Two different refusals, because they have different remedies. "Too narrow
   * but still scannable" means the stock works and the margin is thin; "below
   * the scanning floor" means no amount of care will make it read, and the
   * answer is different stock or a shorter code.
   */
  const scannable = impliedModuleMm >= MIN_SCANNABLE_MODULE_MM;
  return {
    fits: false,
    requiredMm,
    availableMm,
    impliedModuleMm,
    reason: scannable
      ? `${profile.label} offers ${availableMm.toFixed(1)} mm of printable width; a ${characters}-character CODE128 needs ${requiredMm.toFixed(1)} mm at a comfortable density. It would print at ${impliedModuleMm.toFixed(3)} mm per module — above the ${MIN_SCANNABLE_MODULE_MM} mm floor, so it should still scan, but with no margin for a worn printhead or an angled read.`
      : `${profile.label} cannot carry a ${characters}-character CODE128. It offers ${availableMm.toFixed(1)} mm against the ${requiredMm.toFixed(1)} mm needed, which would force ${impliedModuleMm.toFixed(3)} mm per module — below the ${MIN_SCANNABLE_MODULE_MM} mm scanning floor. Pick wider stock, or shorten the code.`,
  };
}

/**
 * Where label `index` sits on a sheet, in mm from the page's top-left.
 *
 * Returns null past the last position on the sheet, which the caller must read
 * as "start a new page" rather than as an error — a 70-label job on 65-up stock
 * is two pages, not a failure.
 */
export function sheetPositionMm(
  sheet: SheetLayout,
  index: number,
): { leftMm: number; topMm: number } | null {
  const perPage = sheet.columns * sheet.rows;
  if (index < 0 || index >= perPage) return null;
  const col = index % sheet.columns;
  const row = Math.floor(index / sheet.columns);
  return {
    leftMm: sheet.marginLeftMm + col * sheet.pitchXMm,
    topMm: sheet.marginTopMm + row * sheet.pitchYMm,
  };
}

/**
 * Sanity check that a sheet's own grid fits on its own page.
 *
 * 🛑 Exists because the Avery figures above are transcribed, and a transposed
 * digit in a pitch is invisible until a batch has been printed. The last
 * label's far edge is `margin + (n - 1) x pitch + size`; if that exceeds the
 * page, the grid is wrong on paper and nothing else in this module would say
 * so. Call it from the audit, not at render time.
 */
export function sheetOverflowMm(profile: LabelProfile): {
  rightMm: number;
  bottomMm: number;
} | null {
  const s = profile.sheet;
  if (!s) return null;
  const right =
    s.marginLeftMm + (s.columns - 1) * s.pitchXMm + profile.widthMm;
  const bottom = s.marginTopMm + (s.rows - 1) * s.pitchYMm + profile.heightMm;
  return {
    rightMm: right - profile.page.widthMm,
    bottomMm: bottom - profile.page.heightMm,
  };
}

/** Re-exported so a caller converting a legacy inch figure need not hunt. */
export { MM_PER_INCH };
export type { PrintPageSize };
