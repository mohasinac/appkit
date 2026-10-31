import { redactPii } from "../../../../security/pii-redact";
import type { Redacted } from "../../../shared/features/assistant/types";

/**
 * The ONLY place `Redacted<string>` is minted.
 *
 * `Redacted<T>` is a nominal brand with a private symbol, so it is assignable
 * from nothing — this module's `redact()` is the sole source. A provider that
 * trains on input accepts only `Redacted<string>`, which makes "send raw user
 * text to the training-tier vendor" a **compile error** rather than a rule
 * someone has to remember.
 *
 * ## 🛑 What this does NOT claim
 *
 * The brand is erased at runtime. A redacted string, a real name and
 * ciphertext are all `string` once compiled, so neither `tsc` nor a grep can
 * tell you which you are holding. This module buys you the *compiler*, not a
 * runtime guarantee — which is exactly why the plan ALSO requires an
 * adversarial payload grep in verification: log every outbound model payload in
 * dev and grep for known seed PII, with **zero hits** as the pass condition.
 *
 * Do not let the brand become the reason that check is skipped. The brand stops
 * the *careless* path; the grep is what catches a careful mistake.
 *
 * ## 🛑 Why it delegates rather than scrubbing here
 *
 * `security/pii-redact.ts` already owns `redactPii`, `maskIp`,
 * `safeDisplayName` and `safeDisplayEmail`, and it is the function the server
 * logger already runs over every log payload. A second scrubber would be a
 * second answer to "what counts as PII" — and the one that drifts is always the
 * one with fewer readers. Tier AK spent a commit deleting exactly that shape
 * (a hand-written `{brand}` resolver beside `resolvePublishedCopy`).
 *
 * So: if a pattern is missing, add it to `pii-redact.ts` where the logger gets
 * it too. Never widen it here.
 *
 * @tag domain:assistant
 * @tag layer:shared
 * @tag access:server
 * @tag sideEffects:none
 */

/**
 * Scrub a payload and brand it as fit for a training-tier provider.
 *
 * 🛑 The cast is the one place in the feature where a brand is asserted, and it
 * is deliberately ugly and deliberately alone. Every other module receives
 * `Redacted<string>` and cannot manufacture one.
 */
export function redact(text: string): Redacted<string> {
  return redactPii(text) as Redacted<string>;
}

/** `redact` over a conversation, preserving roles. */
export function redactMessages<
  T extends { role: string; content: string },
>(messages: readonly T[]): Array<Omit<T, "content"> & { content: Redacted<string> }> {
  return messages.map((m) => ({ ...m, content: redact(m.content) }));
}

/**
 * Assert a payload is public and therefore needs no redaction.
 *
 * 🛑 This is NOT a way to skip redaction, and the name is long on purpose so a
 * reader has to notice it. Use it only for text whose source is already a
 * public projection — an FAQ answer, a `toStoreListItem()` row, published copy
 * from `resolvePublishedCopy`.
 *
 * It returns a plain `string`, NOT a `Redacted<string>`: public text is routed
 * at `piiClass: "none"`, where the router lets any provider serve it, so it has
 * no need of the brand. Returning a brand here would let public text be passed
 * wherever redacted text is required and quietly widen what the brand means.
 */
export function assertAlreadyPublic(text: string): string {
  return text;
}
