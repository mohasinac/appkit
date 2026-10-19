/*
 * WHY: `buildExportSet` is pure — it takes geometry, a profile, a page and a
 *      pixels-per-millimetre figure. The finalizer has none of those: it has a
 *      runId and a sheetId. Something has to read the artifact and the sheet
 *      and bridge the two, and it cannot live in the shared tree because it
 *      touches Storage and Firestore.
 * WHAT: The adapter that fills `FinalizerDeps.buildCutSvg`.
 *
 * 🛑 THE DEFAULT PROFILE IS THE PRINT SHOP, deliberately. It has no width
 * limit and no node budget, so a cut file produced without anyone choosing a
 * machine is the one that excludes the fewest parts and refuses the fewest
 * sheets. A Cricut default would silently drop every part wider than ~78mm
 * from the automatic export, and the operator would have no reason to look.
 * Machine-specific files are produced on demand from the print modal, where a
 * machine HAS been chosen.
 *
 * 🛑 It returns `null` rather than throwing when no honest file can be made —
 * most often because the scan has no confirmed DPI. The finalizer already
 * treats a missing exporter as a successful run with no `cutSvgPath`, so a null
 * lands in a path that is already correct; throwing would fail a run whose
 * trace succeeded, over an export that is optional by design.
 *
 * EXPORTS: buildCutFileForRun, buildCutFileBytes
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:functions/sticker-trace
 * @tag sideEffects:storage,firestore
 */

import { normalizeError } from "../../../../errors/normalize";
import { stickerSheetsRepository } from "../../../../features/sticker-trace/repository/sticker-sheets.repository";
import { serverLogger } from "../../../../monitoring";
import {
  buildExportSet,
  type ExportSet,
} from "../../../shared/features/sticker-trace/export/build-export-set";
import { MACHINE_PROFILES } from "../../../shared/features/sticker-trace/export/machine-profiles";
import {
  PRINT_PAGE_SIZES,
  type PrintPageSizeId,
} from "../../../shared/features/sticker-trace/export/page-sizes";
import { readRunGeometry } from "./storage";

/** Millimetres per inch, for the dpi → px-per-mm conversion. */
const MM_PER_INCH = 25.4;

export interface BuildCutFileOptions {
  profileId?: keyof typeof MACHINE_PROFILES;
  pageSizeId?: PrintPageSizeId;
}

/**
 * Build the export set for one run.
 *
 * Returns the full `ExportSet` — including `refusedReason` — because the print
 * modal needs the report (unfit parts, node deviation, page count) and not just
 * the bytes. `buildCutFileBytes` is the narrow wrapper the finalizer uses.
 */
export async function buildCutFileForRun(
  runId: string,
  sheetId: string,
  opts: BuildCutFileOptions = {},
): Promise<ExportSet> {
  const [sheet, geometry] = await Promise.all([
    stickerSheetsRepository.findByIdOrFail(sheetId),
    readRunGeometry(runId, sheetId),
  ]);

  const profile = MACHINE_PROFILES[opts.profileId ?? "print-shop"];
  const page = PRINT_PAGE_SIZES[opts.pageSizeId ?? "a4"];

  /*
   * The geometry is in WORKING raster pixels; `sheet.dpi` describes the
   * ORIGINAL scan. The ratio between them is the downscale the tier applied,
   * and it has to be divided back out — otherwise every millimetre is wrong by
   * exactly that factor, and every one of them looks plausible. Same bridge as
   * the promote path, for the same reason.
   */
  const workingToOriginal =
    sheet.widthPx > 0 && geometry.workingSize.width > 0
      ? sheet.widthPx / geometry.workingSize.width
      : null;

  const pxPerMm =
    sheet.dpi && sheet.dpi > 0 && workingToOriginal !== null
      ? sheet.dpi / MM_PER_INCH / workingToOriginal
      : null;

  return buildExportSet({
    parts: geometry.parts.map((g) => ({
      ordinal: g.ordinal,
      name: String(g.ordinal),
      bboxPx: g.bbox,
      path: g.path,
    })),
    profile,
    page,
    pxPerMm,
    provenance: `${sheet.title} · run ${runId}`,
  });
}

/**
 * The finalizer's hook: bytes, or null.
 *
 * 🛑 Only the FIRST page is written as `cut.svg`. A multi-page export is a
 * print-modal concern — the run's own artifact is one file, and silently
 * concatenating pages into it would produce a document that overlays every
 * page on top of the first. Multi-page sheets are rare at print-shop sizes and
 * the count is reported, so this is a bounded simplification rather than a
 * hidden one.
 */
export async function buildCutFileBytes(
  runId: string,
  sheetId: string,
): Promise<Uint8Array | null> {
  try {
    const set = await buildCutFileForRun(runId, sheetId);

    if (set.refusedReason || set.pages.length === 0) {
      serverLogger.info("Sticker trace: no cut file produced", {
        runId,
        sheetId,
        reason: set.refusedReason ?? "no pages",
      });
      return null;
    }

    if (set.report.pageCount > 1) {
      serverLogger.info("Sticker trace: cut file holds page 1 of several", {
        runId,
        pageCount: set.report.pageCount,
      });
    }

    return new TextEncoder().encode(set.pages[0]!);
  } catch (err) {
    const n = normalizeError(err);
    /*
     * Swallowed into a null, and that is the designed behaviour rather than a
     * silenced error: the finalizer's own contract is that the exporter is
     * OPTIONAL and a run succeeds without one. Failing the whole run — whose
     * trace, parts and overlay are all correct and are what a human reviews —
     * over an optional export would be the worse trade. It is logged at warn
     * because an export that cannot be built IS worth looking at.
     */
    serverLogger.warn("Sticker trace: cut file build failed", {
      runId,
      sheetId,
      message: n.message,
    });
    return null;
  }
}
