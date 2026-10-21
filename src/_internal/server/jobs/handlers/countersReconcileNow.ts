import type { JsonValue } from "@mohasinac/appkit";
import { runCountersReconcile } from "../core/countersReconcile";
import type { CallableHandler, JobContext, JobLogger } from "../runtime/types";

/**
 * What an on-demand reconcile reports back to its caller.
 *
 * `degraded` is the point of this type. See the handler.
 */
export interface CountersReconcileNowResult {
  categoryRows: number;
  publishedProductsScanned: number;
  drifted: number;
  written: number;
  countsWritten: number;
  unknownCategory: number;
  storesProcessed: number;
  storeErrors: number;
  /**
   * `true` when drift was found and nothing was written — the signature of a
   * run that did no work while reporting completion. See the handler.
   */
  degraded: boolean;
  ranForMs: number;
}

type Meta = Record<string, JsonValue>;

const num = (m: Meta | undefined, k: string): number =>
  typeof m?.[k] === "number" ? (m[k] as number) : 0;

/**
 * Run the counters reconciliation on demand and RETURN what it did.
 *
 * ## Why this exists at all
 *
 * `countersReconcile` already runs daily at 03:00 UTC, and that is the right
 * cadence for drift that accumulates on its own. It is the wrong cadence for
 * drift you have just CAUSED: seeding a collection, purging demo data, or a
 * bulk import all leave the counters wrong immediately, and waiting until the
 * next night means the catalogue reads as empty until then.
 *
 * Measured 2026-10-21: a demo purge left all 17 stocked categories reading
 * `total=0` while their products were filed correctly — `category-beyblade-x`
 * stored 0 against an actual 14. Nothing errored, because a wrong count is
 * just a number; the only symptom is a human seeing an empty category.
 *
 * ## 🛑 Why it returns a summary instead of void
 *
 * The scheduled handler returns `void` and reports through logs, which is
 * fine for a cron nobody watches. An on-demand run has a caller waiting on an
 * answer, and the failure that matters here is SILENT: `runCountersReconcile`
 * catches its own category and store errors and still logs
 * "Counters reconciliation complete". Driving it standalone produced exactly
 * that — `processed: 0, errors: 1`, then "complete" — three times in a row
 * while writing nothing, because `ctx.db` was missing.
 *
 * So the one thing this must never do is answer 200-with-success for a run
 * that wrote nothing. `drifted > 0 && written === 0` is that signature, and
 * it is surfaced as `degraded` rather than buried in a log line. A caller
 * that sees `degraded: true` has been told the run failed even though it
 * completed.
 *
 * ## Why it wraps the logger rather than changing the core
 *
 * `runCountersReconcile` already emits its own counts as structured metadata
 * on two "reconciliation complete" lines. Reading those is enough, and leaves
 * the scheduled path byte-identical — one implementation, two entry points,
 * which is the shape the Functions registry is for. Changing the core's
 * signature to return a summary would mean the cron and the callable run
 * different code, and the whole reason this bug was findable is that they do
 * not.
 */
export const countersReconcileNowHandler: CallableHandler<
  void,
  CountersReconcileNowResult
> = async (_input, ctx: JobContext) => {
  const startedAt = Date.now();

  let categories: Meta | undefined;
  let stores: Meta | undefined;

  /*
   * A pass-through logger: everything still reaches the real one, so the
   * Function's logs are unchanged and this cannot swallow a message.
   */
  const capturing: JobLogger = {
    info: (msg: string, meta?: Meta) => {
      if (msg.includes("[categories] reconciliation complete")) categories = meta;
      if (msg.includes("[stores] reconciliation complete")) stores = meta;
      ctx.logger.info(msg, meta);
    },
    warn: (msg: string, meta?: Meta) => ctx.logger.warn(msg, meta),
    error: (msg: string, err?: unknown, meta?: Meta) =>
      ctx.logger.error(msg, err, meta),
  };

  await runCountersReconcile({ ...ctx, logger: capturing });

  const drifted = num(categories, "drifted");
  const written = num(categories, "written");

  const result: CountersReconcileNowResult = {
    categoryRows: num(categories, "categoryRows"),
    publishedProductsScanned: num(categories, "publishedProductsScanned"),
    drifted,
    written,
    countsWritten: num(categories, "countsWritten"),
    unknownCategory: num(categories, "unknownCategory"),
    storesProcessed: num(stores, "processed"),
    storeErrors: num(stores, "errors"),
    /*
     * 🛑 Also degraded when the category pass reported NOTHING. A missing
     * summary means `reconcileCategories` threw before its final log line --
     * which `runCountersReconcile` catches and continues past, so the run
     * still "completes" with zero evidence it did anything.
     */
    degraded: (drifted > 0 && written === 0) || categories === undefined,
    ranForMs: Date.now() - startedAt,
  };

  if (result.degraded) {
    ctx.logger.error(
      "[countersReconcileNow] completed but wrote nothing against observed drift — treat as FAILED",
      undefined,
      { ...result },
    );
  }

  return result;
};
