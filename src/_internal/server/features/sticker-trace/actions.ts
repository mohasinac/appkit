/*
 * WHY: A trace is started once and retried several times, and the retries are
 *      the point — tuning a halftone scan takes a few goes. Every attempt has
 *      to be a record you can come back to, which means a retry creates a new
 *      run and never edits the old one.
 * WHAT: Start, and retry-with-resume.
 *
 * 🛑 Returns a PLAIN object, not an `ActionResult` envelope — mirroring
 * `enqueueJob`, which these are modelled on. That is deliberate rather than
 * casual: an envelope spread as if it were the payload is Root Cause #98,
 * where `{ ok, data }` reached nine edit pages as `initialValues`, every field
 * resolved `undefined`, and pressing Save wrote `draft` over live listings.
 * These throw on failure; the route's `createRouteHandler` maps that.
 *
 * EXPORTS: StartTraceRunInput, RetryTraceRunInput, TraceRunHandle,
 *   startStickerTraceRun, retryStickerTraceRun
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
import { paramsForTier } from "../../../shared/features/sticker-trace/config";
import {
  explainResume,
  resolveResumeStage,
  type ResumeDecision,
} from "../../../shared/features/sticker-trace/resume";
import type {
  PrecisionTier,
  TraceParams,
  TraceStage,
} from "../../../shared/features/sticker-trace/types";
import { emitProgress, mintStickerTraceToken } from "./progress";

/** What a caller needs to watch a run it just started. */
export interface TraceRunHandle {
  runId: string;
  /** Carries the single `stickerTraceRunId` claim for this run's channel. */
  customToken: string;
}

export interface StartTraceRunInput {
  sheetId: string;
  /** 🛑 Mandatory, and validated here rather than trusted. */
  name: string;
  tier: PrecisionTier;
  requestedBy: string;
  /** Advanced-panel overrides on top of the tier's defaults. */
  paramOverrides?: Partial<TraceParams>;
}

/**
 * A name is required to process, and this is where that is enforced.
 *
 * Trimmed before the length check, so "   " is rejected rather than stored as
 * a run nobody can tell apart from the next one — which is the whole reason
 * the field is mandatory.
 */
function requireName(raw: string): string {
  const name = (raw ?? "").trim();
  if (name.length === 0) {
    throw new ValidationError("Give this run a name so you can tell it apart later.", {
      name: "A name is required.",
    });
  }
  return name;
}

async function createRun(input: {
  sheetId: string;
  name: string;
  tier: PrecisionTier;
  params: TraceParams;
  requestedBy: string;
}): Promise<TraceRunHandle> {
  const run = await stickerTraceRunsRepository.create(input);

  /*
   * Seed the channel BEFORE returning the token, so a client that subscribes
   * immediately finds a node rather than an absence it cannot distinguish from
   * a run that never started. `emitProgress` never throws, so a failure here
   * costs the live bar and not the run.
   */
  await emitProgress({ runId: run.id, stage: "queued", pct: 0, prior: run });

  return { runId: run.id, customToken: await mintStickerTraceToken(run.id) };
}

/**
 * Start the first trace of a sheet.
 *
 * The sheet is read to confirm it exists before a run is written against it —
 * a run whose `sheetId` points at nothing is an orphan that every list query
 * returns and no page can open.
 */
export async function startStickerTraceRun(
  input: StartTraceRunInput,
): Promise<TraceRunHandle> {
  const name = requireName(input.name);
  await stickerSheetsRepository.findByIdOrFail(input.sheetId);

  /*
   * Tier defaults FIRST, overrides second. The run records the parameters it
   * actually used, which is what makes the resume clamp meaningful — a run
   * storing a tier name and resolving defaults later could not tell whether
   * its artifacts predated a default changing.
   */
  const params: TraceParams = {
    ...paramsForTier(input.tier),
    ...(input.paramOverrides ?? {}),
  };

  const handle = await createRun({
    sheetId: input.sheetId,
    name,
    tier: input.tier,
    params,
    requestedBy: input.requestedBy,
  });

  await stickerSheetsRepository.update(input.sheetId, {
    traceStatus: TraceRunStatusValues.QUEUED,
  });

  return handle;
}

export interface RetryTraceRunInput {
  sheetId: string;
  /** The run being retried. Read for its params; never modified. */
  sourceRunId: string;
  name: string;
  tier: PrecisionTier;
  requestedBy: string;
  paramOverrides?: Partial<TraceParams>;
  /** Where the operator asked to resume from. Clamped, never silently. */
  requestedResumeStage?: TraceStage;
}

export interface RetryTraceRunResult extends TraceRunHandle {
  resume: ResumeDecision;
  /** The sentence the retry panel shows. Empty when nothing was clamped. */
  notice: string;
}

/**
 * Retry a run.
 *
 * 🛑 A retry is a NEW named run. Editing the old one would destroy the only
 * thing attempt history is for — being able to compare "standard vs precise on
 * the same sheet" weeks later, and to see that run 2 died at `ridge`.
 *
 * 🛑 Resuming requires the source run's artifacts to still EXIST. Retention
 * may have stripped them, and a resume from `parts` against a run whose
 * geometry is gone would read every missing artifact as an empty result — a
 * successful-looking run with no parts. `artifactsPruned` is checked and the
 * resume point is forced back to the start rather than failing, because
 * restarting is what the operator wants and being told why is what they need.
 */
export async function retryStickerTraceRun(
  input: RetryTraceRunInput,
): Promise<RetryTraceRunResult> {
  const name = requireName(input.name);
  const source = await stickerTraceRunsRepository.findByIdOrFail(input.sourceRunId);

  if (source.sheetId !== input.sheetId) {
    throw new ValidationError("That run belongs to a different sheet.", {
      sourceRunId: "Run and sheet do not match.",
    });
  }

  const params: TraceParams = {
    ...paramsForTier(input.tier),
    ...(input.paramOverrides ?? {}),
  };

  const requested = input.requestedResumeStage ?? "decode";
  let resume = resolveResumeStage(requested, source.params, params);
  let notice = explainResume(resume);

  if (source.artifactsPruned && resume.stage !== "decode") {
    resume = { stage: "decode", clamped: true, requested, forcedBy: resume.forcedBy };
    notice =
      "This run's intermediate files were cleared, so there is nothing to resume " +
      "from — the retry starts from the beginning.";
  }

  const handle = await createRun({
    sheetId: input.sheetId,
    name,
    tier: input.tier,
    params,
    requestedBy: input.requestedBy,
  });

  return { ...handle, resume, notice };
}
