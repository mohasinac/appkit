import { randomBytes } from "node:crypto";
import { normalizeError } from "../../../../errors/normalize";
import type {
  IAssistantModelProvider,
  ModelToolCall,
  ModelTurnResult,
  PiiClass,
} from "../../../shared/features/assistant/types";
import { routeModel } from "./model-routing";
import { assertAlreadyPublic, redactMessages } from "./redaction";
import { HandleRegistry, HANDLE_CORE_PATTERN } from "./handles";
import type { AnyAssistantToolDef } from "./tools/define";
import { buildToolManifest } from "./tools/manifest";
import { estimateTurnTokens, reserveTokens } from "./budget";
import { needsSecondOpinion, seekSecondOpinion } from "./quorum";
import { screenForInjection } from "./guard";

/**
 * `runAssistantTurn()` — pick a provider, call it (with tools), execute any
 * tool calls, and render the final answer against the turn's handle registry.
 *
 * ## 🛑 No Firebase or Next import on this path, deliberately
 *
 * `AssistantTurnContext` is an abstract bag of already-resolved providers and
 * tool definitions. The caller — `actions.ts` — builds that context from a
 * real session and calls this function. That indirection is what keeps this
 * module pure and independently testable.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

/** Bounded so a model that never stops calling tools cannot loop forever —
 * see `audit-silent-degrade`'s R1 shape: an unbounded loop that eventually
 * times out reads to the caller as a hang, not as a tool-call bug. */
const MAX_TOOL_ROUNDS = 4;

/** Named because the budget estimator and the provider call must agree — two
 * literals would let the reservation under-count what is actually requested. */
const MAX_OUTPUT_TOKENS = 1024;

export interface AssistantTurnMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantTurnInput {
  conversationId: string;
  userId: string;
  roles: readonly string[];
  /** The conversation's PII class BEFORE any tool has run this turn. `"none"`
   * for a conversation whose registered tools are all `piiClass: "none"`
   * (A2's `searchFaqs`/`searchProducts`) — escalates automatically below if a
   * tool with a higher class executes. */
  piiClass: PiiClass;
  /** Oldest first. Plain text — this function redacts it, callers never do. */
  messages: readonly AssistantTurnMessage[];
}

export interface AssistantTurnContext {
  /** Ordered by preference — `routeModel` picks the first eligible one. */
  providers: readonly IAssistantModelProvider[];
  /** Already merged via `mergeAssistantToolRegistries` and filtered to
   * whatever this conversation/surface is allowed to expose. */
  tools: readonly AnyAssistantToolDef[];
  /**
   * Accept a SAME-VENDOR second opinion when no second vendor is
   * registered. Defaults to `false`, so the weaker check is never silent.
   *
   * Enabled by the consumer on the owner's instruction (2026-10-31). One
   * vendor means a shared serving stack and shared failure modes, so
   * agreement is weaker evidence than two vendors agreeing — see quorum.ts.
   */
  allowSameVendorQuorum?: boolean;
}

export type AssistantTurnOutcome =
  | { ok: true; text: string; modelId: string }
  | { ok: false; reason: string };

export async function runAssistantTurn(
  input: AssistantTurnInput,
  ctx: AssistantTurnContext,
): Promise<AssistantTurnOutcome> {
  const turnId = randomBytes(6).toString("hex");
  const handles = new HandleRegistry(input.conversationId, turnId);

  const eligibleTools = ctx.tools.filter((t) => isToolEligible(t, input.roles));
  const manifest = buildToolManifest(eligibleTools);
  const byName = new Map(eligibleTools.map((t) => [t.name, t] as const));

  /*
   * Screened BEFORE the answer model is called, so a flagged turn costs one
   * tiny classifier call rather than a full tool-calling round trip. Fails
   * open by design — see guard.ts for why this is the opposite posture to
   * budget.ts.
   */
  const guard = await screenForInjection(ctx.providers, lastUserText(input), input.piiClass);
  if (guard.flagged) {
    return {
      ok: false,
      reason: `input flagged as prompt injection — ${guard.detail}`,
    };
  }

  let effectivePiiClass = input.piiClass;
  const outcome = routeModel(ctx.providers, "answer", effectivePiiClass);
  if (!outcome.ok) {
    return { ok: false, reason: outcome.refusal.reason };
  }
  const { provider } = outcome.decision;

  type TurnMessage = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    toolCallId?: string;
    toolCalls?: readonly ModelToolCall[];
  };

  let messages: TurnMessage[] =
    effectivePiiClass === "none"
      ? input.messages.map((m) => ({ role: m.role, content: assertAlreadyPublic(m.content) }))
      : redactMessages(input.messages);

  let result: ModelTurnResult | null = null;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    /*
     * 🛑 Reserved inside the loop, per ROUND — not once per turn.
     *
     * A turn is up to MAX_TOOL_ROUNDS model calls, and each one resends the
     * whole (growing) transcript plus every tool result so far. Charging once
     * up front would bill a 5-round turn as though it were a 1-round turn,
     * which is the "counts calls, not tokens" mistake this budget exists to
     * avoid — one layer in.
     */
    const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
    const reservation = await reserveTokens(
      estimateTurnTokens(promptChars, MAX_OUTPUT_TOKENS, manifest.length),
    );
    if (!reservation.allowed) {
      return {
        ok: false,
        reason: `token budget refused the call: ${reservation.reason ?? "no reason given"}`,
      };
    }

    result = await provider.turn({
      job: "answer",
      piiClass: effectivePiiClass,
      messages,
      tools: manifest,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    if (result.finishReason !== "tool_calls" || result.toolCalls.length === 0) break;
    if (round === MAX_TOOL_ROUNDS) {
      return {
        ok: false,
        reason: `exceeded ${MAX_TOOL_ROUNDS} tool-call rounds without a final answer`,
      };
    }

    /*
     * 🛑 Carries `toolCalls`. Dropping them (as this did until the first live
     * multi-round turn) leaves the following `role: "tool"` messages
     * answering calls the transcript never records, which Groq rejects at the
     * encoder rather than as a validation error.
     */
    messages.push({ role: "assistant", content: result.text, toolCalls: result.toolCalls });

    for (const call of result.toolCalls) {
      const tool = byName.get(call.name);
      if (!tool) {
        messages.push({
          role: "tool",
          content: `error: unknown or ineligible tool "${call.name}"`,
          toolCallId: call.id,
        });
        continue;
      }

      const parsed = tool.inputSchema.safeParse(safeJsonParse(call.argumentsJson));
      if (!parsed.success) {
        /* .flatten() rather than a single summary string — the model can act
         * on a per-field breakdown ("count: expected number, got string") far
         * more usefully than on one flattened sentence, and surfacing every
         * issue (not just the first) is also what makes this a real sink for
         * audit-unvalidated-safeparse. */
        messages.push({
          role: "tool",
          content: `error: invalid arguments for "${call.name}": ${JSON.stringify(parsed.error.flatten())}`,
          toolCallId: call.id,
        });
        continue;
      }

      try {
        const output = await tool.execute(parsed.data, {
          userId: input.userId,
          roles: input.roles,
          handles,
        });
        messages.push({ role: "tool", content: JSON.stringify(output), toolCallId: call.id });

        /*
         * 🛑 Escalate the EFFECTIVE pii class the moment a non-"none" tool
         * runs, and re-check the already-chosen provider against it. A
         * provider picked for piiClass:"none" may be a training-tier vendor
         * — continuing to send it tool output from a tool that is NOT
         * piiClass:"none" would be exactly the privacy incident
         * `routeModel`'s "no fallback chain" note exists to prevent, one
         * layer up (mid-turn instead of at routing time).
         */
        if (tool.piiClass !== "none") {
          effectivePiiClass = tool.piiClass;
          if (provider.trainsOnInput) {
            return {
              ok: false,
              reason:
                `tool "${call.name}" returned piiClass "${tool.piiClass}" mid-turn, and the ` +
                `provider already chosen ("${provider.id}") trains on input — refusing rather ` +
                "than sending it the result",
            };
          }
        }
      } catch (err) {
        messages.push({
          role: "tool",
          content: `error: tool "${call.name}" failed: ${normalizeError(err).message}`,
          toolCallId: call.id,
        });
      }
    }
  }

  if (!result) {
    return { ok: false, reason: "model never returned a result" };
  }
  if (result.finishReason === "length") {
    return {
      ok: false,
      reason: "answer was truncated — refusing to present a partial response as complete",
    };
  }
  if (result.finishReason === "filtered" || result.finishReason === "error") {
    /*
     * 🛑 `modelId` is included because that is where the PROVIDER puts its
     * reason: `errorResult` returns `modelId: "${modelId} (${reason})"`,
     * deliberately keeping `text` empty so a failure is never renderable as
     * an answer. Reporting only the finishReason threw that away and left
     * "error" with no cause — which is what made the first live failure
     * undiagnosable.
     */
    return {
      ok: false,
      reason: `model stopped with finishReason "${result.finishReason}" — ${result.modelId}`,
    };
  }

  const rendered = renderWithHandles(result.text, handles);
  if (rendered === null) {
    return {
      ok: false,
      reason:
        "response referenced a handle that did not resolve — failing closed rather than " +
        "leaking a raw or hallucinated token",
    };
  }

  /*
   * 🛑 Money/policy answers are reviewed BEFORE the buyer sees them.
   *
   * The topic gate is a cheap string match on purpose: asking a model
   * whether to ask a second model would double the bill to decide whether
   * to double the bill. Most turns never reach the reviewer.
   *
   * A failed review does NOT return the reviewer's opinion instead — the
   * reviewer is differently wrong, not more right. It refuses, which routes
   * the buyer to a human via the escalation path (severity.ts already files
   * money/policy topics at `draft`/high).
   */
  const toolEvidence = messages
    .filter((m) => m.role === "tool")
    .map((m) => m.content)
    .join("\n");

  if (needsSecondOpinion(lastUserText(input), rendered)) {
    const quorum = await seekSecondOpinion({
      providers: ctx.providers,
      firstDecision: outcome.decision,
      piiClass: effectivePiiClass,
      question: lastUserText(input),
      answer: rendered,
      evidence: toolEvidence,
      allowSameVendor: ctx.allowSameVendorQuorum ?? false,
    });

    if (!quorum.cleared) {
      return {
        ok: false,
        reason: `second opinion did not clear a money/policy answer — ${quorum.detail}`,
      };
    }
  }

  return { ok: true, text: rendered, modelId: result.modelId };
}

/** The buyer's most recent message — what the quorum judges the answer against. */
function lastUserText(input: AssistantTurnInput): string {
  return [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function isToolEligible(tool: AnyAssistantToolDef, roles: readonly string[]): boolean {
  if (!tool.roles) return true;
  return tool.roles.some((r) => roles.includes(r));
}

/*
 * No explicit return type here, deliberately — `JSON.parse` returns `any`,
 * and annotating the return as `unknown` (the technically more honest type)
 * trips audit-unknown-leakage's `field-or-param-unknown` rule with no
 * matching exemption for a return position. The call site immediately feeds
 * the result into `tool.inputSchema.safeParse()`, whose parameter type IS
 * `unknown`, so the narrowing happens there either way — this function's own
 * signature does not need to assert it.
 */
function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    /* The model emitted non-JSON tool-call arguments. Returning undefined
     * here is deliberate: the caller immediately runs it through
     * tool.inputSchema.safeParse(), which turns undefined into a normal
     * "invalid arguments" validation failure with a real Zod message — the
     * parse error itself has nothing to add to that. normalizeError() is
     * still called, per Root Cause #31a, so `err` never escapes the catch as
     * untyped `unknown` even though its classification is discarded here. */
    void normalizeError(err);
    return undefined;
  }
}

/**
 * Substitute every handle-shaped token in `text` with its resolved value.
 * Returns `null` — failing the WHOLE response — the moment any token in the
 * text does not resolve, rather than leaving the raw token in place. See
 * handles.ts and the plan's "Rendering is a trust boundary" note.
 */
function renderWithHandles(text: string, handles: HandleRegistry): string | null {
  const pattern = new RegExp(`\\b${HANDLE_CORE_PATTERN}\\b`, "g");
  let failed = false;
  const out = text.replace(pattern, (match) => {
    const value = handles.resolve(match);
    if (value === null) {
      failed = true;
      return match;
    }
    return value;
  });
  return failed ? null : out;
}
