"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type { PaginatedSelectOption, AsyncPage } from "../../../ui/components/PaginatedSelect";
import { CategoryQuickCreateForm } from "../../admin/components/CategoryQuickCreateForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { MAX_CATEGORY_ASSIGNMENTS } from "../../products/repository/category-assignment";

export interface CategoryInlineSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new category" option. Defaults to true — sellers can create categories inline. */
  allowCreate?: boolean;
  /**
   * I2 — the ADDITIONAL assignments, beyond `value`.
   *
   * 🛑 Omitting this pair keeps the component exactly single-select, which is
   * what every existing call site gets. Multi-assignment is opt-in per surface
   * rather than switched on globally, because `value`/`onChange` is a `string`
   * contract that five call sites rely on and changing it under them is Root
   * Cause #20 (a public prop change without its consumers in the same commit).
   */
  extraValues?: string[];
  onExtraValuesChange?: (ids: string[]) => void;
  /**
   * How many assignments are allowed in total, `value` included. Defaults to
   * `MAX_CATEGORY_ASSIGNMENTS`, which is what the repository refuses above.
   */
  maxAssignments?: number;
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
  const res = await fetch(CATEGORY_ENDPOINTS.FILTERED(params.toString()), { credentials: "include" });
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
  allowCreate = true,
  extraValues,
  onExtraValuesChange,
  maxAssignments = MAX_CATEGORY_ASSIGNMENTS,
}: CategoryInlineSelectProps) {
  const loadOptions = allowCreate ? loadAdminCategoryOptions : loadPublicCategoryOptions;

  const primary = (
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

  // Single-select unless the caller opted in — byte-identical to before.
  if (!onExtraValuesChange) return primary;

  const extras = extraValues ?? [];
  const remaining = Math.max(0, maxAssignments - 1 - extras.length);

  return (
    <Stack gap="sm">
      {primary}
      {/*
        * A SECOND picker rather than one multi-select, and the reason is the
        * rule the repository enforces: the FIRST assignment is not
        * interchangeable with the rest. It mirrors the scalar `category` that
        * five other call sites still send, and the derived default is chosen by
        * DEPTH rather than by pick order — so a flat multi-select would imply
        * the four slots are equivalent when they are not.
        */}
      <PaginatedSelect<string>
        multiple
        value={extras}
        onChange={(v) => onExtraValuesChange(Array.isArray(v) ? v : [])}
        loadOptions={loadOptions}
        placeholder={
          remaining > 0
            ? `Also list under… (up to ${remaining} more)`
            : "No more categories can be added"
        }
        disabled={disabled || remaining <= 0}
      />
      <Text size="xs" color="muted">
        {/*
          * 🛑 The rule is STATED before the save rather than only enforced
          * after it. `deriveTaxonomy` refuses two assignments in one tree with
          * a 400 naming both, which is the right server behaviour — but a
          * seller who cannot see the rule experiences it as the form randomly
          * rejecting a valid-looking choice.
          */}
        Optional. Add a category from a DIFFERENT tree — a franchise, for
        example. Two categories from the same tree will be refused, because the
        broader one is already implied by the narrower.
      </Text>
    </Stack>
  );
}
