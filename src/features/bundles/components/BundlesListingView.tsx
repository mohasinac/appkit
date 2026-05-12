"use client";

/**
 * BundlesListingView — SB3-H. Public sieve page for bundles.
 *
 * Renders a simple paginated grid of published bundles. Filters: store,
 * category, sort. Data fetching is delegated to the parent via initialData;
 * a follow-up can swap this to a useQuery hook against /api/bundles.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Container,
  Div,
  Heading,
  Input,
  Label,
  Pagination,
  Row,
  Section,
  Select,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { BUNDLE_SORT_OPTIONS, type BundleSort } from "../constants";
import type { BundleDocument } from "../schemas/firestore";

export type { BundleSort } from "../constants";

export interface BundlesListingViewProps {
  bundles: BundleDocument[];
  total?: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  filters?: {
    storeId?: string;
    category?: string;
    sort?: BundleSort;
  };
  onFiltersChange?: (next: BundlesListingViewProps["filters"]) => void;
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function savingsPct(b: BundleDocument): number {
  if (!b.bundleOriginalTotal) return 0;
  const off = Math.max(0, b.bundleOriginalTotal - b.bundlePrice);
  return Math.round((off / b.bundleOriginalTotal) * 100);
}

export function BundlesListingView({
  bundles,
  total,
  page = 1,
  totalPages = 1,
  onPageChange,
  filters,
  onFiltersChange,
}: BundlesListingViewProps) {
  const [storeId, setStoreId] = useState(filters?.storeId ?? "");
  const [category, setCategory] = useState(filters?.category ?? "");
  const [sort, setSort] = useState<BundleSort>(filters?.sort ?? "newest");

  const sorted = useMemo(() => {
    const list = [...bundles];
    if (sort === "savings-desc") list.sort((a, b) => savingsPct(b) - savingsPct(a));
    else if (sort === "price-asc") list.sort((a, b) => a.bundlePrice - b.bundlePrice);
    return list;
  }, [bundles, sort]);

  const apply = () => {
    onFiltersChange?.({
      storeId: storeId || undefined,
      category: category || undefined,
      sort,
    });
  };

  return (
    <Section>
      <Container>
        <Stack className="gap-6">
          <Stack className="gap-2">
            <Heading level={1}>Bundles</Heading>
            <Text className="text-[var(--appkit-color-text-muted,#6b7280)]">
              Curated multi-product bundles from LetItRip sellers.{" "}
              {typeof total === "number" && <span>{total} results</span>}
            </Text>
          </Stack>

          <Row className="gap-2 flex-wrap items-end">
            <Stack className="gap-1">
              <Label>Store</Label>
              <Input
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="store-xyz"
              />
            </Stack>
            <Stack className="gap-1">
              <Label>Category slug</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="category-action-figures"
              />
            </Stack>
            <Stack className="gap-1">
              <Label>Sort</Label>
              <Select<BundleSort>
                options={BUNDLE_SORT_OPTIONS as unknown as { value: BundleSort; label: string }[]}
                value={sort}
                onValueChange={setSort}
              />
            </Stack>
            <Button type="button" variant="primary" onClick={apply}>
              Apply
            </Button>
          </Row>

          {sorted.length === 0 ? (
            <Div className="rounded border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
              <Text>No bundles match these filters yet.</Text>
            </Div>
          ) : (
            <Div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map((b) => {
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
                        /* eslint-disable-next-line @next/next/no-img-element */
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
                        <Badge
                          variant="success"
                          className="absolute top-2 left-2"
                        >
                          {off}% off
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2"
                      >
                        {b.bundleItems.length} items
                      </Badge>
                    </Div>
                    <Stack className="gap-1 p-3">
                      <Text className="font-medium truncate">{b.title}</Text>
                      <Text className="text-xs text-[var(--appkit-color-text-muted,#6b7280)]">
                        {b.storeName}
                      </Text>
                      <Row className="items-baseline gap-2">
                        <Text className="font-semibold">
                          {formatRupees(b.bundlePrice)}
                        </Text>
                        {b.bundleOriginalTotal > b.bundlePrice && (
                          <Text className="text-xs line-through text-[var(--appkit-color-text-muted,#6b7280)]">
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

          {totalPages > 1 && onPageChange && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
        </Stack>
      </Container>
    </Section>
  );
}
