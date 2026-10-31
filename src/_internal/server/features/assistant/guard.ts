import { logServerWarning } from "../../../../monitoring";
import type { IAssistantModelProvider, PiiClass } from "../../../shared/features/assistant/types";
import { routeModel } from "./model-routing";

/**
 * Prompt-injection screening for buyer input.
 *
 * ## 🛑 This is DEFENCE IN DEPTH, not the protection
 *
 * Stating that plainly matters, because a classifier is the kind of control
 * people start trusting instead of the architecture. What actually stops an
 * injection stealing data here is structural and unchanged:
 *
 *   · tools are scoped to `ctx.userId` from the VERIFIED SESSION, and no
 *     tool takes a `userId` argument — so "fetch user X's orders" has
 *     nowhere to put X;
 *   · every tool output is an explicit allow-list literal, never a spread;
 *   · identifiers leave as per-turn single-use handles;
 *   · no `reveal*` accessor is reachable from the feature.
 *
 * So the realistic blast radius of an injection today is the buyer's own
 * thread saying something wrong — bad, not a breach. This layer exists for
 * the tools that have not been written yet, and to make the attempt visible
 * when it happens.
 *
 * ## 🛑 It FAILS OPEN, deliberately
 *
 * If the classifier errors, the turn proceeds. That is the opposite of
 * `budget.ts`, and the asymmetry is the point: the budget guards an
 * unbounded BILL, where "unknown" must mean stop. This guards a residual
 * risk the architecture already covers, so failing closed would take the
 * whole assistant down whenever a side-car model hiccups — trading a real
 * outage for a marginal gain. The failure is logged, never swallowed.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

/**
 * Measured separation is enormous (0.0007 benign vs 0.9995 injection), so
 * the threshold is not a fine judgement. 0.9 sits far from both clusters and
 * biases hard against FALSE POSITIVES: wrongly refusing a real customer is
 * a visible, immediate harm, while a missed injection still has to get past
 * everything in the docstring above.
 */
const DEFAULT_THRESHOLD = 0.9;

function threshold(): number {
  const raw = Number(process.env.ASSISTANT_GUARD_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DEFAULT_THRESHOLD;
}

export interface GuardVerdict {
  /** `true` when the input scored at or above the threshold. */
  flagged: boolean;
  /** `null` when the guard could not run — see the fail-open note. */
  score: number | null;
  /** Operator-facing. Never shown to a buyer. */
  detail: string;
}

export async function screenForInjection(
  providers: readonly IAssistantModelProvider[],
  text: string,
  piiClass: PiiClass,
): Promise<GuardVerdict> {
  const route = routeModel(providers, "guard", piiClass);
  if (!route.ok) {
    return { flagged: false, score: null, detail: `guard unavailable: ${route.refusal.reason}` };
  }

  /*
   * 🛑 The buyer's text is sent RAW, not redacted — the one place in this
   * feature that is correct.
   *
   * Redaction rewrites exactly the spans an injection hides in; screening a
   * scrubbed copy would mean classifying something the model never saw. The
   * privacy gate still holds because `routeModel` ran first: a training-tier
   * provider is refused anything but `piiClass: "none"`, so this can only
   * reach a no-train vendor.
   */
  const result = await route.decision.provider.turn({
    job: "guard",
    piiClass,
    messages: [{ role: "user", content: text }],
    maxOutputTokens: 8,
  });

  if (result.finishReason === "error" || result.finishReason === "filtered") {
    logServerWarning("[assistant] injection guard failed — proceeding (fail-open)", {
      detail: result.modelId,
    });
    return { flagged: false, score: null, detail: `guard errored: ${result.modelId}` };
  }

  /*
   * The model returns a bare probability string. A non-numeric reply means
   * the id no longer points at a classifier — treat as unavailable rather
   * than coercing NaN into a comparison, which would silently read as
   * "not flagged" forever.
   */
  const raw = result.text.trim();
  /*
   * 🛑 The empty check is SEPARATE and comes first, because `Number("")` is
   * **0**, not NaN — so a blank reply would pass `Number.isFinite` and be
   * recorded as a confident score of 0.0000, i.e. "the guard looked and this
   * is definitely safe". It fails open either way, so the security impact is
   * nil; the harm is that it FABRICATES a measurement, which is the one
   * thing a diagnostic must never do. Caught by a unit assertion, not by
   * reading the code.
   */
  if (raw.length === 0) {
    logServerWarning("[assistant] injection guard returned an empty response", {});
    return { flagged: false, score: null, detail: "guard returned nothing" };
  }

  const score = Number(raw);
  if (!Number.isFinite(score)) {
    logServerWarning("[assistant] injection guard returned a non-numeric score", {
      got: raw.slice(0, 40),
    });
    return { flagged: false, score: null, detail: `non-numeric guard output: ${raw.slice(0, 40)}` };
  }

  const limit = threshold();
  return {
    flagged: score >= limit,
    score,
    detail: `guard score ${score.toFixed(4)} (threshold ${limit})`,
  };
}
