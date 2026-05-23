"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type { PaginatedSelectOption, AsyncPage } from "../../../ui/components/PaginatedSelect";
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

// Admin: paginated + server-side search via /api/admin/categories (admin/mod only).
// Response via successResponse({ data: items, total }) → apiClient unwraps to { data, total, ... }.
async function loadAdminCategoryOptions(
  query: string,
  page: number,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "20",
    flat: "true",
  });
  const res = await apiClient.get<{
    data?: { id?: string; name?: string }[];
    total?: number;
  }>(`${ADMIN_ENDPOINTS.CATEGORIES}?${params}`);
  const items = (res.data ?? []).map((c) => ({
    value: String(c.id ?? ""),
    label: String(c.name ?? ""),
  }));
  const total = res.total ?? items.length;
  return { items, hasMore: page * 20 < total, nextPage: page + 1 };
}

// Seller: fetch all flat categories from the public unauthenticated endpoint,
// filter client-side by query. Public endpoint returns { success, data: CategoryItem[] }.
async function loadPublicCategoryOptions(
  query: string,
  _page: number,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const params = new URLSearchParams({ flat: "true", pageSize: "200" });
  const res = await fetch(`/api/categories?${params}`, { credentials: "include" });
  const json: { success?: boolean; data?: { id?: string; name?: string }[] } =
    await res.json().catch(() => ({}));
  const all = (json.data ?? []).map((c) => ({
    value: String(c.id ?? ""),
    label: String(c.name ?? ""),
  }));
  const q = query.trim().toLowerCase();
  const items = q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
  return { items, hasMore: false, nextPage: 2 };
}

export function CategoryInlineSelect({
  value,
  onChange,
  placeholder = "Search categories…",
  disabled,
  allowCreate = false,
}: CategoryInlineSelectProps) {
  const loadOptions = allowCreate ? loadAdminCategoryOptions : loadPublicCategoryOptions;
  return (
    <PaginatedSelect<string>
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      loadOptions={loadOptions}
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
