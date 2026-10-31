import type { JsonObject } from "../../../../schemas/types";

/**
 * The assistant's model contract — one provider per vendor, chosen per job.
 *
 * Follows the NEWER appkit provider convention: an **abstract class**, as
 * `IPaymentProvider` / `IShippingProvider` / `ITaxProvider` are, so every
 * implementation extends one shared base and `tsc` enumerates what it owes.
 * (The older `IEmailProvider` / `IStorageProvider` are plain interfaces;
 * `PROVIDERS.md`'s blanket "contracts are abstract classes" is over-general and
 * describes the deliberate ones.)
 *
 * ## 🛑 Why the provider layer exists at all
 *
 * Measured 2026-10-29: **two of five** obvious free providers died within three
 * months — GitHub Models retired 2026-07-30, Cerebras dropped its free tier
 * 2026-07-16. A vendor-agnostic seam is not architectural taste here; it is the
 * observed failure rate.
 *
 * And it is a seam with a reader from day one (`audit-provider-registry-readers`
 * exists because Tier AK shipped six that had none): the router below picks
 * between providers per job, so the abstraction is load-bearing immediately.
 *
 * @tag domain:assistant
 * @tag layer:contract
 * @tag access:server
 */

/**
 * A text payload that has passed the redaction layer.
 *
 * ## 🛑 This brand is the ENTIRE PII mechanism, and it is nominal on purpose
 *
 * The rule from the plan is "a request reaches a training-tier provider only if
 * it carries a `nonPii` assertion that **only the redaction layer can set** —
 * default deny". A boolean flag cannot express that: any caller can pass
 * `true`, and the one that does will be the one in a hurry.
 *
 * So `Redacted<T>` is a **nominal brand** with a private declared symbol. It is
 * erased at runtime and assignable from nothing — the only way to obtain one is
 * `redact()` in `../redaction`, which is the single module that owns the
 * scrubbing. A provider whose `trainsOnInput` is true accepts `Redacted<string>`
 * and nothing else, so sending raw user text to it is a **compile error**, not a
 * policy someone has to remember.
 *
 * Same technique as `appkit/src/security/encrypted.ts`'s `Encrypted<T>`, and the
 * same caveat applies: it is erased at runtime, so ciphertext, a redacted
 * string and a real name are all `string` once compiled. The brand buys you the
 * compiler, not a runtime guarantee — which is why the plan ALSO requires an
 * adversarial payload grep in verification rather than trusting this alone.
 */
declare const REDACTED_BRAND: unique symbol;
export type Redacted<T extends string = string> = T & {
  readonly [REDACTED_BRAND]: "redacted";
};

/** What the model is being asked to do. Drives routing and the PII gate. */
export type AssistantJob =
  /** Classify intent, pick a tool, extract slots. Small and fast. */
  | "classify"
  /** Answer the user, with tool calling. The main turn. */
  | "answer"
  /** Second opinion on money/policy — must resolve to a DIFFERENT vendor. */
  | "second-opinion"
  /** Detect prompt injection in untrusted input. */
  | "guard";

/**
 * How sensitive the payload is. The router refuses a training-tier provider for
 * anything but `none`.
 */
export type PiiClass =
  /** Public catalogue/FAQ text. Safe for any provider. */
  | "none"
  /** Has been through `redact()`. Carries `Redacted<string>`. */
  | "redacted"
  /** Contains handles only, never raw identifiers. */
  | "handle-only";

export interface ToolSchema {
  name: string;
  description: string;
  /** JSON Schema for the arguments. Derived from the tool's Zod input schema. */
  parameters: JsonObject;
}

export interface ModelToolCall {
  /**
   * 🛑 The provider's OWN call id, echoed back verbatim on the matching
   * `role: "tool"` message.
   *
   * This field was missing until the first live tool round, and its absence
   * was not a cosmetic gap: a tool result must reference the exact id the
   * model issued, and the assistant turn that requested the tools must carry
   * its `tool_calls` alongside. Without both, the follow-up request is a
   * transcript the model cannot render — Groq fails it at the encoder with
   * `HarmonyError: Tools should have a name!`, which names neither the real
   * cause nor the field at fault.
   *
   * Substituting the tool NAME here compiles, looks plausible, and breaks
   * every multi-round turn.
   */
  id: string;
  name: string;
  /** Raw JSON string as the model emitted it — parse and VALIDATE, never trust. */
  argumentsJson: string;
}

export interface ModelTurnRequest {
  job: AssistantJob;
  piiClass: PiiClass;
  /**
   * The conversation so far.
   *
   * 🛑 `Redacted<string>` when `piiClass !== "none"`. See the brand above: this
   * is what makes an unredacted send fail to compile rather than fail in
   * production.
   */
  messages: ReadonlyArray<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | Redacted<string>;
    /** Set on `role: "tool"` — the `ModelToolCall.id` this result answers. */
    toolCallId?: string;
    /**
     * Set on `role: "assistant"` when that turn REQUESTED tools.
     *
     * 🛑 Required for a multi-round transcript to render at all: a
     * `role: "tool"` message is only meaningful after the assistant message
     * that asked for it, carrying the matching ids. Omitting these while
     * still sending the tool results is what produced Groq's
     * `HarmonyError: Tools should have a name!` on round two.
     */
    toolCalls?: readonly ModelToolCall[];
  }>;
  tools?: readonly ToolSchema[];
  maxOutputTokens?: number;
}

export interface ModelTurnResult {
  /** Prose for the user. Empty when the model chose to call a tool instead. */
  text: string;
  toolCalls: readonly ModelToolCall[];
  /**
   * Why the model stopped. `"tool_calls"` means act on `toolCalls`;
   * `"length"` means the answer was TRUNCATED and must not be presented as
   * complete.
   */
  finishReason: "stop" | "tool_calls" | "length" | "filtered" | "error";
  /** For the budget. Counts TOKENS, not calls — a 100k context is not one unit. */
  usage: { inputTokens: number; outputTokens: number };
  /** Which model actually served it, for the provenance record. */
  modelId: string;
}

export abstract class IAssistantModelProvider {
  /** Stable id, e.g. `"groq"`. */
  abstract readonly id: string;

  /**
   * 🛑 Does this vendor train on inputs by contract?
   *
   * Measured 2026-10-29: Gemini's free tier **does**; Groq's terms forbid
   * training on free *and* paid, retain nothing by default, and expose a
   * zero-retention toggle. India has no EEA/UK carve-out, so there is no
   * regional exemption to lean on.
   *
   * `true` here is what makes the router refuse anything but `piiClass: "none"`.
   * It is a property of the CONTRACT, not of a setting — do not make it
   * configurable, because a toggle that downgrades a privacy guarantee is a
   * toggle someone will flip to make an error go away.
   */
  abstract readonly trainsOnInput: boolean;

  /** Model ids this provider can serve, per job. Read from config, never hardcoded. */
  abstract modelFor(job: AssistantJob): string | undefined;

  abstract turn(request: ModelTurnRequest): Promise<ModelTurnResult>;
}
