"use client";
import React from "react";
import { InlineCreateSelect } from "../../../ui/components/InlineCreateSelect";
import type { DynamicSelectOption, AsyncPage } from "../../../ui/components/DynamicSelect";
import { BrandQuickCreateForm } from "../../admin/components/BrandQuickCreateForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface BrandInlineSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new brand" option. Defaults to true for sellers. */
  allowCreate?: boolean;
}

async function loadBrandOptions(
  query: string,
  page: number,
): Promise<AsyncPage<DynamicSelectOption<string>>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "20",
  });
  const res = await apiClient.get<{
    brands?: { id?: string; name?: string }[];
    items?: { id?: string; name?: string }[];
    total?: number;
  }>(`${ADMIN_ENDPOINTS.BRANDS}?${params}`);
  const raw = res.brands ?? res.items ?? [];
  const items = raw.map((b) => ({
    value: String(b.id ?? ""),
    label: String(b.name ?? ""),
  }));
  const total = res.total ?? items.length;
  return { items, hasMore: page * 20 < total, nextPage: page + 1 };
}

export function BrandInlineSelect({
  value,
  onChange,
  placeholder = "Search brands…",
  disabled,
  allowCreate = true,
}: BrandInlineSelectProps) {
  return (
    <InlineCreateSelect<string>
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      loadOptions={loadBrandOptions}
      placeholder={placeholder}
      disabled={disabled}
      createLabel="brand"
      drawerTitle="Create Brand"
      renderCreateForm={
        allowCreate
          ? ({ onCreated, onCancel }) => (
              <BrandQuickCreateForm
                onSaved={(id, name) => onCreated({ value: id, label: name })}
                onCancel={onCancel}
              />
            )
          : undefined
      }
    />
  );
}
