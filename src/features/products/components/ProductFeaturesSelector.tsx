"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Div, Grid, Heading, Stack, Text } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { PRODUCT_FEATURE_QUERY_STALE_MS } from "../constants/product-features.constants";
import {
  MAX_FEATURES_PER_PRODUCT,
  type ProductFeatureDocument,
  type ProductFeatureProductType,
} from "../schemas/product-features";

const SECTION_LABEL_CLASS =
  "text-[var(--appkit-font-size-2xs,11px)] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2";
const ROW_BASE_CLASS =
  "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors";
const ROW_CHECKED_CLASS =
  "border-primary bg-primary/5 dark:bg-primary/10";
const ROW_DISABLED_CLASS =
  "border-zinc-200 dark:border-slate-700 opacity-50 cursor-not-allowed";
const ROW_DEFAULT_CLASS =
  "border-zinc-200 dark:border-slate-700 hover:bg-zinc-50 dark:hover:bg-slate-800";
const OVER_LIMIT_BANNER_CLASS =
  "rounded-lg border border-error/20 bg-error-surface px-3 py-2 text-xs text-error";
const EMPTY_STATE_CLASS =
  "rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-4 text-xs text-zinc-500 dark:text-zinc-400 text-center";

export interface ProductFeaturesSelectorProps {
  /** Selected feature IDs. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Determines which platform features are eligible. */
  productType: ProductFeatureProductType;
  /** Store ID — when present, store-scope features are also loaded. */
  storeId?: string;
  disabled?: boolean;
}

interface FeaturesListResponse {
  items?: ProductFeatureDocument[];
}

function applyProductType(
  list: ProductFeatureDocument[],
  productType: ProductFeatureProductType,
): ProductFeatureDocument[] {
  if (productType === "all") return list;
  return list.filter(
    (f) =>
      f.productTypes.includes("all") || f.productTypes.includes(productType),
  );
}

function rowClass(checked: boolean, cantSelect: boolean): string {
  if (checked) return `${ROW_BASE_CLASS} ${ROW_CHECKED_CLASS}`;
  if (cantSelect) return `${ROW_BASE_CLASS} ${ROW_DISABLED_CLASS}`;
  return `${ROW_BASE_CLASS} ${ROW_DEFAULT_CLASS}`;
}

function unwrapItems(res: unknown): ProductFeatureDocument[] {
  const body =
    (res as { data?: FeaturesListResponse })?.data ??
    (res as FeaturesListResponse);
  return body?.items ?? [];
}

export function ProductFeaturesSelector({
  value,
  onChange,
  productType,
  storeId,
  disabled,
}: ProductFeaturesSelectorProps) {
  const platformQuery = useQuery({
    queryKey: ["product-features", "platform", "active"],
    queryFn: async () =>
      unwrapItems(
        await apiClient.get(
          `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=platform&isActive=true`,
        ),
      ),
    staleTime: PRODUCT_FEATURE_QUERY_STALE_MS,
  });

  const storeQuery = useQuery({
    queryKey: ["product-features", "store", "active", storeId],
    queryFn: async () =>
      unwrapItems(
        await apiClient.get(
          `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=store&storeId=${encodeURIComponent(storeId!)}&isActive=true`,
        ),
      ),
    enabled: !!storeId,
    staleTime: PRODUCT_FEATURE_QUERY_STALE_MS,
  });

  const platformFeatures = applyProductType(
    platformQuery.data ?? [],
    productType,
  );
  const storeFeatures = applyProductType(storeQuery.data ?? [], productType);
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const atLimit = value.length >= MAX_FEATURES_PER_PRODUCT;
  const overLimit = value.length > MAX_FEATURES_PER_PRODUCT;

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (atLimit) return;
    onChange([...value, id]);
  };

  const renderRow = (f: ProductFeatureDocument) => {
    const checked = selectedSet.has(f.id);
    const cantSelect = !checked && atLimit;
    return (
      <label key={f.id} className={rowClass(checked, cantSelect)}>
        <input
          type="checkbox"
          className="mt-0.5"
          checked={checked}
          disabled={disabled || cantSelect}
          onChange={() => toggle(f.id)}
          aria-label={f.label}
        />
        <Div className="flex-1">
          <Text as="span" className="block font-medium text-zinc-900 dark:text-zinc-100">
            {f.label}
          </Text>
          {f.description && (
            <Text
              as="span"
              className="block text-zinc-500 dark:text-zinc-400 mt-0.5"
            >
              {f.description}
            </Text>
          )}
        </Div>
      </label>
    );
  };

  const hasAny =
    platformQuery.isLoading ||
    storeQuery.isLoading ||
    platformFeatures.length > 0 ||
    storeFeatures.length > 0;

  return (
    <Stack gap="sm">
      <Div>
        <Heading
          level={3}
          className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        >
          Feature badges
        </Heading>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          Selected: {value.length} of {MAX_FEATURES_PER_PRODUCT}. Badges appear
          on product cards and detail pages.
        </Text>
      </Div>

      {overLimit && (
        <Div className={OVER_LIMIT_BANNER_CLASS}>
          Too many features selected — remove{" "}
          {value.length - MAX_FEATURES_PER_PRODUCT} before saving.
        </Div>
      )}

      {platformFeatures.length > 0 && (
        <Div>
          <Div className={SECTION_LABEL_CLASS}>Platform features</Div>
          <Grid cols="halves" gap="xs">
            {platformFeatures.map(renderRow)}
          </Grid>
        </Div>
      )}

      {storeFeatures.length > 0 && (
        <Div>
          <Div className={SECTION_LABEL_CLASS}>Store custom features</Div>
          <Grid cols="halves" gap="xs">
            {storeFeatures.map(renderRow)}
          </Grid>
        </Div>
      )}

      {!hasAny && (
        <Div className={EMPTY_STATE_CLASS}>
          No applicable feature badges available.
        </Div>
      )}
    </Stack>
  );
}
