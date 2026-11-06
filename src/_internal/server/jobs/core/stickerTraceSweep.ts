import type { JobContext } from "../runtime/types";
import { sweepStuckStickerTraceRuns } from "../../features/sticker-trace/sweep";
import { normalizeError } from "../../../../errors/normalize";

/**
 * Fail any sticker-trace run stuck in `queued`/`running` past 20 minutes.
 *
 * 🛑 The only mechanism that notices a run a crashed function left with no
 * terminal write — see `features/sticker-trace/sweep.ts`'s header for why
 * that gap exists even with every Cloud Function healthy and deployed.
 */
export async function runStickerTraceSweep(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting sticker-trace stuck-run sweep");

  let result;
  try {
    result = await sweepStuckStickerTraceRuns(ctx.now);
  } catch (err) {
    const normalized = normalizeError(err);
    ctx.logger.error("Sticker-trace stuck-run sweep failed", { message: normalized.message });
    throw err;
  }

  ctx.logger.info("Sticker-trace stuck-run sweep complete", {
    scanned: result.scanned,
    timedOut: result.timedOut,
  });
}
