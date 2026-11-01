/**
 * Composite-sentence cascade for STATIC, developer-authored copy
 * (`messages/en.json`) — the static-copy half of 1A-ii. A sentence that names
 * 2+ governed things inline (e.g. "Buy at a fixed price with secure
 * checkout, or reserve an upcoming release with a pre-order.") goes stale the
 * moment one of them is disabled. This resolver drops exactly the clause(s)
 * naming a disabled thing and re-joins the survivors with correct grammar —
 * never a dangling "or"/comma, never a double terminator.
 *
 * Distinct from `resolveFragmentedAnswer` (`../fragments.ts`, admin-authored
 * prose, simple paragraph concatenation) because a single compound SENTENCE
 * needs Oxford-comma-aware joining that paragraph-level admin content does
 * not — two resolvers over the SAME `ContentFragment`/`visibleFragments`
 * primitive, not two competing visibility mechanisms.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import {
  visibleFragments,
  type ContentFragment,
  type ContentFlagSnapshot,
} from "../fragments";
export type { ContentFlagSnapshot } from "../fragments";

export interface CompositeSentence {
  id: string;
  /** Always-rendered opening clause — no trailing punctuation. */
  lead: string;
  /** Optional clauses, each independently gated via `ContentFragment.governs`. */
  clauses: ContentFragment[];
  /** Default "or". */
  conjunction?: string;
  /** Default ", ". */
  leadSeparator?: string;
  /** Default ".". */
  terminator?: string;
}

/**
 * Oxford-comma-aware join of 1..N surviving clause texts.
 *   1 item:  "a"
 *   2 items: "a CONJ b"
 *   3+:      "a, b, CONJ c"
 */
function joinList(items: string[], conjunction: string): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}

/**
 * Resolves a `CompositeSentence` against the live flag snapshot. When every
 * optional clause is gone, collapses to just `${lead}${terminator}` — never a
 * dangling conjunction or comma.
 */
export function resolveCompositeSentence(
  sentence: CompositeSentence,
  settings: ContentFlagSnapshot | null | undefined,
): string {
  const terminator = sentence.terminator ?? ".";
  const survivors = visibleFragments(sentence.clauses, settings).map(
    (c) => c.text,
  );
  if (survivors.length === 0) return `${sentence.lead}${terminator}`;
  const leadSeparator = sentence.leadSeparator ?? ", ";
  const conjunction = sentence.conjunction ?? "or";
  return `${sentence.lead}${leadSeparator}${joinList(survivors, conjunction)}${terminator}`;
}
