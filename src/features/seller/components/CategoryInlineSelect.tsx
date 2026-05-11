"use client";
import React from "react";
import { InlineCreateSelect } from "../../../ui/components/InlineCreateSelect";
import type { DynamicSelectOption, AsyncPage } from "../../../ui/components/DynamicSelect";
import { CategoryQuickCreateForm } from "../../admin/components/CategoryQuickCreateForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface CategoryInlineSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new category" option. Defaults to false (search-only for sellers). */
  allowCreate?: boolean;
}

async function loadCategoryOptions(
  query: string,
  page: number,
): Promise<AsyncPage<DynamicSelectOption<string>>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "20",
    flat: "true",
  });
  const res = await apiClient.get<{
    items?: { id?: string; name?: string }[];
    total?: number;
  }>(`${ADMIN_ENDPOINTS.CATEGORIES}?${params}`);
  const items = (res.items ?? []).map((c) => ({
    value: String(c.id ?? ""),
    label: String(c.name ?? ""),
  }));
  const total = res.total ?? items.length;
  return { items, hasMore: page * 20 < total, nextPage: page + 1 };
}

export function CategoryInlineSelect({
  value,
  onChange,
  placeholder = "Search categories…",
  disabled,
  allowCreate = false,
}: CategoryInlineSelectProps) {
  return (
    <InlineCreateSelect<string>
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      loadOptions={loadCategoryOptions}
      placeholder={placeholder}
      disabled={disabled}
      createLabel="category"
      drawerTitle="Create Category"
      renderCreateForm={
        allowCreate
          ? ({ onCreated, onCancel }) => (
              <CategoryQuickCreateForm
                onSaved={(id, name) => onCreated({ value: id, label: name })}
                onCancel={onCancel}
              />
            )
          : undefined
      }
    />
  );
}
