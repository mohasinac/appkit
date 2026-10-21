/*
 * WHY: Theme-group fixtures (the horizontal "you might also like" scroller).
 * Production has none, so this is empty.
 * WHAT: Empty. The export is kept so the loader's import resolves.
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
 *   groupedListingsSeedData — Array of GroupedListingDocument for seed runner
 *
 * @tag domain:products,grouped
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { GroupedListingDocument } from "../features/grouped/schemas/firestore";

export const groupedListingsSeedData: Partial<GroupedListingDocument>[] = [];
