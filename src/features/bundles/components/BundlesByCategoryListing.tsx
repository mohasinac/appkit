"use client";

/**
 * BundlesByCategoryListing — SB7-C bundles tab (server-fetched via parent).
 *
 * Slim wrapper around `BundlesListingView` that hydrates from a parent-server
 * fetch of `bundlesRepository.findByCategory(categorySlug)` or from a search
 * by brand. The client owns its own filter state (sort + min/max) but does
 * not refetch — the parent ships the full bundle list as `initialBundles`.
 *
 * For listing surfaces that need real pagination, swap to `useBundles`
 * (not yet built — track in S7-PrizeDraws-3 follow-ups).
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Div,
  Row,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import type { BundleDocument } from "../schemas/firestore";

export interface BundlesByCategoryListingProps {
  initialBundles: BundleDocument[];
  brandName?: string;
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function savingsPct(b: BundleDocument): number {
  if (!b.bundleOriginalTotal) return 0;
  const off = Math.max(0, b.bundleOriginalTotal - b.bundlePrice);
  return Math.round((off / b.bundleOriginalTotal) * 100);
}

export function BundlesByCategoryListing({
  initialBundles,
  brandName,
}: BundlesByCategoryListingProps) {
  const [sort, setSort] = useState<"newest" | "savings-desc" | "price-asc">(
    "newest",
  );

  const filtered = useMemo(() => {
    let list = initialBundles.slice();
    if (brandName) {
      const needle = brandName.toLowerCase();
      list = list.filter(
        (b) =>
          (b as any).brand?.toLowerCase?.() === needle ||
          (b as any).brandSlug?.toLowerCase?.() === needle ||
          b.bundleItems.some((it: any) =>
            String(it.brand ?? "").toLowerCase() === needle,
          ),
      );
    }
    if (sort === "savings-desc")
      list.sort((a, b) => savingsPct(b) - savingsPct(a));
    else if (sort === "price-asc")
      list.sort((a, b) => a.bundlePrice - b.bundlePrice);
    return list;
  }, [initialBundles, brandName, sort]);

  return (
    <Stack className="gap-4">
      <Row className="items-center justify-between flex-wrap gap-2">
        <Text className="text-sm text-[var(--appkit-color-text-muted)]">
          {filtered.length} {filtered.length === 1 ? "bundle" : "bundles"}
        </Text>
        <label className="text-xs text-zinc-600 dark:text-zinc-300">
          Sort:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="ml-2 rounded border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
          >
            <option value="newest">Newest</option>
            <option value="savings-desc">Best savings</option>
            <option value="price-asc">Price: low → high</option>
          </select>
        </label>
      </Row>

      {filtered.length === 0 ? (
        <Div className="rounded border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
          <Text>No bundles match these filters yet.</Text>
        </Div>
      ) : (
        <Div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((b) => {
            const oos = b.status === "out_of_stock";
            const off = savingsPct(b);
            return (
              <Link
                key={b.id}
                href={ROUTES.PUBLIC.BUNDLE_DETAIL(b.slug)}
                className="group block rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-md transition"
              >
                <Div
                  className={`relative aspect-video bg-zinc-100 dark:bg-zinc-800 ${oos ? "opacity-60" : ""}`}
                >
                  {b.images?.[0] && (
                    /* eslint-disable-next-line @next/next/no-img-element, @next/next/no-raw-media-elements */
                    <img
                      src={b.images[0]}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {oos && (
                    <Div className="absolute inset-0 grid place-items-center bg-black/40">
                      <Badge variant="danger">Currently unavailable</Badge>
                    </Div>
                  )}
                  {off > 0 && !oos && (
                    <Badge variant="success" className="absolute top-2 left-2">
                      {off}% off
                    </Badge>
                  )}
                  <Badge variant="secondary" className="absolute top-2 right-2">
                    {b.bundleItems.length} items
                  </Badge>
                </Div>
                <Stack className="gap-1 p-3">
                  <Text className="font-medium truncate">{b.title}</Text>
                  <Text className="text-xs text-[var(--appkit-color-text-muted)]">
                    {b.storeName}
                  </Text>
                  <Row className="items-baseline gap-2">
                    <Text className="font-semibold">
                      {formatRupees(b.bundlePrice)}
                    </Text>
                    {b.bundleOriginalTotal > b.bundlePrice && (
                      <Text className="text-xs line-through text-[var(--appkit-color-text-muted)]">
                        {formatRupees(b.bundleOriginalTotal)}
                      </Text>
                    )}
                  </Row>
                </Stack>
              </Link>
            );
          })}
        </Div>
      )}
    </Stack>
  );
}
