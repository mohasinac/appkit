"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Div, Heading, Text } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  MAX_FEATURES_PER_PRODUCT,
  type ProductFeatureDocument,
  type ProductFeatureProductType,
} from "../schemas/product-features";

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
    (f) => f.productTypes.includes("all") || f.productTypes.includes(productType),
  );
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
    queryFn: async () => {
      const res = await apiClient.get(
        `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=platform&isActive=true`,
      );
      const body =
        (res as { data?: FeaturesListResponse })?.data ??
        (res as FeaturesListResponse);
      return body?.items ?? [];
    },
    staleTime: 60_000,
  });

  const storeQuery = useQuery({
    queryKey: ["product-features", "store", "active", storeId],
    queryFn: async () => {
      const res = await apiClient.get(
        `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=store&storeId=${encodeURIComponent(storeId!)}&isActive=true`,
      );
      const body =
        (res as { data?: FeaturesListResponse })?.data ??
        (res as FeaturesListResponse);
      return body?.items ?? [];
    },
    enabled: !!storeId,
    staleTime: 60_000,
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
      <label
        key={f.id}
        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
          checked
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : cantSelect
              ? "border-zinc-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
              : "border-zinc-200 dark:border-slate-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5"
          checked={checked}
          disabled={disabled || cantSelect}
          onChange={() => toggle(f.id)}
        />
        <span className="flex-1">
          <span className="block font-medium text-zinc-900 dark:text-zinc-100">
            {f.label}
          </span>
          {f.description && (
            <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
              {f.description}
            </span>
          )}
        </span>
      </label>
    );
  };

  return (
    <Div>
      <Heading
        level={3}
        className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
      >
        Feature badges
      </Heading>
      <Text className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Selected: {value.length} of {MAX_FEATURES_PER_PRODUCT}. Badges appear on
        product cards and detail pages.
      </Text>

      {overLimit && (
        <div className="mb-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-200">
          Too many features selected — remove {value.length - MAX_FEATURES_PER_PRODUCT}{" "}
          before saving.
        </div>
      )}

      {platformFeatures.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Platform features
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {platformFeatures.map(renderRow)}
          </div>
        </div>
      )}

      {storeFeatures.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
            Store custom features
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {storeFeatures.map(renderRow)}
          </div>
        </div>
      )}

      {!platformQuery.isLoading &&
        platformFeatures.length === 0 &&
        storeFeatures.length === 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
            No applicable feature badges available.
          </div>
        )}
    </Div>
  );
}
