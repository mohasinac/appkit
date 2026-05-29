"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type {
  AsyncPage,
  PaginatedSelectOption,
} from "../../../ui/components/PaginatedSelect";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

interface SublistingItem {
  id?: string;
  name?: string;
  itemCode?: string;
}

interface BaseProps {
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new sub-listing" quick-create. Defaults to false (admin-only). */
  allowCreate?: boolean;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (v: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (v: string[]) => void;
}

export type SublistingInlineSelectProps = SingleProps | MultiProps;

async function loadSublistingOptions(
  query: string,
  page: number,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "25",
    sorts: "name",
  });
  if (query.trim()) params.set("q", query.trim());
  const res = await apiClient.get<{
    data?: { items?: SublistingItem[]; total?: number; hasMore?: boolean };
    items?: SublistingItem[];
    total?: number;
    hasMore?: boolean;
  }>(`${ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES}?${params.toString()}`);
  const raw = res.data?.items ?? res.items ?? [];
  const items = raw.map((item) => ({
    value: String(item.id ?? ""),
    label: item.itemCode
      ? `${item.name ?? item.id} (${item.itemCode})`
      : String(item.name ?? item.id ?? ""),
  }));
  const total = res.data?.total ?? res.total ?? items.length;
  const hasMore = res.data?.hasMore ?? res.hasMore ?? page * 25 < total;
  return { items, hasMore, nextPage: page + 1 };
}

function toSublistingSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.startsWith("sublisting-") ? base : `sublisting-${base}`;
}

async function quickCreateSublisting(
  values: Record<string, unknown>,
): Promise<PaginatedSelectOption<string>> {
  const name = String(values.name ?? "").trim();
  const itemCode = String(values.itemCode ?? "").trim();
  if (!name) throw new Error("Name is required");
  const payload: Record<string, unknown> = {
    name,
    slug: toSublistingSlug(name),
  };
  if (itemCode) payload.itemCode = itemCode;
  const res = await apiClient.post<{
    id?: string;
    data?: { id?: string };
  }>(ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES, payload);
  const id = String(res.data?.id ?? res.id ?? "");
  if (!id) throw new Error("Created sub-listing returned no id");
  return {
    value: id,
    label: itemCode ? `${name} (${itemCode})` : name,
  };
}

export function SublistingInlineSelect(props: SublistingInlineSelectProps) {
  const {
    placeholder = "Search sub-listings…",
    disabled,
    allowCreate = false,
  } = props;

  const sharedCreate = allowCreate
    ? {
        createLabel: "sub-listing",
        drawerTitle: "Create sub-listing",
        createFields: [
          {
            name: "name",
            label: "Name",
            type: "text" as const,
            required: true,
            placeholder: "e.g. Base Set Charizard 108/120",
          },
          {
            name: "itemCode",
            label: "Item code (optional)",
            type: "text" as const,
            placeholder: "e.g. BS-CHAR-108",
          },
        ],
        onCreateSubmit: quickCreateSublisting,
        createSubmitLabel: "Create sub-listing",
      }
    : {};

  if (props.multiple) {
    return (
      <PaginatedSelect<string>
        multiple
        value={props.value}
        onChange={(v) => props.onChange(v)}
        loadOptions={loadSublistingOptions}
        placeholder={placeholder}
        disabled={disabled}
        {...sharedCreate}
      />
    );
  }
  return (
    <PaginatedSelect<string>
      value={props.value || null}
      onChange={(v) => props.onChange(v ?? "")}
      loadOptions={loadSublistingOptions}
      placeholder={placeholder}
      disabled={disabled}
      {...sharedCreate}
    />
  );
}
