/**
 * Entry ranking — turning the `entryRanking` CONFIG into an order on screen.
 *
 * ## What was wrong
 *
 * `resolveEntryRanking`, `entryTieBreak`, `allowsDislike`, `publicWording` and
 * the event type's `ruleSets.entryRanking` binding all existed and had **zero
 * readers** — the sixth instance of the declared-but-unwired class CLAUDE.md
 * tracks. The contest's published copy promised "entries are ranked by likes,
 * ties broken by whichever was submitted first", and nothing in the tree ever
 * computed that order or said it out loud.
 *
 * This file is the missing seam, and it is deliberately the ONLY one. Three
 * facts travel together or they drift:
 *
 *   - the RULE the sort applies,
 *   - whether a DISLIKE control exists at all,
 *   - the SENTENCE the page shows the public.
 *
 * They live on one rule-set row precisely so a gallery cannot sort by likes
 * under a heading that says net score.
 *
 * ## 🛑 The rows are CONFIG, and this module does not own them
 *
 * `entryRankingRuleSetsSeedData` is imported rather than restated. A second
 * copy of the five shipped rows here would be two divergent copies of the
 * platform's default templates, and the first edit to either would be
 * invisible to the other. The import is pure data — that module has no
 * imports and no module-scope side effects.
 *
 * ## 🛑 Nothing here throws
 *
 * An unknown rule-set ID, an unknown rule key, an unknown tie-break: each
 * degrades. Newer config against an older deploy must not take a public page
 * down (CLAUDE.md, "unknown values degrade, never throw"), and the degrade
 * direction is chosen per case below rather than once at the top.
 *
 * @tag domain:events
 * @tag layer:schema
 */

import {
  entryRankingRuleSetsSeedData,
  type EntryRankingRuleSet,
} from "../../../seed/rule-sets-seed-data";
import { eventTypesSeedData } from "../../../seed/event-types-seed-data";
import {
  DEFAULT_ENTRY_RANKING,
  entryTieBreak,
  resolveEntryRanking,
  type EntryRankingInput,
} from "./entry-votes";

export type { EntryRankingRuleSet };

/**
 * The platform's shipped rule-set rows, by id.
 *
 * DEFAULT TEMPLATES, not the permitted set — a deployment that wants a sixth
 * ranking adds a row and a `resolveEntryRanking` case. See CLAUDE.md, "we ship
 * the mechanism, the widgets and the rules, with the default templates".
 */
export const ENTRY_RANKING_RULE_SETS: ReadonlyMap<string, EntryRankingRuleSet> =
  new Map(entryRankingRuleSetsSeedData.map((r) => [r.id, r]));

/**
 * The platform default rule set — "the photo with the most likes wins".
 *
 * Matches {@link DEFAULT_ENTRY_RANKING}'s rule key, which is the invariant
 * that matters: the two defaults are the same decision expressed at two
 * levels, so they are asserted equal rather than written twice.
 */
export const DEFAULT_ENTRY_RANKING_RULE_SET_ID = "ranking-most-likes";

/**
 * The resolved default row, used whenever config says nothing at all.
 *
 * ⚠ Built defensively. If the seed row were ever renamed this falls back to a
 * synthesised row carrying {@link DEFAULT_ENTRY_RANKING} rather than
 * `undefined` — a missing default must not make every caller nullable.
 */
export const DEFAULT_ENTRY_RANKING_RULE_SET: EntryRankingRuleSet =
  ENTRY_RANKING_RULE_SETS.get(DEFAULT_ENTRY_RANKING_RULE_SET_ID) ?? {
    id: DEFAULT_ENTRY_RANKING_RULE_SET_ID,
    label: "Most liked wins",
    rule: DEFAULT_ENTRY_RANKING,
    tieBreak: "earliest-entry",
    allowsDislike: false,
    publicWording: "",
  };

/** The shape this module needs off an event document. Nothing else. */
export interface EntryRankingEventFields {
  /** The event's own rule-set id — the row-level override. */
  entryRanking?: string;
  /** The event type's slug, used to find the type-level default. */
  type?: string;
}

/**
 * What an event TYPE declares as its ranking default, if anything.
 *
 * 🛑 This is NOT `event.type === "contest"` branching. It is a lookup in the
 * event-type CONFIG table, which is where the choice lives: `contest` binds
 * `ruleSets.entryRanking: "ranking-most-likes"` as a seed field, and a type
 * that binds nothing contributes nothing. Adding a ranked type is a row.
 *
 * Matched on `key` first and `slug` second because a stored `type` value is
 * whichever of the two the authoring surface wrote; they are equal for every
 * shipped row, and checking both costs nothing.
 */
export function entryRankingRuleSetIdForEventType(
  type: string | undefined,
): string | undefined {
  if (!type) return undefined;
  const def = eventTypesSeedData.find((t) => t.key === type || t.slug === type);
  return def?.ruleSets?.entryRanking;
}

/**
 * The rule set that governs ONE event's entries.
 *
 * Precedence, most specific first — the same shape `resolveEntryApproval` uses:
 *
 *   1. `event.entryRanking`   — this event's own decision
 *   2. the event TYPE's `ruleSets.entryRanking` — the type default from config
 *   3. {@link DEFAULT_ENTRY_RANKING_RULE_SET} — the platform default
 *
 * 🛑 An unrecognised ID does NOT fall through to the platform default, and the
 * difference is the whole point. Silently substituting "most likes wins" for a
 * jury pick this build has never heard of would make the page STATE a rule the
 * organiser did not choose — and the published wording is the one thing a
 * contest cannot be wrong about. Instead the id is carried through as the rule
 * key, where `resolveEntryRanking`'s own `default:` branch ranks everything
 * equally and the tie-break orders it (earliest first), `allowsDislike` fails
 * closed to `false`, and `publicWording` is EMPTY so the page says nothing
 * rather than something false.
 */
export function resolveEntryRankingRuleSet(
  event: EntryRankingEventFields,
): EntryRankingRuleSet {
  const id =
    event.entryRanking ?? entryRankingRuleSetIdForEventType(event.type);
  if (!id) return DEFAULT_ENTRY_RANKING_RULE_SET;

  const known = ENTRY_RANKING_RULE_SETS.get(id);
  if (known) return known;

  return {
    id,
    label: id,
    rule: id,
    tieBreak: "earliest-entry",
    allowsDislike: false,
    publicWording: "",
  };
}

/**
 * Apply a rule set's declared tie-break to two entries.
 *
 * `entryTieBreak` implements the PUBLISHED one — earliest wins — and is used
 * directly for `earliest-entry`, for `manual` (a jury's scoreboard is
 * informational, so showing it in submission order is the honest resting
 * state) and for anything unrecognised. `latest-entry` is the same comparison
 * negated rather than a second implementation.
 */
export function compareEntryTieBreak(
  ruleSet: Pick<EntryRankingRuleSet, "tieBreak">,
  a: EntryRankingInput,
  b: EntryRankingInput,
): number {
  const base = entryTieBreak(a, b);
  return ruleSet.tieBreak === "latest-entry" ? -base : base;
}

/**
 * The comparator every entry surface sorts with — gallery, detail "rank #N",
 * scoreboard and any export.
 *
 * Descending on the rule's key (`resolveEntryRanking` returns a
 * higher-sorts-first number for every rule, so no per-rule direction flag is
 * needed), then the declared tie-break. Two screens disagreeing about who is
 * winning is the failure this prevents, and the only way to prevent it is for
 * both to call this.
 */
export function compareEntriesByRanking<T extends EntryRankingInput>(
  ruleSet: Pick<EntryRankingRuleSet, "rule" | "tieBreak">,
  a: T,
  b: T,
): number {
  const byRule =
    resolveEntryRanking(ruleSet.rule, b) - resolveEntryRanking(ruleSet.rule, a);
  if (byRule !== 0) return byRule;
  return compareEntryTieBreak(ruleSet, a, b);
}

/**
 * Rank a set of entries and stamp each with its 1-based position.
 *
 * ⚠ Returns a NEW array. Sorting the caller's array in place has twice
 * produced a surface that reordered itself on re-render in this codebase, and
 * a ranked gallery is exactly where that would be noticed.
 *
 * `rank` is the position AFTER the tie-break, so it is always a strict
 * sequence — two entries on equal likes get #1 and #2, ordered by the
 * published tie-break rather than sharing a number. That is what the contest
 * copy promises ("an early entry is never beaten by a later one on an equal
 * score"), and a shared rank would make the promise unverifiable on screen.
 */
export function rankEntries<T extends EntryRankingInput>(
  ruleSet: Pick<EntryRankingRuleSet, "rule" | "tieBreak">,
  entries: readonly T[],
): Array<T & { rank: number }> {
  return [...entries]
    .sort((a, b) => compareEntriesByRanking(ruleSet, a, b))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
