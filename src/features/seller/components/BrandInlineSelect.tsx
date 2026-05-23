"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type { PaginatedSelectOption, AsyncPage } from "../../../ui/components/PaginatedSelect";
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

// Admin: paginated search via /api/admin/brands (admin/mod only).
// Response via successResponse({ data: items, total }) → apiClient unwraps to { data, total }.
async function loadAdminBrandOptions(
  query: string,
  page: number,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "20",
  });
  const res = await apiClient.get<{
    data?: { id?: string; name?: string }[];
    items?: { id?: string; name?: string }[];
    total?: number;
  }>(`${ADMIN_ENDPOINTS.BRANDS}?${params}`);
  const raw = res.data ?? res.items ?? [];
  const items = raw.map((b) => ({
    value: String(b.id ?? ""),
    label: String(b.name ?? ""),
  }));
  const total = res.total ?? items.length;
  return { items, hasMore: page * 20 < total, nextPage: page + 1 };
}

// Seller/public: unauthenticated /api/brands endpoint returns { items, total }.
// Client-side query filtering so all sellers can access the brand list.
async function loadPublicBrandOptions(
  query: string,
  page: number,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "100",
    active: "true",
  });
  const res = await apiClient.get<{
    items?: { id?: string; name?: string }[];
    total?: number;
  }>(`/api/brands?${params}`);
  const all = (res.items ?? []).map((b) => ({
    value: String(b.id ?? ""),
    label: String(b.name ?? ""),
  }));
  const q = query.trim().toLowerCase();
  const items = q ? all.filter((b) => b.label.toLowerCase().includes(q)) : all;
  return { items, hasMore: false, nextPage: page + 1 };
}

export function BrandInlineSelect({
  value,
  onChange,
  placeholder = "Search brands…",
  disabled,
  allowCreate = true,
}: BrandInlineSelectProps) {
  const loadOptions = allowCreate ? loadAdminBrandOptions : loadPublicBrandOptions;
  return (
    <PaginatedSelect<string>
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      loadOptions={loadOptions}
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
