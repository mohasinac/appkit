/*
 * WHY: Personal-catalogue fixtures. Production has none, so this is empty.
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
 * EXPORTS: catalogueSeedData — Array of Partial<CatalogueItemDocument>
 */

import type { CatalogueItemDocument } from "../features/catalogue/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const catalogueSeedData: Partial<CatalogueItemDocument>[] = [];
