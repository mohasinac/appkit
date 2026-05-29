"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type {
  AsyncPage,
  PaginatedSelectOption,
} from "../../../ui/components/PaginatedSelect";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { Text } from "../../../ui";

interface GroupItem {
  id?: string;
  title?: string;
  name?: string;
  slug?: string;
  productIds?: string[];
}

interface BaseProps {
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new group" quick-create. Defaults to true. */
  allowCreate?: boolean;
  /** "store" hits /api/store/grouped-listings; "admin" hits /api/admin/grouped-listings. Defaults to "store". */
  scope?: "store" | "admin";
  /** Optional label rendered above the selector. */
  label?: string;
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

export type GroupInlineSelectProps = SingleProps | MultiProps;

function makeLoadOptions(scope: "store" | "admin") {
  const endpoint =
    scope === "admin"
      ? ADMIN_ENDPOINTS.GROUPED_LISTINGS
      : SELLER_ENDPOINTS.GROUPED_LISTINGS;
  return async function loadGroupOptions(
    query: string,
    _page: number,
  ): Promise<AsyncPage<PaginatedSelectOption<string>>> {
    const res = await apiClient.get<{
      data?: { items?: GroupItem[] };
      items?: GroupItem[];
    }>(endpoint);
    const raw = res.data?.items ?? res.items ?? [];
    const all = raw.map((g) => {
      const count = Array.isArray(g.productIds) ? g.productIds.length : 0;
      const label = g.title ?? g.name ?? g.slug ?? String(g.id ?? "");
      return {
        value: String(g.id ?? ""),
        label: count > 0 ? `${label} (${count})` : label,
      };
    });
    const q = query.trim().toLowerCase();
    const items = q ? all.filter((g) => g.label.toLowerCase().includes(q)) : all;
    return { items, hasMore: false };
  };
}

function toGroupSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.startsWith("group-") ? base : `group-${base}`;
}

async function quickCreateGroup(
  values: Record<string, unknown>,
  scope: "store" | "admin",
): Promise<PaginatedSelectOption<string>> {
  const title = String(values.title ?? "").trim();
  if (!title) throw new Error("Title is required");
  const endpoint =
    scope === "admin"
      ? ADMIN_ENDPOINTS.GROUPED_LISTINGS
      : SELLER_ENDPOINTS.GROUPED_LISTINGS;
  const res = await apiClient.post<{
    id?: string;
    data?: { id?: string };
  }>(endpoint, {
    title,
    slug: toGroupSlug(title),
    productIds: [],
    isActive: true,
    groupTheme: "generic",
  });
  const id = String(res.data?.id ?? res.id ?? "");
  if (!id) throw new Error("Created group returned no id");
  return { value: id, label: title };
}

export function GroupInlineSelect(props: GroupInlineSelectProps) {
  const {
    placeholder = "Search groups…",
    disabled,
    allowCreate = true,
    scope = "store",
    label,
  } = props;

  const loadOptions = React.useMemo(() => makeLoadOptions(scope), [scope]);

  const sharedCreate = allowCreate
    ? {
        createLabel: "group",
        drawerTitle: "Create group",
        createFields: [
          {
            name: "title",
            label: "Group title",
            type: "text" as const,
            required: true,
            placeholder: "e.g. Pokémon Starter Bundle",
          },
        ],
        onCreateSubmit: (values: Record<string, unknown>) =>
          quickCreateGroup(values, scope),
        createSubmitLabel: "Create group",
      }
    : {};

  const labelEl = label ? (
    <Text size="sm" weight="medium" className="mb-1">
      {label}
    </Text>
  ) : null;

  if (props.multiple) {
    return (
      <>
        {labelEl}
        <PaginatedSelect<string>
          multiple
          value={props.value}
          onChange={(v) => props.onChange(v)}
          loadOptions={loadOptions}
          placeholder={placeholder}
          disabled={disabled}
          {...sharedCreate}
        />
      </>
    );
  }
  return (
    <>
      {labelEl}
      <PaginatedSelect<string>
        value={props.value || null}
        onChange={(v) => props.onChange(v ?? "")}
        loadOptions={loadOptions}
        placeholder={placeholder}
        disabled={disabled}
        {...sharedCreate}
      />
    </>
  );
}
