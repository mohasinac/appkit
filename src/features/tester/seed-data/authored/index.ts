/*
 * WHY: One lookup of every authored case, keyed by full checklist id.
 * WHAT: `AUTHORED_CASES` — merged from the per-page modules in this directory.
 *
 * 🛑 GENERATED REGION. The import block and the spread list below are rewritten by
 * `node tester/scripts/merge-authored.mjs` every time a page is authored. Edit a
 * page's own module, never this file — a hand-added entry is overwritten on the
 * next merge, silently, and the case reverts to unauthored.
 *
 * This is a registry, not a convenience barrel (Root Cause #18): it composes a
 * data structure that no single module holds, and nothing imports a page module
 * through it to reach a symbol it could have imported directly.
 *
 * EXPORTS:
 *   AUTHORED_CASES — Record<checklistItemId, AuthoredCase>
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:registry
 * @tag access:server-only
 * @tag consumers:seed-data/tester-checklist-seed-data.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

/* GENERATED:IMPORTS:START */

/* GENERATED:IMPORTS:END */

export const AUTHORED_CASES: Record<string, AuthoredCase> = {
  /* GENERATED:SPREAD:START */

  /* GENERATED:SPREAD:END */
};
