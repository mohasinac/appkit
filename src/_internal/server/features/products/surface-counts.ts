/**
 * Read `surfaceCounts/global` — one document, for the public settings payload
 * and the server-side page guards.
 *
 * 🛑 FAILS OPEN, AND "OPEN" HERE MEANS `undefined`, NOT `{}`.
 *
 * Every failure path — missing document, unreadable document, malformed
 * payload — returns `undefined`, which `isListingSurfaceVisible` reads as
 * "unknown, show it". Returning an empty object instead would read as
 * "measured, everything is empty" and would 404 every browse page on the site
 * the first time Firestore hiccuped.
 *
 * This is the same failure posture as `guardBrowsePage`'s settings read ("a
 * Firestore blip must not 404 the catalogue") and `getLiveCategoryCounts`
 * ("a missing document is `undefined`, never 0").
 *
 * @tag domain:products
 * @tag layer:server-feature
 * @tag access:server-only
 * @tag sideEffects:firestore-read
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { getAdminDb } from "../../../../providers/db-firebase";
import {
  SURFACE_COUNTS_COLLECTION,
  SURFACE_COUNTS_DOC_ID,
} from "../../../../features/products/schemas/surface-counts";

export interface PublicSurfaceCounts {
  listingTypes?: Record<string, number>;
  surfaces?: Record<string, number>;
}

/** Keep only numeric entries — a malformed value must not read as a zero. */
function sanitize(input: unknown): Record<string, number> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function getSurfaceCounts(): Promise<PublicSurfaceCounts | undefined> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(SURFACE_COUNTS_COLLECTION)
      .doc(SURFACE_COUNTS_DOC_ID)
      .get();
    if (!snap.exists) return undefined;
    const data = snap.data() ?? {};
    const listingTypes = sanitize(data.listingTypes);
    const surfaces = sanitize(data.surfaces);
    // Both empty -> `undefined`, not `{}`. A document that exists but holds
    // nothing usable is not a measurement.
    if (!listingTypes && !surfaces) return undefined;
    return { listingTypes, surfaces };
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("surfaceCounts read failed — surfaces will all render visible");
    return undefined;
  }
}
