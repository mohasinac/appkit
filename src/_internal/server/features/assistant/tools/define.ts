import type { z } from "zod";
import type { PiiClass } from "../../../../shared/features/assistant/types";
import type { HandleRegistry } from "../handles";

/**
 * A tool the assistant may call. One tool = one capability, one input
 * schema, one output projection — never a raw repository or document.
 *
 * ## 🛑 The output projection is MANDATORY, and that is the whole point
 *
 * `execute` always returns `TOutput`; there is no variant that returns a
 * repository document, and no `execute?: ...` that would let a tool exist
 * with no real behaviour yet. "Return the document and let the model figure
 * out what to show" is exactly the shape Part A's "masking by field list is
 * not masking by document" section warns about — `OrderDocument` alone
 * carries a flat, never-encrypted `shippingAddress` string nothing in
 * `ORDER_PII_FIELDS` protects.
 *
 * TypeScript cannot prove `TOutput` is an allow-list literal with no spread
 * of a source document — that is a review-time and audit-time property, the
 * same way `audit-public-projection-parity` already polices it for public API
 * projections elsewhere in this codebase. `scripts/audit-assistant-egress.mjs`
 * is the audit for THIS tree; see its header for what it checks mechanically.
 *
 * ## `piiClass` is honest about the SHAPE of a tool's output, not a promise
 *
 * It tells `turn.ts`'s router which providers may see this tool's result at
 * all (`routeModel` refuses a training-tier provider anything but `"none"`).
 * A tool that can return PII must declare `"redacted"` or `"handle-only"` —
 * never `"none"` — regardless of how rare a PII-bearing result actually is,
 * because the router decides once, for the whole conversation, before any
 * tool has run.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

export interface AssistantToolContext {
  /** Firestore uid of the authenticated end user this turn is answering. */
  userId: string;
  /** Resolved roles for `userId`, for the `roles` eligibility check below. */
  roles: readonly string[];
  /** This turn's handle minter — see `../handles.ts`. Tools that touch
   * anything PII-adjacent mint a handle instead of returning the raw value. */
  handles: HandleRegistry;
}

export interface AssistantToolDef<TInput = unknown, TOutput = unknown> {
  /** Stable, model-facing name — becomes the function-calling tool name. */
  name: string;
  /** Model-facing description. This is prompt content; write it for the model. */
  description: string;
  /** Validates the model's raw tool-call arguments before `execute` sees them. */
  inputSchema: z.ZodType<TInput>;
  /** Firestore-style permission string, same vocabulary as `ActionDef.permission`. */
  permission?: string;
  /** If set, the tool is eligible only when the caller holds one of these roles. */
  roles?: readonly string[];
  /** See the module docstring. Decides which providers may run this turn. */
  piiClass: PiiClass;
  /** Runs the tool. The return value IS the projection — see the module docstring. */
  execute: (input: TInput, ctx: AssistantToolContext) => Promise<TOutput>;
  /** Set to the shadowed tool's name to explicitly replace it in a registry
   * merge — same policy as `mergeFunctionRegistries`'s `options.overrides`. */
  overrides?: string;
}

/**
 * Identity helper — exists only to drive type inference on `TInput`/`TOutput`
 * at the call site, the same idiom as `defineFunction()` in
 * `appkit/src/_internal/server/functions/define.ts`.
 */
export function defineAssistantTool<TInput, TOutput>(
  def: AssistantToolDef<TInput, TOutput>,
): AssistantToolDef<TInput, TOutput> {
  return def;
}

/**
 * The type a HETEROGENEOUS collection of tools is stored as — a registry, a
 * merge result, a turn context's `tools` field. `AssistantToolDef<TInput,
 * TOutput>`'s `execute` is contravariant in `TInput`, so an array of tools
 * with genuinely different input shapes (`{query: string}` vs `{query,
 * category, brand}`, …) cannot unify under one concrete `AssistantToolDef<X,
 * Y>` — TypeScript correctly rejects it, the same way it would reject mixing
 * a `(s: string) => void` and a `(n: number) => void` in one array typed as
 * either. `any` here is the standard, deliberate escape for exactly this
 * shape (the same one tRPC routers and the Vercel AI SDK's tool registries
 * use) — every call site still gets full inference at its OWN definition via
 * `defineAssistantTool<TInput, TOutput>`; only the collection type erases it.
 */
export type AnyAssistantToolDef = AssistantToolDef<any, any>;
