import { logServerWarning } from "../../../../monitoring";
import type { IAssistantModelProvider, PiiClass } from "../../../shared/features/assistant/types";
import { routeSecondOpinion, type RoutingDecision } from "./model-routing";
import { redact } from "./redaction";

/**
 * A4's second-opinion quorum, for money and policy answers.
 *
 * The guard against this project's worst failure mode: a *fabricated*
 * answer that reconciles perfectly. A refund window, a cancellation rule or
 * a fee that the model invents reads exactly like one it looked up.
 *
 * ## 🛑 What this check is and is not
 *
 * Cross-vendor is the real thing. On the owner's instruction (2026-10-31)
 * this runs same-vendor when no second vendor is registered, using a
 * different model LINEAGE (Qwen vs gpt-oss) rather than a smaller sibling.
 * That is a genuine reduction in correlated error, not an elimination of
 * it: one vendor means one serving stack and one set of operational
 * failure modes, so two agreeing answers are weaker evidence than two
 * agreeing vendors would be. The decision is recorded in the outcome so a
 * reader can tell which kind of check actually ran.
 *
 * ## 🛑 Disagreement DEMOTES, it never picks a winner
 *
 * The reviewer is not more trustworthy than the author — it is differently
 * wrong. Treating its verdict as authoritative would swap one unverified
 * answer for another. So agreement is the only thing that clears an answer;
 * anything else routes to a human.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

/** Topics where a wrong answer costs money or creates an obligation. */
const REVIEWABLE = [
  "refund",
  "return",
  "cancel",
  "charge",
  "fee",
  "warranty",
  "guarantee",
  "policy",
  "deposit",
  "payout",
  "tax",
  "gst",
  "dispute",
  "claim",
];

export interface QuorumOutcome {
  /** `true` only on explicit agreement. Anything else is false. */
  cleared: boolean;
  /** `false` when the topic did not warrant a review at all. */
  reviewed: boolean;
  /** `true` when the reviewer was the same vendor — a weaker check. */
  sameVendor: boolean;
  /** Operator-facing. Never shown to a buyer. */
  detail: string;
}

/** Cheap, deterministic topic gate — a model call per turn would double the
 * bill to decide whether to double the bill. */
export function needsSecondOpinion(question: string, answer: string): boolean {
  const haystack = `${question} ${answer}`.toLowerCase();
  return REVIEWABLE.some((t) => haystack.includes(t));
}

/**
 * Ask a second model whether `answer` is supported by `evidence`.
 *
 * `evidence` is the tool output the first model was given. The reviewer
 * judges SUPPORT, not plausibility — "does this follow from what was
 * retrieved", which is answerable, rather than "is this true", which would
 * just be a second guess.
 */
export async function seekSecondOpinion(params: {
  providers: readonly IAssistantModelProvider[];
  firstDecision: RoutingDecision;
  piiClass: PiiClass;
  question: string;
  answer: string;
  evidence: string;
  allowSameVendor: boolean;
}): Promise<QuorumOutcome> {
  const route = routeSecondOpinion(
    params.providers,
    params.firstDecision,
    params.piiClass,
    { allowSameVendor: params.allowSameVendor },
  );

  if (!route.ok) {
    /*
     * No reviewer available. NOT cleared — an unreviewed money answer is
     * exactly what the quorum exists to stop, so this falls through to the
     * human path rather than shipping unchecked.
     */
    return {
      cleared: false,
      reviewed: false,
      sameVendor: false,
      detail: `no reviewer available: ${route.refusal.reason}`,
    };
  }

  const sameVendor = route.decision.provider.id === params.firstDecision.provider.id;

  const prompt = [
    "You are checking another assistant's answer for a customer.",
    "Answer with exactly one word: SUPPORTED or UNSUPPORTED.",
    "Say SUPPORTED only if the answer follows from the evidence below.",
    "Say UNSUPPORTED if it states anything the evidence does not establish —",
    "a number, a time window, or a rule that is not there.",
    "",
    `QUESTION: ${params.question}`,
    `ANSWER: ${params.answer}`,
    `EVIDENCE: ${params.evidence || "(none was retrieved)"}`,
  ].join("\n");

  const result = await route.decision.provider.turn({
    job: "second-opinion",
    piiClass: params.piiClass,
    // Redacted: the reviewer is a second egress point and gets the same
    // treatment as the first, not a relaxed one.
    messages: [{ role: "user", content: redact(prompt) }],
    maxOutputTokens: 16,
  });

  if (result.finishReason === "error" || result.finishReason === "filtered") {
    return {
      cleared: false,
      reviewed: false,
      sameVendor,
      detail: `reviewer failed: ${result.modelId}`,
    };
  }

  const verdict = result.text.trim().toUpperCase();
  /*
   * 🛑 Must START with SUPPORTED, and "UNSUPPORTED" is checked first —
   * `"UNSUPPORTED".includes("SUPPORTED")` is true, so a naive `includes`
   * would read every rejection as approval. The most dangerous possible
   * off-by-one in this file.
   */
  const cleared = !verdict.startsWith("UNSUPPORTED") && verdict.startsWith("SUPPORTED");

  if (!cleared) {
    logServerWarning("[assistant] second opinion did not clear the answer", {
      verdict: verdict.slice(0, 40),
      sameVendor,
    });
  }

  return {
    cleared,
    reviewed: true,
    sameVendor,
    detail: `reviewer ${route.decision.modelId} said "${verdict.slice(0, 40)}"${
      sameVendor ? " (same vendor — weaker check)" : ""
    }`,
  };
}
