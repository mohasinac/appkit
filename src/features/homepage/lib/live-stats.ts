/**
 * Live platform stats for the homepage stats section.
 *
 * Called server-side only inside MarketplaceHomepageView. Failures in any
 * individual metric are silently swallowed — the section falls back to the
 * static `value` from the Firestore section config.
 */

import type { LiveStatPreset, CollectionQueryMetric } from "../schemas/firestore";
import { ALLOWED_LIVE_COLLECTIONS } from "../schemas/firestore";
import {
  productRepository,
  storeRepository,
  userRepository,
  reviewRepository,
  orderRepository,
} from "../../../repositories";
import { getAdminDb, getFirestoreCount } from "../../../providers/db-firebase";

export interface LiveStatRequest {
  /** The stat's unique key in StatsSectionConfig — used as the result map key. */
  key: string;
  source: "live" | "live-preset" | "live-collection";
  /** Set when source is "live" or "live-preset". */
  preset?: LiveStatPreset;
  /** Set when source is "live-collection". */
  collectionQuery?: CollectionQueryMetric;
}

/** Result map keyed by stat.key from StatsSectionConfig. Raw values, no suffix. */
export type LiveStatsMap = Record<string, string>;

/**
 * Fetch live stats for all requested metrics.
 * Preset metrics are deduped so each Firestore query runs at most once.
 * Collection-query metrics run their own queries; unknown collections are
 * blocked by the ALLOWED_LIVE_COLLECTIONS allowlist.
 * Returns raw count strings — suffix is applied by the caller (section-renderer).
 */
export async function fetchLiveStats(
  requests: LiveStatRequest[],
): Promise<LiveStatsMap> {
  if (requests.length === 0) return {};

  const result: LiveStatsMap = {};
  const tasks: Promise<void>[] = [];

  // --- Preset metrics (deduped) ------------------------------------------------
  const presetRequests = requests.filter(
    (r): r is LiveStatRequest & { preset: LiveStatPreset } =>
      (r.source === "live" || r.source === "live-preset") && r.preset !== undefined,
  );

  const resolvedPresets: Partial<Record<LiveStatPreset, string>> = {};
  const neededPresets = new Set(presetRequests.map((r) => r.preset));

  if (neededPresets.has("total_listings")) {
    tasks.push(
      productRepository.count()
        .then((n) => { resolvedPresets.total_listings = String(n); })
        .catch(console.error),
    );
  }
  if (neededPresets.has("verified_sellers")) {
    tasks.push(
      storeRepository.count()
        .then((n) => { resolvedPresets.verified_sellers = String(n); })
        .catch(console.error),
    );
  }
  if (neededPresets.has("total_buyers")) {
    tasks.push(
      userRepository.countByRole("user")
        .then((n) => { resolvedPresets.total_buyers = String(n); })
        .catch(console.error),
    );
  }
  if (neededPresets.has("total_orders")) {
    tasks.push(
      orderRepository.count()
        .then((n) => { resolvedPresets.total_orders = String(n); })
        .catch(console.error),
    );
  }
  if (neededPresets.has("total_reviews") || neededPresets.has("platform_rating")) {
    tasks.push(
      reviewRepository.findAll()
        .then((res: any) => {
          const all: Array<{ rating: number; status?: string }> =
            Array.isArray(res) ? res : (res?.data ?? []);
          const approved = all.filter((r) => !r.status || r.status === "approved");
          if (neededPresets.has("total_reviews")) {
            resolvedPresets.total_reviews = String(approved.length);
          }
          if (neededPresets.has("platform_rating") && approved.length > 0) {
            const avg = approved.reduce((sum, r) => sum + (r.rating ?? 0), 0) / approved.length;
            resolvedPresets.platform_rating = avg.toFixed(1) + "★";
          }
        })
        .catch(console.error),
    );
  }

  // --- Collection-query metrics ------------------------------------------------
  const queryRequests = requests.filter(
    (r): r is LiveStatRequest & { collectionQuery: CollectionQueryMetric } =>
      r.source === "live-collection" && r.collectionQuery !== undefined,
  );

  for (const req of queryRequests) {
    const { key, collectionQuery } = req;
    const { collection, filterField, filterValue } = collectionQuery;

    if (!(ALLOWED_LIVE_COLLECTIONS as readonly string[]).includes(collection)) {
      continue; // silently skip non-allowlisted collections
    }

    tasks.push(
      (async () => {
        try {
          const db = getAdminDb();
          const ref = db.collection(collection);
          const query =
            filterField !== undefined && filterValue !== undefined
              ? ref.where(filterField, "==", filterValue)
              : ref;
          const count = await getFirestoreCount(query);
          result[key] = String(count);
        } catch {
          // silently fall back to static value
        }
      })(),
    );
  }

  await Promise.all(tasks);

  // Map resolved preset values back to each requesting stat's key
  for (const req of presetRequests) {
    const value = resolvedPresets[req.preset];
    if (value !== undefined) result[req.key] = value;
  }

  return result;
}
