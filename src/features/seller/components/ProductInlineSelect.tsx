"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type {
  AsyncPage,
  PaginatedSelectOption,
} from "../../../ui/components/PaginatedSelect";
import { apiClient } from "../../../http";
import {
  ADMIN_ENDPOINTS,
  SELLER_ENDPOINTS,
} from "../../../constants/api-endpoints";

type Scope = "admin" | "store";

interface ProductItem {
  id?: string;
  title?: string;
  name?: string;
  slug?: string;
}

interface BaseProps {
  /** Which API to query. "store" lists the seller's own products; "admin" lists all. */
  scope: Scope;
  placeholder?: string;
  disabled?: boolean;
  /** Filter expression appended to the request, e.g. "listingType==standard". */
  filters?: string;
  /** Override the endpoint (for store-products with a custom path, e.g. `/api/store/products`). */
  endpoint?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onChange: (v: string | null) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (v: string[]) => void;
}

export type ProductInlineSelectProps = SingleProps | MultiProps;

function endpointFor(scope: Scope, override?: string): string {
  if (override) return override;
  return scope === "admin"
    ? ADMIN_ENDPOINTS.PRODUCTS
    : SELLER_ENDPOINTS.PRODUCTS;
}

function makeLoader(scope: Scope, filters?: string, endpoint?: string) {
  const base = endpointFor(scope, endpoint);
  return async (
    query: string,
    page: number,
  ): Promise<AsyncPage<PaginatedSelectOption<string>>> => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
    });
    if (query.trim()) params.set("q", query.trim());
    if (filters) params.set("filters", filters);
    const res = await apiClient.get<{
      data?: ProductItem[];
      products?: ProductItem[];
      items?: ProductItem[];
      total?: number;
    }>(`${base}?${params.toString()}`);
    const raw = res.data ?? res.products ?? res.items ?? [];
    const items = raw.map((p) => ({
      value: String(p.id ?? p.slug ?? ""),
      label: String(p.title ?? p.name ?? p.slug ?? p.id ?? ""),
    }));
    const total = res.total ?? items.length;
    return { items, hasMore: page * 25 < total, nextPage: page + 1 };
  };
}

export function ProductInlineSelect(props: ProductInlineSelectProps) {
  const {
    scope,
    placeholder = "Search products…",
    disabled,
    filters,
    endpoint,
  } = props;
  const loader = React.useMemo(
    () => makeLoader(scope, filters, endpoint),
    [scope, filters, endpoint],
  );

  if (props.multiple) {
    return (
      <PaginatedSelect<string>
        multiple
        value={props.value}
        onChange={(v) => props.onChange(v)}
        loadOptions={loader}
        placeholder={placeholder}
        disabled={disabled}
        searchPlaceholder="Type title or slug…"
      />
    );
  }
  return (
    <PaginatedSelect<string>
      value={props.value}
      onChange={(v) => props.onChange(v)}
      loadOptions={loader}
      placeholder={placeholder}
      disabled={disabled}
      searchPlaceholder="Type title or slug…"
    />
  );
}
