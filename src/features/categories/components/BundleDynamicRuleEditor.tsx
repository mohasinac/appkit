"use client";

/**
 * BundleDynamicRuleEditor — S-SBUNI-5 2026-05-13.
 *
 * Dynamic-rule companion to BundleItemsPicker. When an admin picks "dynamic"
 * as the bundle's query-rule type, this view collects:
 *   - filter: categorySlug? · brandSlug? · tags? · listingType?
 *   - orderBy: price-asc | price-desc | createdAt-desc
 *   - limit (1..BUNDLE_MAX_ITEMS)
 *
 * The resolved member ids are computed by the `onProductStockChange` Firebase
 * Function + a scheduled job, cached on `bundleProductIds[]` with a
 * `bundleQueryResolvedAt` timestamp. This editor only writes the rule.
 */

import React, { useCallback } from "react";
import { Div, Input, Row, Select, Stack, Text } from "../../../ui";
import { BUNDLE_MAX_ITEMS } from "../../../_internal/shared/features/categories/bundle-config";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";

type DynamicRule = {
  type: "dynamic";
  filter: {
    categorySlug?: string;
    brandSlug?: string;
    tags?: string[];
    listingType?: "standard" | "pre-order";
  };
  orderBy?: "price-asc" | "price-desc" | "createdAt-desc";
  limit: number;
};

const DEFAULT_DYNAMIC_RULE: DynamicRule = {
  type: "dynamic",
  filter: {},
  orderBy: "createdAt-desc",
  limit: 6,
};

const ORDER_BY_OPTIONS: Array<{ label: string; value: DynamicRule["orderBy"] }> = [
  { label: "Newest first", value: "createdAt-desc" },
  { label: "Price (low → high)", value: "price-asc" },
  { label: "Price (high → low)", value: "price-desc" },
];

const LISTING_TYPE_OPTIONS: Array<{
  label: string;
  value: NonNullable<DynamicRule["filter"]["listingType"]> | "";
}> = [
  { label: "Any (standard + pre-order)", value: "" },
  { label: "Standard only", value: "standard" },
  { label: "Pre-order only", value: "pre-order" },
];

export interface BundleDynamicRuleEditorProps {
  value: DynamicRule | null;
  onChange: (next: DynamicRule) => void;
  disabled?: boolean;
}

export function BundleDynamicRuleEditor({
  value,
  onChange,
  disabled = false,
}: BundleDynamicRuleEditorProps) {
  const rule = value ?? DEFAULT_DYNAMIC_RULE;

  const patch = useCallback(
    (next: Partial<DynamicRule>) => onChange({ ...rule, ...next }),
    [rule, onChange],
  );

  const patchFilter = useCallback(
    (next: Partial<DynamicRule["filter"]>) =>
      onChange({ ...rule, filter: { ...rule.filter, ...next } }),
    [rule, onChange],
  );

  const tagsValue = (rule.filter.tags ?? []).join(", ");

  return (
    <Stack gap="md">
      <Row gap="sm" align="center" justify="between" className="flex-wrap">
        <Text size="sm" weight="semibold">
          {BUNDLE_COPY.adminEditor.dynamic.title}
        </Text>
        <Text size="xs" color="muted">
          {BUNDLE_COPY.adminEditor.dynamic.hint}
        </Text>
      </Row>

      <Div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stack gap="xs">
          <Text size="xs" weight="semibold">
            {BUNDLE_COPY.adminEditor.dynamic.fields.categorySlug}
          </Text>
          <Input
            type="text"
            value={rule.filter.categorySlug ?? ""}
            onChange={(e) =>
              patchFilter({ categorySlug: e.target.value.trim() || undefined })
            }
            placeholder="category-action-figures"
            disabled={disabled}
          />
        </Stack>

        <Stack gap="xs">
          <Text size="xs" weight="semibold">
            {BUNDLE_COPY.adminEditor.dynamic.fields.brandSlug}
          </Text>
          <Input
            type="text"
            value={rule.filter.brandSlug ?? ""}
            onChange={(e) =>
              patchFilter({ brandSlug: e.target.value.trim() || undefined })
            }
            placeholder="brand-bandai"
            disabled={disabled}
          />
        </Stack>
      </Div>

      <Stack gap="xs">
        <Text size="xs" weight="semibold">
          {BUNDLE_COPY.adminEditor.dynamic.fields.tags}
        </Text>
        <Input
          type="text"
          value={tagsValue}
          onChange={(e) => {
            const parsed = e.target.value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            patchFilter({ tags: parsed.length ? parsed : undefined });
          }}
          placeholder="pokemon, starter-deck"
          disabled={disabled}
        />
      </Stack>

      <Div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stack gap="xs">
          <Text size="xs" weight="semibold">
            {BUNDLE_COPY.adminEditor.dynamic.fields.listingType}
          </Text>
          <Select<NonNullable<DynamicRule["filter"]["listingType"]> | "">
            options={LISTING_TYPE_OPTIONS}
            value={rule.filter.listingType ?? ""}
            onValueChange={(next) =>
              patchFilter({
                listingType: next === "" ? undefined : next,
              })
            }
            disabled={disabled}
            aria-label={BUNDLE_COPY.adminEditor.dynamic.fields.listingType}
          />
        </Stack>

        <Stack gap="xs">
          <Text size="xs" weight="semibold">
            {BUNDLE_COPY.adminEditor.dynamic.fields.orderBy}
          </Text>
          <Select<NonNullable<DynamicRule["orderBy"]>>
            options={ORDER_BY_OPTIONS.map((o) => ({
              label: o.label,
              value: o.value as NonNullable<DynamicRule["orderBy"]>,
            }))}
            value={(rule.orderBy ?? "createdAt-desc") as NonNullable<DynamicRule["orderBy"]>}
            onValueChange={(next) => patch({ orderBy: next })}
            disabled={disabled}
            aria-label={BUNDLE_COPY.adminEditor.dynamic.fields.orderBy}
          />
        </Stack>

        <Stack gap="xs">
          <Text size="xs" weight="semibold">
            {BUNDLE_COPY.adminEditor.dynamic.fields.limit}
          </Text>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={BUNDLE_MAX_ITEMS}
            step={1}
            value={String(rule.limit)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) {
                patch({
                  limit: Math.min(
                    Math.max(1, Math.floor(next)),
                    BUNDLE_MAX_ITEMS,
                  ),
                });
              }
            }}
            disabled={disabled}
          />
        </Stack>
      </Div>
    </Stack>
  );
}
