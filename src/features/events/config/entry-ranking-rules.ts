/**
 * ENTRY RANKING RULE SETS — shipped default templates, not demo data.
 *
 * ## Why this lives under `features/`, not under `seed/`
 *
 * These rows are read at RUNTIME by `schemas/entry-ranking.ts`, which every
 * entry surface sorts with. They are therefore part of what the product
 * SHIPS — CLAUDE.md, "we ship the MECHANISM, the WIDGETS and the RULES, with
 * basic code and the DEFAULT TEMPLATES. The USER overrides them."
 *
 * 🛑 The published package deliberately EXCLUDES `dist/seed` (`package.json`
 * `files[]` carries `"!dist/seed"`), because the seed is thousands of rows of
 * demo content that no consumer should carry in a bundle. A runtime module
 * importing from there typechecks and builds locally — where a synced dist
 * still has `seed/` — and then fails to resolve for every consumer who
 * installs from the registry. That is exactly how 4.87.0 shipped unusable.
 *
 * So the rule is directional: **shipped config is the one definition, and the
 * seed re-exports FROM here.** `seed/rule-sets-seed-data.ts` keeps its public
 * export names by aliasing these, so there is one copy of the rows and the
 * seeder still writes the same config document.
 *
 * ## Nothing in here is the permitted set
 *
 * Owner, 2026-11-08: *"nothing in the code should be fixed"* and *"the types we
 * have now are the default TEMPLATES"* — anyone wanting a different kind of
 * contest writes their own row and is done. `rule` is an open key a generic
 * resolver interprets; `tieBreak` is published alongside it because a tie has
 * to be decided BEFORE a contest closes. Deciding it afterwards, however
 * fairly, looks like deciding it to suit someone.
 *
 * ⚠ Pure data. No imports, no module-scope side effects — so importing it
 * costs a consumer nothing but the bytes.
 *
 * @tag domain:events
 * @tag layer:config
 */

export interface EntryRankingRuleSet {
  id: string;
  label: string;
  /** Interpreted by `resolveEntryRanking`. A new key is a new case + a row. */
  rule: "most-likes" | "net-score" | "most-votes" | "earliest" | "manual" | string;
  tieBreak: "earliest-entry" | "latest-entry" | "manual" | string;
  /** Whether a dislike button renders at all for entries ranked this way. */
  allowsDislike: boolean;
  /** What the public rules copy should say, so artwork and mechanic agree. */
  publicWording: string;
}

/**
 * The five shipped rule-set rows.
 *
 * `publicWording` travels on the row with the rule it describes, so a gallery
 * cannot sort by likes under a heading that says net score.
 */
export const ENTRY_RANKING_RULE_SET_DEFINITIONS: EntryRankingRuleSet[] = [
  {
    id: "ranking-most-likes",
    label: "Most liked wins",
    rule: "most-likes",
    tieBreak: "earliest-entry",
    allowsDislike: false,
    publicWording: "The photo with the most likes wins.",
  },
  {
    id: "ranking-net-score",
    label: "Net score (likes minus dislikes)",
    rule: "net-score",
    tieBreak: "earliest-entry",
    allowsDislike: true,
    publicWording: "Entries are ranked by likes minus dislikes.",
  },
  {
    id: "ranking-most-votes",
    label: "Most votes of either kind",
    rule: "most-votes",
    tieBreak: "earliest-entry",
    allowsDislike: true,
    publicWording: "The entry with the most votes wins.",
  },
  {
    id: "ranking-earliest",
    label: "First come, first served",
    rule: "earliest",
    tieBreak: "earliest-entry",
    allowsDislike: false,
    publicWording: "The earliest eligible entry wins.",
  },
  {
    id: "ranking-jury",
    label: "Jury pick",
    rule: "manual",
    tieBreak: "manual",
    allowsDislike: false,
    publicWording: "A judging panel selects the winner.",
  },
];
