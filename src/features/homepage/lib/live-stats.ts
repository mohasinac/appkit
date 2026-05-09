/**
 * Live platform stats for the homepage stats section.
 *
 * Called server-side only inside MarketplaceHomepageView. Failures in any
 * individual metric are silently swallowed — the section falls back to the
 * static `value` from the Firestore section config.
 */

import type { LiveStatMetric } from "../schemas/firestore";
import {
  productRepository,
  storeRepository,
  userRepository,
  reviewRepository,
  orderRepository,
} from "../../../repositories";

export type LiveStatsMap = Partial<Record<LiveStatMetric, string>>;

/**
 * Fetch live stats for the requested metrics only.
 * Pass the exact metric keys needed so unused Firestore queries are skipped.
 */
export async function fetchLiveStats(
  metrics: LiveStatMetric[],
): Promise<LiveStatsMap> {
  if (metrics.length === 0) return {};

  const needed = new Set(metrics);
  const result: LiveStatsMap = {};
  const tasks: Promise<void>[] = [];

  if (needed.has("total_listings")) {
    tasks.push(
      productRepository
        .count()
        .then((n) => { result.total_listings = String(n); })
        .catch(() => {}),
    );
  }

  if (needed.has("verified_sellers")) {
    tasks.push(
      storeRepository
        .count()
        .then((n) => { result.verified_sellers = String(n); })
        .catch(() => {}),
    );
  }

  if (needed.has("total_buyers")) {
    tasks.push(
      userRepository
        .countByRole("user")
        .then((n) => { result.total_buyers = String(n); })
        .catch(() => {}),
    );
  }

  if (needed.has("total_orders")) {
    tasks.push(
      orderRepository
        .count()
        .then((n) => { result.total_orders = String(n); })
        .catch(() => {}),
    );
  }

  if (needed.has("total_reviews") || needed.has("platform_rating")) {
    tasks.push(
      reviewRepository
        .findAll()
        .then((res: any) => {
          const all: Array<{ rating: number; status?: string }> =
            Array.isArray(res) ? res : (res?.data ?? []);
          // Filter to approved reviews only for rating calculation
          const approved = all.filter((r) => !r.status || r.status === "approved");

          if (needed.has("total_reviews")) {
            result.total_reviews = String(approved.length);
          }

          if (needed.has("platform_rating") && approved.length > 0) {
            const avg =
              approved.reduce((sum, r) => sum + (r.rating ?? 0), 0) / approved.length;
            result.platform_rating = avg.toFixed(1) + "★";
          }
        })
        .catch(() => {}),
    );
  }

  await Promise.all(tasks);
  return result;
}
