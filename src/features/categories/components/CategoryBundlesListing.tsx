"use client";

/**
 * CategoryBundlesListing — SB-UNI-D + V (replaces the deleted
 * BundlesByCategoryListing). Renders a list of bundles that live as
 * categoryType:"bundle" rows on the categories collection.
 *
 * Slim wrapper — parent server-fetches the bundle categories and ships
 * the list as `initialBundles`. Client owns sort state only; no refetch.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Div, Row, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import type { CategoryDocument } from "../schemas";

export interface CategoryBundlesListingProps {
  initialBundles: CategoryDocument[];
  brandName?: string;
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function CategoryBundlesListing({
  initialBundles,
  brandName,
}: CategoryBundlesListingProps) {
  const [sort, setSort] = useState<"newest" | "price-asc" | "price-desc">(
    "newest",
  );

  const filtered = useMemo(() => {
    const items = [...initialBundles].filter((c) => c.categoryType === "bundle");
    if (sort === "price-asc") {
      items.sort(
        (a, b) => (a.bundlePriceInPaise ?? 0) - (b.bundlePriceInPaise ?? 0),
      );
    } else if (sort === "price-desc") {
      items.sort(
        (a, b) => (b.bundlePriceInPaise ?? 0) - (a.bundlePriceInPaise ?? 0),
      );
    } else {
      items.sort((a, b) => {
        const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bT - aT;
      });
    }
    return items;
  }, [initialBundles, sort]);

  if (filtered.length === 0) {
    return (
      <Div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 py-16 text-center">
        <Text color="muted">
          No bundles available
          {brandName ? ` for ${brandName}` : ""} yet.
        </Text>
      </Div>
    );
  }

  return (
    <Stack gap="md">
      <Row gap="sm" align="center" justify="end">
        <Text size="sm" color="muted">
          Sort:
        </Text>
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "newest" | "price-asc" | "price-desc")
          }
          className="appkit-input text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
      </Row>

      <Div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bundle) => {
          const memberCount = bundle.bundleProductIds?.length ?? 0;
          const stock = bundle.bundleStockStatus ?? "in_stock";
          return (
            <Link
              key={bundle.id}
              href={String(ROUTES.PUBLIC.BUNDLE_DETAIL?.(bundle.slug) ?? "#")}
              className="group rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <Div className="mb-2 aspect-video overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                {bundle.display?.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bundle.display.coverImage}
                    alt={bundle.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Div className="flex h-full w-full items-center justify-center text-3xl">
                    📦
                  </Div>
                )}
              </Div>
              <Text className="line-clamp-2 text-sm font-semibold">
                {bundle.name}
              </Text>
              <Row gap="sm" align="center" className="mt-1">
                <Text size="sm" weight="bold">
                  {bundle.bundlePriceInPaise
                    ? formatRupees(bundle.bundlePriceInPaise)
                    : "—"}
                </Text>
                <Text size="xs" color="muted">
                  {memberCount} item{memberCount !== 1 ? "s" : ""}
                </Text>
              </Row>
              {stock !== "in_stock" && (
                <Badge
                  variant={stock === "out_of_stock" ? "danger" : "warning"}
                  className="mt-1"
                >
                  {stock === "out_of_stock" ? "Out of stock" : "Partial"}
                </Badge>
              )}
            </Link>
          );
        })}
      </Div>
    </Stack>
  );
}
