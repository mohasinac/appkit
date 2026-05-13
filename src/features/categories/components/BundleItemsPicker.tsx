"use client";

/**
 * BundleItemsPicker — S-SBUNI-4 2026-05-13.
 *
 * Multi-select picker for bundle member products. Selected ids render as
 * chips above the picker; a debounced search input queries the public
 * /api/products endpoint and renders matches as checkbox rows. Enforces the
 * BUNDLE_MIN_ITEMS / BUNDLE_MAX_ITEMS bounds at the UI level.
 *
 * The consumer passes a `fetchProducts(query)` prop so this component stays
 * appkit-internal and the wire shape lives in the host app. A default
 * implementation that hits `/api/products` is exported as
 * `defaultBundleItemsFetch`.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Div, Input, Row, Stack, Text } from "../../../ui";
import {
  BUNDLE_MAX_ITEMS,
  BUNDLE_MIN_ITEMS,
} from "../../../_internal/shared/features/categories/bundle-config";

export interface BundleItemSearchResult {
  id: string;
  title: string;
  image?: string;
  priceInPaise?: number;
  storeId?: string;
}

export interface BundleItemsPickerProps {
  /** Currently selected product ids. Source of truth lives in the parent form. */
  value: string[];
  /** Mutator called with the next ids list whenever a row is added or removed. */
  onChange: (next: string[]) => void;
  /** Async fetcher for search results. Receives debounced query. */
  fetchProducts: (query: string) => Promise<BundleItemSearchResult[]>;
  /** Optional override on min/max bounds (defaults to BUNDLE_MIN_ITEMS / BUNDLE_MAX_ITEMS). */
  minItems?: number;
  maxItems?: number;
  /** Optional initial chip metadata so already-selected ids show titles, not raw ids. */
  initialMetadata?: Record<string, BundleItemSearchResult>;
}

const SEARCH_DEBOUNCE_MS = 250;

export function BundleItemsPicker({
  value,
  onChange,
  fetchProducts,
  minItems = BUNDLE_MIN_ITEMS,
  maxItems = BUNDLE_MAX_ITEMS,
  initialMetadata = {},
}: BundleItemsPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<BundleItemSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, BundleItemSearchResult>>(
    initialMetadata,
  );

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch on debounced query change
  useEffect(() => {
    let cancelled = false;
    if (debouncedQuery.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    fetchProducts(debouncedQuery)
      .then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setMetadata((prev) => {
          const next = { ...prev };
          for (const r of rows) next[r.id] = r;
          return next;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Search failed";
        setSearchError(msg);
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, fetchProducts]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = useCallback(
    (id: string) => {
      if (selectedSet.has(id)) {
        onChange(value.filter((v) => v !== id));
        return;
      }
      if (value.length >= maxItems) {
        return;
      }
      onChange([...value, id]);
    },
    [selectedSet, value, onChange, maxItems],
  );

  const remove = useCallback(
    (id: string) => onChange(value.filter((v) => v !== id)),
    [value, onChange],
  );

  const tooFew = value.length < minItems;
  const tooMany = value.length > maxItems;
  const countLabel = `${value.length} selected · min ${minItems}, max ${maxItems}`;
  const countVariant: "success" | "warning" | "danger" =
    tooFew || tooMany ? "warning" : "success";

  return (
    <Stack gap="md">
      <Row gap="sm" align="center" justify="between" className="flex-wrap">
        <Text size="sm" weight="semibold">
          Bundle members
        </Text>
        <Badge variant={countVariant}>{countLabel}</Badge>
      </Row>

      {value.length > 0 && (
        <Div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          {value.map((id) => {
            const meta = metadata[id];
            return (
              <Row
                key={id}
                gap="xs"
                align="center"
                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
              >
                <Text size="xs" className="max-w-[200px] truncate">
                  {meta?.title ?? id}
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${meta?.title ?? id}`}
                  onClick={() => remove(id)}
                >
                  ×
                </Button>
              </Row>
            );
          })}
        </Div>
      )}

      <Stack gap="sm">
        <Input
          type="search"
          placeholder="Search products to add (type at least 2 characters)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search bundle member products"
        />

        {searchError && (
          <Text size="sm" color="danger">
            {searchError}
          </Text>
        )}

        {isSearching && (
          <Text size="sm" color="muted">
            Searching…
          </Text>
        )}

        {!isSearching &&
          debouncedQuery.length >= 2 &&
          results.length === 0 &&
          !searchError && (
            <Text size="sm" color="muted">
              No matches for &ldquo;{debouncedQuery}&rdquo;.
            </Text>
          )}

        {results.length > 0 && (
          <Div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            {results.map((r) => {
              const isSelected = selectedSet.has(r.id);
              const atCap = !isSelected && value.length >= maxItems;
              return (
                <Row
                  key={r.id}
                  gap="sm"
                  align="center"
                  className={`border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800 ${
                    isSelected ? "bg-blue-50 dark:bg-blue-950" : ""
                  } ${atCap ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={atCap}
                    onChange={() => toggle(r.id)}
                    aria-label={`Toggle ${r.title}`}
                  />
                  <Stack gap="xs" className="flex-1">
                    <Text size="sm" weight="medium">
                      {r.title}
                    </Text>
                    <Row gap="sm">
                      <Text size="xs" color="muted">
                        {r.id}
                      </Text>
                      {typeof r.priceInPaise === "number" && (
                        <Text size="xs" color="muted">
                          · ₹{Math.round(r.priceInPaise / 100).toLocaleString("en-IN")}
                        </Text>
                      )}
                    </Row>
                  </Stack>
                </Row>
              );
            })}
          </Div>
        )}
      </Stack>
    </Stack>
  );
}

/**
 * Default fetcher hitting the public /api/products endpoint. Consumers can
 * pass this directly to BundleItemsPicker's `fetchProducts` prop.
 */
export async function defaultBundleItemsFetch(
  query: string,
): Promise<BundleItemSearchResult[]> {
  const url = `/api/products?q=${encodeURIComponent(query)}&pageSize=20`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    data?: { items?: unknown[] };
    items?: unknown[];
  };
  const rawItems: unknown[] = data?.data?.items ?? data?.items ?? [];
  return rawItems
    .map((r): BundleItemSearchResult | null => {
      const rec = r as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id : null;
      const title =
        typeof rec.title === "string"
          ? rec.title
          : typeof rec.name === "string"
            ? (rec.name as string)
            : null;
      if (!id || !title) return null;
      return {
        id,
        title,
        image:
          typeof rec.mainImage === "string"
            ? (rec.mainImage as string)
            : Array.isArray(rec.images) && typeof rec.images[0] === "string"
              ? (rec.images[0] as string)
              : undefined,
        priceInPaise: typeof rec.price === "number" ? (rec.price as number) : undefined,
        storeId: typeof rec.storeId === "string" ? (rec.storeId as string) : undefined,
      };
    })
    .filter((r): r is BundleItemSearchResult => r !== null);
}
