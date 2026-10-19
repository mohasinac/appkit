/*
 * WHY: The PDF mosaic needs three things that live in three different places —
 *      the sheet's page and parts (Firestore), each part's promoted PNG
 *      (Storage), and a layout (the shared nester). `pdfkit` is Node-only and
 *      must stay in `functions/`, so without this the Function would reach into
 *      all three itself and re-derive the layout, which is how a preview and a
 *      printed sheet stop agreeing.
 * WHAT: Everything the mosaic needs, assembled once, with the layout taken
 *       from the same nester the print modal uses.
 *
 * 🛑 IT REFUSES WITHOUT MILLIMETRES. A mosaic's entire purpose is true physical
 * scale; one built from pixel sizes would print at whatever scale the page
 * happened to imply, look completely correct, and yield stickers the wrong
 * size. `bboxMm` is null exactly when the scan's dpi could not be trusted, so
 * that null is the signal — not an inconvenience to work around.
 *
 * EXPORTS: MosaicPartInput, MosaicInputs, collectMosaicInputs
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:functions/sticker-trace
 * @tag sideEffects:storage,firestore
 */

import { stickerSheetsRepository } from "../../../../features/sticker-trace/repository/sticker-sheets.repository";
import { nestParts } from "../../../shared/features/sticker-trace/export/nesting";
import {
  PRINT_PAGE_SIZES,
  type PrintPageSizeId,
} from "../../../shared/features/sticker-trace/export/page-sizes";
import { readScanBytes } from "./storage";

export interface MosaicPartInput {
  ordinal: number;
  name: string;
  page: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotated: boolean;
  /** The promoted full-resolution PNG. */
  png: Uint8Array;
}

export interface MosaicInputs {
  title: string;
  pageWidthMm: number;
  pageHeightMm: number;
  pageCount: number;
  parts: MosaicPartInput[];
  /** Parts that could not be placed on any page, named for the caller to report. */
  unplaceable: Array<{ ordinal: number; name: string }>;
  /** Set when no mosaic can honestly be built; `parts` is then empty. */
  refusedReason: string | null;
}

export async function collectMosaicInputs(
  sheetId: string,
  opts: { pageSizeId?: PrintPageSizeId } = {},
): Promise<MosaicInputs> {
  const sheet = await stickerSheetsRepository.findByIdOrFail(sheetId);
  const page = PRINT_PAGE_SIZES[opts.pageSizeId ?? "a4"];

  const empty = {
    title: sheet.title,
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    pageCount: 0,
    parts: [] as MosaicPartInput[],
    unplaceable: [] as Array<{ ordinal: number; name: string }>,
  };

  const parts = sheet.parts ?? [];
  if (parts.length === 0) {
    return { ...empty, refusedReason: "This sheet has no parts yet — promote a run first." };
  }

  /*
   * 🛑 A promoted part has an `assetPath`; an unpromoted one does not. Building
   * a mosaic from the subset that happens to have one would silently print a
   * partial sheet — so the absence is reported as a refusal naming the fix.
   */
  const withAssets = parts.filter((p) => Boolean(p.assetPath));
  if (withAssets.length === 0) {
    return {
      ...empty,
      refusedReason:
        "These parts have not been rendered at full resolution yet. Promote the run and wait for it to finish.",
    };
  }

  const measured = withAssets.filter((p) => p.bboxMm !== null);
  if (measured.length === 0) {
    return {
      ...empty,
      refusedReason:
        "This scan has no confirmed DPI, so its parts have no real-world size. " +
        "A mosaic prints at true physical scale — confirm the DPI and it becomes available.",
    };
  }

  /*
   * A partial measurement is reported rather than silently dropped. Mixing
   * measured and unmeasured parts on one sheet is the shape that makes a print
   * look complete while missing stickers nobody noticed were absent.
   */
  const unmeasured = withAssets
    .filter((p) => p.bboxMm === null)
    .map((p) => ({ ordinal: p.ordinal, name: p.name }));

  const nest = nestParts(
    measured.map((p) => ({
      ordinal: p.ordinal,
      name: p.name,
      widthMm: p.bboxMm!.width,
      heightMm: p.bboxMm!.height,
    })),
    page,
  );

  /*
   * Downloads are parallel but the list is already bounded: a sheet's parts are
   * capped by the trace's own `maxParts`, and the minimum-area filter removes
   * the speck storm that would otherwise reach here. Still a real cost per
   * part, which is why the mosaic is produced on demand rather than per run.
   */
  const byOrdinal = new Map(measured.map((p) => [p.ordinal, p]));
  const placed = await Promise.all(
    nest.placed.map(async (pl) => {
      const part = byOrdinal.get(pl.ordinal)!;
      return {
        ordinal: pl.ordinal,
        name: pl.name,
        page: pl.page,
        xMm: pl.xMm,
        yMm: pl.yMm,
        widthMm: pl.widthMm,
        heightMm: pl.heightMm,
        rotated: pl.rotated,
        png: await readScanBytes(part.assetPath!),
      } satisfies MosaicPartInput;
    }),
  );

  return {
    title: sheet.title,
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    pageCount: nest.pageCount,
    parts: placed,
    unplaceable: [
      ...nest.unplaceable.map((u) => ({ ordinal: u.ordinal, name: u.name })),
      ...unmeasured,
    ],
    refusedReason: null,
  };
}
