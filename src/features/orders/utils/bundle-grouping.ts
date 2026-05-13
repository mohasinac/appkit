/**
 * Order-item bundle grouping — S-SBUNI-5 2026-05-13.
 *
 * Orders carry bundle members as individual `OrderItem` rows (per S-SBUNI-4
 * schema) when the buyer's cart line was a bundle. The order-detail UI
 * collapses those rows back under a single "Bundle: <name>" header so the
 * checkout receipt mirrors the buyer's intent. This helper is the pure
 * grouping logic — the UI primitive lives next to the consumer view.
 *
 * Two flavours of "bundle row" can appear on an order:
 *   1. ONE order row whose `bundleCategorySlug` + `bundleProductIds[]` set
 *      describe the bundle (this is what S-SBUNI-4's checkout writes — the
 *      bundle stays a single row in the order with the locked
 *      bundlePriceInPaise as its line total).
 *   2. (Future) Expanded N rows, each tagged with the same
 *      `bundleCategorySlug`. The grouping handles this too in case a future
 *      session pivots to row expansion.
 *
 * Either way, `groupOrderItemsByBundle` returns a stable, ordered list of
 * "groups" so the renderer can iterate once.
 */

/** Minimal shape consumed from an order item (Firestore wire format). */
export interface OrderItemForBundleGrouping {
  /** Bundle discriminator — set when this row is part of a bundle. */
  bundleCategorySlug?: string;
  /** Snapshot of bundle members at order-creation time. */
  bundleProductIds?: string[];
}

export type BundleOrderGroup<T extends OrderItemForBundleGrouping> =
  | { kind: "single"; item: T; index: number }
  | {
      kind: "bundle";
      bundleCategorySlug: string;
      items: Array<{ item: T; index: number }>;
      /** Pulled from the first row in the group; reflects what checkout snapshotted. */
      memberCount: number;
    };

/**
 * Walk the items array preserving original order; collapse contiguous (or
 * non-contiguous) bundle rows sharing the same `bundleCategorySlug` into a
 * single group. Single rows pass through unchanged.
 */
export function groupOrderItemsByBundle<T extends OrderItemForBundleGrouping>(
  items: T[],
): Array<BundleOrderGroup<T>> {
  const groups: Array<BundleOrderGroup<T>> = [];
  const bundleIndexBySlug = new Map<string, number>();

  items.forEach((item, index) => {
    const slug = item.bundleCategorySlug;
    if (!slug) {
      groups.push({ kind: "single", item, index });
      return;
    }
    const existingIdx = bundleIndexBySlug.get(slug);
    if (existingIdx === undefined) {
      const memberCount = item.bundleProductIds?.length ?? 1;
      groups.push({
        kind: "bundle",
        bundleCategorySlug: slug,
        items: [{ item, index }],
        memberCount,
      });
      bundleIndexBySlug.set(slug, groups.length - 1);
      return;
    }
    const existing = groups[existingIdx];
    if (existing.kind === "bundle") {
      existing.items.push({ item, index });
    }
  });

  return groups;
}
