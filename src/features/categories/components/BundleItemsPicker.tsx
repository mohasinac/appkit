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
import type { JsonValue } from "@mohasinac/appkit";
import { Badge, Button, Checkbox, Div, Input, Row, Stack, Text } from "../../../ui";
import {
  BUNDLE_MAX_ITEMS,
  BUNDLE_MIN_ITEMS,
} from "../../../_internal/shared/features/categories/bundle-config";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

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
const CLS_ROW_SELECTED = "bg-info-surface dark:bg-info-surface";

function renderBundleSelectedChips(props: {
  value: string[]; metadata: Record<string, BundleItemSearchResult>; remove: (id: string) => void;
}) {
  const { value, metadata, remove } = props;
  if (value.length === 0) return null;
  return (
    <Div layout="flex" gap="2" className={`flex-wrap ${__P.p3}`} rounded="lg" surface="muted" border="default">
      {value.map((id) => {
        const meta = metadata[id];
        const label = meta?.title ?? id;
        return (
          <Row textSize="xs" key={id} gap="xs" align="center" className="py-1" border="strong" padding="x-sm" surface="default" rounded="full">
            <Text size="xs" className="max-w-[200px] truncate">{label}</Text>
            <Button variant="ghost" size="sm" aria-label={BUNDLE_COPY.picker.removeAria(label)} onClick={() => remove(id)}>×</Button>
          </Row>
        );
      })}
    </Div>
  );
}

function renderBundleSearchResults(props: {
  results: BundleItemSearchResult[]; selectedSet: Set<string>; value: string[];
  maxItems: number; toggle: (id: string) => void;
  isSearching: boolean; searchError: string | null; debouncedQuery: string;
}) {
  const { results, selectedSet, value, maxItems, toggle, isSearching, searchError, debouncedQuery } = props;
  return (
    <>
      {searchError && <Text size="sm" color="danger">{searchError}</Text>}
      {isSearching && <Text size="sm" color="muted">{BUNDLE_COPY.picker.searchingHint}</Text>}
      {!isSearching && debouncedQuery.length >= 2 && results.length === 0 && !searchError && (
        <Text size="sm" color="muted">{BUNDLE_COPY.picker.noMatches(debouncedQuery)}</Text>
      )}
      {results.length > 0 && (
        <Div className={`max-h-72 ${__O.yAuto}`} rounded="lg" border="default">
          {results.map((r) => {
            const isSelected = selectedSet.has(r.id);
            const atCap = !isSelected && value.length >= maxItems;
            return (
              <Row border="subtle" key={r.id} gap="sm" align="center" className={`border-b last:border-b-0 ${isSelected ? CLS_ROW_SELECTED : ""} ${atCap ? "opacity-50" : ""}`} padding="inlineSm">
                <Checkbox checked={isSelected} disabled={atCap} onChange={() => toggle(r.id)} aria-label={BUNDLE_COPY.picker.toggleAria(r.title)} />
                <Stack gap="xs" className="flex-1">
                  <Text size="sm" weight="medium">{r.title}</Text>
                  <Row gap="sm">
                    <Text size="xs" color="muted">{r.id}</Text>
                    {typeof r.priceInPaise === "number" && <Text size="xs" color="muted">· ₹{Math.round(r.priceInPaise / 100).toLocaleString("en-IN")}</Text>}
                  </Row>
                </Stack>
              </Row>
            );
          })}
        </Div>
      )}
    </>
  );
}

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
      // audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
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
  const countLabel = BUNDLE_COPY.picker.selectedCount(
    value.length,
    minItems,
    maxItems,
  );
  const countVariant: "success" | "warning" | "danger" =
    tooFew || tooMany ? "warning" : "success";

  return (
    <Stack gap="md">
      <Row gap="sm" align="center" justify="between" wrap>
        <Text size="sm" weight="semibold">
          {BUNDLE_COPY.picker.title}
        </Text>
        <Badge variant={countVariant}>{countLabel}</Badge>
      </Row>

      {renderBundleSelectedChips({ value, metadata, remove })}

      <Stack gap="sm">
        <Input type="search" placeholder={BUNDLE_COPY.picker.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={BUNDLE_COPY.picker.searchAriaLabel} />
        {renderBundleSearchResults({ results, selectedSet, value, maxItems, toggle, isSearching, searchError, debouncedQuery })}
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
      const rec = r as Record<string, JsonValue>;
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
