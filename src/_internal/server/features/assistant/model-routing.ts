import {
  type AssistantJob,
  type IAssistantModelProvider,
  type PiiClass,
} from "../../../shared/features/assistant/types";

/**
 * Pick a provider for a job — and refuse rather than downgrade.
 *
 * This is where the plan's PII rule is actually enforced:
 *
 *   > a request reaches a training-tier provider only if it carries a `nonPii`
 *   > assertion that only the redaction layer can set. **Default deny.**
 *
 * The compiler enforces half of it (`Redacted<string>` is unforgeable outside
 * `./redaction`); this function enforces the other half, because `piiClass` is
 * a runtime fact about the payload and a brand cannot describe "this provider
 * trains on what you send it".
 *
 * ## 🛑 Refusal is the feature. There is no fallback chain here.
 *
 * The obvious shape — "try Groq, fall back to Gemini" — is wrong in the one
 * case that matters. A fallback that fires when the preferred provider is
 * unavailable will eventually fire on a PII-bearing turn, and the fallback is
 * the training-tier vendor. That is a privacy incident produced by a
 * convenience feature, and it would look exactly like the system working.
 *
 * So: a job with no eligible provider returns `null` and the caller degrades
 * visibly (the plan's "I'll have someone get back to you" plus a
 * `supportTickets` row). Graceful degradation across a trust boundary is not
 * graceful.
 *
 * @tag domain:assistant
 * @tag layer:shared
 * @tag access:server
 * @tag sideEffects:none
 */

export interface RoutingDecision {
  provider: IAssistantModelProvider;
  modelId: string;
}

export interface RoutingRefusal {
  /** Operator-facing. Never rendered to a user verbatim. */
  reason: string;
  /** True when a provider existed but was refused on privacy grounds. */
  refusedOnPrivacy: boolean;
}

export type RoutingOutcome =
  | { ok: true; decision: RoutingDecision }
  | { ok: false; refusal: RoutingRefusal };

/**
 * Resolve a provider for `job` at `piiClass`, or refuse.
 *
 * `providers` is ordered by preference. The first eligible one wins; ineligible
 * ones are skipped with their reason accumulated, so a refusal can say *why*
 * every candidate was rejected rather than just "none available".
 */
export function routeModel(
  providers: readonly IAssistantModelProvider[],
  job: AssistantJob,
  piiClass: PiiClass,
): RoutingOutcome {
  if (providers.length === 0) {
    return refuse("no model providers registered", false);
  }

  const rejections: string[] = [];
  let anyRefusedOnPrivacy = false;

  for (const p of providers) {
    /*
     * 🛑 The privacy gate comes FIRST, before "can this provider do the job".
     *
     * Order matters for the reason string, not just tidiness: if the capability
     * check ran first, a training-tier provider that also lacked a model would
     * be reported as "no model configured", and the privacy refusal — the one
     * worth noticing — would never be recorded.
     */
    if (p.trainsOnInput && piiClass !== "none") {
      rejections.push(
        `${p.id}: trains on input, and this payload is "${piiClass}" (only "none" may reach it)`,
      );
      anyRefusedOnPrivacy = true;
      continue;
    }

    const modelId = p.modelFor(job);
    if (!modelId) {
      rejections.push(`${p.id}: no model configured for job "${job}"`);
      continue;
    }

    return { ok: true, decision: { provider: p, modelId } };
  }

  return refuse(
    `no eligible provider for job "${job}" at piiClass "${piiClass}" — ${rejections.join("; ")}`,
    anyRefusedOnPrivacy,
  );
}

/**
 * Resolve a provider for the second opinion that is a DIFFERENT vendor to
 * `firstDecision`.
 *
 * 🛑 Cross-vendor is the whole point and is enforced here rather than trusted
 * to configuration. The quorum exists to catch a fabricated finding that
 * reconciles perfectly; two calls to one vendor correlate their errors and
 * would agree with each other confidently. A same-vendor quorum is theatre, so
 * this refuses rather than returning the same provider twice.
 */
export function routeSecondOpinion(
  providers: readonly IAssistantModelProvider[],
  firstDecision: RoutingDecision,
  piiClass: PiiClass,
  opts: { allowSameVendor?: boolean } = {},
): RoutingOutcome {
  const others = providers.filter((p) => p.id !== firstDecision.provider.id);
  if (others.length > 0) {
    return routeModel(others, "second-opinion", piiClass);
  }

  /*
   * 🛑 Same-vendor fallback is OPT-IN, never automatic.
   *
   * A silent fallback here would be the exact shape `routeModel`'s "no
   * fallback chain" note refuses one layer up: a convenience that
   * downgrades a guarantee precisely when the guarantee is unavailable, and
   * that looks identical to the system working. The caller has to say it
   * wants the weaker check.
   */
  if (!opts.allowSameVendor) {
    return refuse(
      `a second opinion needs a provider other than "${firstDecision.provider.id}", and none is registered — ` +
        "refusing rather than asking the same vendor twice (pass allowSameVendor to accept the weaker check)",
      false,
    );
  }

  /*
   * Same provider, but `job: "second-opinion"` resolves to a DIFFERENT model
   * than `"answer"` did — see the Groq provider's MODELS map. If a provider
   * ever maps both jobs to the same id, this is not a second opinion at all,
   * so refuse rather than ask one model to mark its own work.
   */
  const outcome = routeModel(providers, "second-opinion", piiClass);
  if (outcome.ok && outcome.decision.modelId === firstDecision.modelId) {
    return refuse(
      `same-vendor second opinion resolved to the same model ("${firstDecision.modelId}") — ` +
        "a model cannot independently check its own answer",
      false,
    );
  }
  return outcome;
}

function refuse(reason: string, refusedOnPrivacy: boolean): RoutingOutcome {
  return { ok: false, refusal: { reason, refusedOnPrivacy } };
}
