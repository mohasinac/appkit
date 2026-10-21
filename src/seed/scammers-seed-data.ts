/*
 * WHY: Scammer-profile fixtures. Production has none, so this is empty.
 * WHAT: Empty. 🛑 Worth keeping empty rather than demo-filled: these rows
 * render on the PUBLIC /scams page, and a fictional profile naming a person
 * is the one piece of demo content with real defamation exposure.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
 *
 * EXPORTS:
 *   scammersSeedData — Array of Partial<ScammerDocument> for seed runner
 *
 * @tag domain:scams
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { ScammerDocument } from "../features/scams/schemas/firestore";
import { withScammerSearchTxt } from "./_helpers/search-txt-wrappers";
import type { FieldChange, StatusChangeEntry } from "../_internal/shared/history/types";

const NOW = new Date("2026-05-10T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/**
 * A timeline entry for the W18 `statusHistory` fixtures.
 *
 * 🛑 `actorUid` only. A scammer profile is built ENTIRELY out of identifying
 * details, which is why `SCAMMER_HISTORY_PII_FIELDS` is the longest scrub
 * list of any adopter — a fixture carrying a name here would be modelling the
 * exact leak the primitive exists to prevent.
 */
function entry(
  at: Date,
  actorRole: "system" | "admin",
  trigger: string,
  changes: Record<string, FieldChange>,
  extra?: { reason?: string; note?: string; actorUid?: string },
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

// Annotated HERE, not on the export, so the literal is contextually typed as
// Partial<ScammerDocument> before `.map` sees it. Without this TS infers a
// union of the individual object shapes and rejects the wrapper's generic —
// and the error points at the map call rather than at the field that actually
// diverged.
const scammerRows: Partial<ScammerDocument>[] = [];

// Derived through the wrapper, never per record — an inline literal is how
// five product seed files shipped their last fixture with no tokens.
export const scammersSeedData: Partial<ScammerDocument>[] =
  scammerRows.map(withScammerSearchTxt);
