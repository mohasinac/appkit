/**
 * Order-item bundle grouping — S-SBUNI-5 2026-05-13.
 *
 * Orders carry bundle members as individual `OrderItem` rows (per S-SBUNI-4
 * schema) when the buyer's cart line was a bundle. The order-detail UI
 * collapses those rows back under a single "Bundle: <name>" header so the
 * checkout receipt mirrors the buyer's intent. This helper is the pure
 * grouping logic — the UI primitive lives next to the consumer view.
 *
 * Two flavours of multi-member row can appear on an order:
 *   1. LEGACY — ONE row whose `bundleCategorySlug` + `bundleProductIds[]`
 *      describe the whole bundle, with the locked bundlePrice as its line
 *      total. Every bundle order placed before row expansion looks like this,
 *      and they keep rendering unchanged.
 *   2. CURRENT — expanded N rows, one per member, all sharing a `groupSlug`
 *      (and, for bundles, the same `bundleCategorySlug`). This is what
 *      checkout writes now, so each row can carry its own HSN/GST and be
 *      cancelled independently.
 *
 * Either way this returns a stable, ordered list of groups so the renderer
 * iterates once and the buyer's receipt reads the same.
 */

/** Minimal shape consumed from an order item (Firestore wire format). */
export interface OrderItemForLineGrouping {
  /** Collapse key for expanded rows (bundle OR buyer-assembled group). */
  groupSlug?: string;
  /** Display name of the bundle / group. */
  groupTitle?: string;
  /** Bundle discriminator — also set on expanded bundle rows. */
  bundleCategorySlug?: string;
  /** @deprecated Legacy collapsed rows only. */
  bundleProductIds?: string[];
}

export type LineOrderGroup<T extends OrderItemForLineGrouping> =
  | { kind: "single"; item: T; index: number }
  | {
      kind: "bundle";
      /** The key these rows were collapsed on. */
      bundleCategorySlug: string;
      groupTitle?: string;
      items: Array<{ item: T; index: number }>;
      /** Members represented: the row count when expanded, the snapshot length when legacy. */
      memberCount: number;
    };

/**
 * Walk the items array preserving original order; collapse rows sharing a
 * collapse key into one group. Single rows pass through unchanged.
 *
 * The key is `groupSlug ?? bundleCategorySlug` — the fallback is what keeps
 * legacy collapsed bundle rows (written before `groupSlug` existed) grouping
 * exactly as they always did, with no order migration.
 */
export function groupOrderItemsByLine<T extends OrderItemForLineGrouping>(
  items: T[],
): Array<LineOrderGroup<T>> {
  const groups: Array<LineOrderGroup<T>> = [];
  const indexByKey = new Map<string, number>();

  items.forEach((item, index) => {
    const key = item.groupSlug ?? item.bundleCategorySlug;
    if (!key) {
      groups.push({ kind: "single", item, index });
      return;
    }
    const existingIdx = indexByKey.get(key);
    if (existingIdx === undefined) {
      groups.push({
        kind: "bundle",
        bundleCategorySlug: key,
        groupTitle: item.groupTitle,
        // Legacy rows carry the member list; expanded rows ARE the members, so
        // the count is grown as siblings arrive below.
        memberCount: item.bundleProductIds?.length ?? 1,
        items: [{ item, index }],
      });
      indexByKey.set(key, groups.length - 1);
      return;
    }
    const existing = groups[existingIdx];
    if (existing.kind === "bundle") {
      existing.items.push({ item, index });
      // Expanded rows: one row per member, so the row count IS the member count.
      if (!item.bundleProductIds?.length) {
        existing.memberCount = existing.items.length;
      }
    }
  });

  return groups;
}
