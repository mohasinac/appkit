/*
 * WHY: An exploratory run produces vector geometry and ~20 KB review
 *      thumbnails — about 1 MB. Full-resolution parts and the print exports
 *      cost roughly 500 MB a sheet, which is the difference between ~52 sheets
 *      in 5 GB and about 8. So they are rendered ONCE, for the run the operator
 *      actually chose, and this is that moment.
 * WHAT: Accept a run as the sheet's current result, and fan out a full-
 *       resolution render of its parts.
 *
 * 🛑 `promoteRun` and `markPromoted` have existed since P4 with ZERO callers.
 * This is their first one. Anything that looked like it already worked —
 * `isPromoted` in the run list, `promotedPartCount` in the adapter — was
 * reading fields nothing has ever written.
 *
 * 🛑 TWO DIFFERENT THINGS ARE CALLED "PROMOTE" IN THIS FEATURE AND THEY MUST
 * NOT BE CONFLATED:
 *   - THIS one promotes a RUN onto its SHEET: the sheet now shows that run's
 *     parts, and full-res renders are produced.
 *   - Part Two's `promoteStickerSheetToListings` promotes a SHEET into
 *     marketplace PRODUCTS.
 * The second depends on the first, because `SheetPart.assetPath` does not
 * exist until a run has been promoted here.
 *
 * EXPORTS: PromoteRunInput, PromoteRunResult, promoteStickerTraceRun
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:api/admin/sticker-sheets
 * @tag sideEffects:firestore,rtdb
 */

import { ValidationError } from "../../../../errors/validation-error";
import { stickerSheetsRepository } from "../../../../features/sticker-trace/repository/sticker-sheets.repository";
import { stickerTraceRunsRepository } from "../../../../features/sticker-trace/repository/sticker-trace-runs.repository";
import { TraceRunStatusValues } from "../../../../features/sticker-trace/schemas/firestore";
import { serverLogger } from "../../../../monitoring";
import type { SheetPart } from "../../../../features/sticker-trace/schemas/firestore";
import { createShardTasks, planShards } from "./fanout";
import { emitProgress } from "./progress";
import { readRunGeometry } from "./storage";

/**
 * Promote fans out no wider than the trace did.
 *
 * A full-resolution part is a decode, a rasterise and a PNG encode at native
 * size, so the shard budget is the same 1 GiB / 300 s. More shards than
 * `maxInstances` (8) queue rather than run, and each one is a Firestore write
 * plus an invocation.
 */
const MAX_PROMOTE_SHARDS = 8;

export interface PromoteRunInput {
  sheetId: string;
  runId: string;
  promotedBy: string;
}

export interface PromoteRunResult {
  sheetId: string;
  runId: string;
  /** How many shards will render full-resolution parts. */
  shardCount: number;
  partCount: number;
}

/**
 * Accept a run and start the full-resolution render.
 *
 * 🛑 It refuses a run that did not SUCCEED. Promoting a failed or still-running
 * run would copy a partial `parts[]` onto the sheet and set `activeRunId` to
 * it — the sheet would then confidently show an incomplete result, with the
 * run's own status the only contradiction and nothing surfacing it.
 */
export async function promoteStickerTraceRun(
  input: PromoteRunInput,
): Promise<PromoteRunResult> {
  const [sheet, run] = await Promise.all([
    stickerSheetsRepository.findByIdOrFail(input.sheetId),
    stickerTraceRunsRepository.findByIdOrFail(input.runId),
  ]);

  /*
   * The run must belong to THIS sheet. Both ids are caller-supplied, so this is
   * the only place the pairing can be checked — without it, promoting run X of
   * sheet A onto sheet B would copy A's parts onto B and point B's
   * `activeRunId` at a run that is not its own.
   */
  if (run.sheetId !== input.sheetId) {
    throw new ValidationError("That run belongs to a different sheet.", {
      runId: "Run and sheet do not match.",
    });
  }

  if (run.status !== TraceRunStatusValues.SUCCEEDED) {
    throw new ValidationError(
      `Only a successful run can be promoted — this one is ${run.status}.`,
      { runId: "Re-run it, or promote a different attempt." },
    );
  }

  /*
   * 🛑 The parts come from `geometry.json`, NOT from the run document — the run
   * carries only `partCount`. That is deliberate: sixty Bézier outlines would
   * approach Firestore's 1 MiB document limit, which is why the geometry is an
   * artifact in the first place.
   */
  const geometry = await readRunGeometry(input.runId, input.sheetId);

  /*
   * Millimetres only when the scan's dpi can be trusted.
   *
   * The geometry is in WORKING raster pixels while `dpi` describes the
   * ORIGINAL, so the two are bridged by the downscale factor. Skipping that
   * bridge is the subtle version of the same error the commit panel nearly
   * shipped: every figure would be wrong by exactly the downscale ratio, and
   * every one of them would look plausible.
   */
  const workingToOriginal =
    sheet.widthPx > 0 && geometry.workingSize.width > 0
      ? sheet.widthPx / geometry.workingSize.width
      : null;
  const pxPerMm =
    sheet.dpi && sheet.dpi > 0 && workingToOriginal !== null
      ? (sheet.dpi / 25.4) / workingToOriginal
      : null;

  /*
   * 🛑 `groupIndex` is 0 for every part, because geometry.json does not carry a
   * per-part cluster assignment. On a single-sheet scan that is simply correct.
   * On a multi-sheet scan it is NOT, and it is warned about rather than quietly
   * written — a wrong group index renders every part under one tab, which looks
   * like a tidy result instead of a lost distinction.
   */
  if ((run.groupCount ?? 1) > 1) {
    serverLogger.warn("Promoting a multi-sheet run; parts carry groupIndex 0", {
      runId: input.runId,
      sheetId: input.sheetId,
      groupCount: run.groupCount,
    });
  }

  const parts: SheetPart[] = geometry.parts.map((g) => {
    const bboxMm = pxPerMm
      ? {
          x: g.bbox.x / pxPerMm,
          y: g.bbox.y / pxPerMm,
          width: g.bbox.width / pxPerMm,
          height: g.bbox.height / pxPerMm,
        }
      : null;
    return {
      ordinal: g.ordinal,
      // The schema's own default: the ordinal, renameable by an admin later.
      name: String(g.ordinal),
      groupIndex: 0,
      bboxPx: g.bbox,
      bboxMm,
      // Derived from the same measurement, so it is withheld on the same terms.
      areaMm2: bboxMm ? Math.round(bboxMm.width * bboxMm.height * 100) / 100 : null,
    };
  });

  if (parts.length === 0) {
    throw new ValidationError(
      "That run produced no parts, so there is nothing to promote.",
      { runId: "Tune the parameters and try another attempt." },
    );
  }

  /*
   * Sheet first, fan-out second.
   *
   * The sheet's `parts[]` and geometry are what every review surface reads, and
   * they are complete the moment the run succeeded — the fan-out only adds
   * full-resolution PNGs. Promoting the document first means an operator sees
   * the accepted result immediately, and a fan-out that fails leaves a sheet
   * that is correct but missing downloads, rather than a run marked accepted on
   * a sheet still showing the previous one.
   */
  await stickerSheetsRepository.promoteRun(input.sheetId, input.runId, {
    parts,
    groupCount: run.groupCount ?? 1,
    artifacts: run.artifacts ?? {},
  });

  const ordinals: number[] = parts.map((p) => p.ordinal);
  const shards = planShards(ordinals, MAX_PROMOTE_SHARDS);

  /*
   * 🛑 `mode: "full"` is what makes these DIFFERENT task documents from the
   * trace's. `shardTaskId` keys on the mode precisely so this does not `set()`
   * over `{runId}__part__{i}` — which would be an update, would not fire
   * `documentCreated`, and would leave the promote silently doing nothing.
   */
  const shardCount = await createShardTasks({
    runId: input.runId,
    sheetId: input.sheetId,
    mode: "full",
    shards,
  });

  /*
   * Best-effort, like every other progress write. The channel is the live bar;
   * the durable record is the run document, which `markPromoted` writes when
   * the finalizer completes. A failed ping must never fail a promotion that
   * has already written Firestore.
   */
  await emitProgress({
    runId: input.runId,
    stage: "parts",
    pct: 0,
    partsDone: 0,
    partsTotal: parts.length,
    shardsDone: 0,
    shardsTotal: shardCount,
    message: `Rendering ${parts.length} part(s) at full resolution`,
    level: "info",
  });

  return {
    sheetId: input.sheetId,
    runId: input.runId,
    shardCount,
    partCount: parts.length,
  };
}

/** Whether this run is already the sheet's accepted result. */
export async function isRunPromoted(
  sheetId: string,
  runId: string,
): Promise<boolean> {
  const sheet = await stickerSheetsRepository.findById(sheetId);
  return sheet?.activeRunId === runId;
}
