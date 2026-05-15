"use client";

/**
 * CategoryBundlesListing — SB-UNI-D + V replacement for the deleted
 * BundlesByCategoryListing. Renders a sortable list of bundles that live
 * as `categoryType:"bundle"` rows on the categories collection.
 *
 * Parent server-fetches the list; client owns only the sort state.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Div, Row, Select, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils/number.formatter";
import type { CategoryDocument } from "../schemas";

// ── Sort options ──────────────────────────────────────────────────────────
type BundleSort = "newest" | "price-asc" | "price-desc";

const SORT_OPTIONS: Array<{ label: string; value: BundleSort }> = [
  { label: "Newest", value: "newest" },
  { label: "Price ↑", value: "price-asc" },
  { label: "Price ↓", value: "price-desc" },
];

// ── Stock status presentation ─────────────────────────────────────────────
type StockKey = NonNullable<CategoryDocument["bundleStockStatus"]>;

const STOCK_BADGE_TEXT: Record<StockKey, string> = {
  in_stock: "",
  out_of_stock: "Not active",
};

const STOCK_BADGE_VARIANT: Record<StockKey, "success" | "warning"> = {
  in_stock: "success",
  out_of_stock: "warning",
};

const PLACEHOLDER_EMOJI = "📦" as const;
const COPY = {
  empty: "No bundles available",
  forBrand: (name: string) => ` for ${name}`,
  yetSuffix: " yet.",
  sortLabel: "Sort:",
  items: (n: number) => `${n} item${n !== 1 ? "s" : ""}`,
  priceFallback: "—",
} as const;

export interface CategoryBundlesListingProps {
  initialBundles: CategoryDocument[];
  brandName?: string;
}

function comparator(sort: BundleSort) {
  return (a: CategoryDocument, b: CategoryDocument) => {
    if (sort === "price-asc") {
      return (a.bundlePriceInPaise ?? 0) - (b.bundlePriceInPaise ?? 0);
    }
    if (sort === "price-desc") {
      return (b.bundlePriceInPaise ?? 0) - (a.bundlePriceInPaise ?? 0);
    }
    const aT = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bT = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bT - aT;
  };
}

export function CategoryBundlesListing({
  initialBundles,
  brandName,
}: CategoryBundlesListingProps) {
  const [sort, setSort] = useState<BundleSort>("newest");

  const filtered = useMemo(
    () =>
      initialBundles
        .filter((c) => c.categoryType === "bundle")
        .slice()
        .sort(comparator(sort)),
    [initialBundles, sort],
  );

  if (filtered.length === 0) {
    return (
      <Div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
        <Text color="muted">
          {COPY.empty}
          {brandName ? COPY.forBrand(brandName) : ""}
          {COPY.yetSuffix}
        </Text>
      </Div>
    );
  }

  return (
    <Stack gap="md">
      <Row gap="sm" align="center" justify="end">
        <Text size="sm" color="muted">
          {COPY.sortLabel}
        </Text>
        <Select<BundleSort>
          options={SORT_OPTIONS}
          value={sort}
          onValueChange={setSort}
          aria-label={COPY.sortLabel}
        />
      </Row>

      <Div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} />
        ))}
      </Div>
    </Stack>
  );
}

interface BundleCardProps {
  bundle: CategoryDocument;
}

function BundleCard({ bundle }: BundleCardProps) {
  const memberCount = bundle.bundleProductIds?.length ?? 0;
  const stock = bundle.bundleStockStatus ?? "in_stock";
  const badge = STOCK_BADGE_TEXT[stock];
  const cover = bundle.display?.coverImage;
  const href = String(ROUTES.PUBLIC.BUNDLE_DETAIL?.(bundle.slug) ?? "#");

  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <Div className="mb-2 aspect-video overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={bundle.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Div className="flex h-full w-full items-center justify-center text-3xl">
            {PLACEHOLDER_EMOJI}
          </Div>
        )}
      </Div>
      <Text className="line-clamp-2 text-sm font-semibold">{bundle.name}</Text>
      <Row gap="sm" align="center" className="mt-1">
        <Text size="sm" weight="bold">
          {bundle.bundlePriceInPaise
            ? formatCurrency(bundle.bundlePriceInPaise / 100, "INR")
            : COPY.priceFallback}
        </Text>
        <Text size="xs" color="muted">
          {COPY.items(memberCount)}
        </Text>
      </Row>
      {badge && (
        <Badge variant={STOCK_BADGE_VARIANT[stock]} className="mt-1">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
