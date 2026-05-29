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

interface CouponItem {
  id?: string;
  code?: string;
  name?: string;
}

interface BaseProps {
  /** Which API to query. "store" hits the seller's own coupons; "admin" hits the admin pool. */
  scope: Scope;
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new coupon" quick-create (store scope only — admin coupons are too complex for inline create). Defaults to scope === "store". */
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

export type CouponInlineSelectProps = SingleProps | MultiProps;

function makeLoader(scope: Scope) {
  const endpoint =
    scope === "admin" ? ADMIN_ENDPOINTS.COUPONS : SELLER_ENDPOINTS.COUPONS;
  return async (
    query: string,
    page: number,
  ): Promise<AsyncPage<PaginatedSelectOption<string>>> => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      sorts: "-createdAt",
    });
    if (query.trim()) params.set("q", query.trim());
    const res = await apiClient.get<{
      data?: CouponItem[];
      coupons?: CouponItem[];
      items?: CouponItem[];
      total?: number;
    }>(`${endpoint}?${params.toString()}`);
    const raw = res.data ?? res.coupons ?? res.items ?? [];
    const items = raw.map((c) => ({
      value: String(c.id ?? c.code ?? ""),
      label: c.code
        ? `${c.code}${c.name && c.name !== c.code ? ` — ${c.name}` : ""}`
        : String(c.name ?? c.id ?? ""),
    }));
    const total = res.total ?? items.length;
    return { items, hasMore: page * 25 < total, nextPage: page + 1 };
  };
}

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);
const NEXT_YEAR_ISO = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

async function quickCreateStoreCoupon(
  values: Record<string, unknown>,
): Promise<PaginatedSelectOption<string>> {
  const code = String(values.code ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const valueNum = Number(values.value ?? 0);
  const type = String(values.type ?? "percentage") as
    | "percentage"
    | "fixed"
    | "free_shipping";
  if (!code) throw new Error("Code is required");
  if (type === "percentage" && (valueNum < 1 || valueNum > 100)) {
    throw new Error("Percentage must be between 1 and 100");
  }
  const res = await apiClient.post<{
    data?: { id?: string; code?: string };
    id?: string;
  }>(SELLER_ENDPOINTS.COUPONS, {
    code,
    type,
    value: valueNum,
    totalLimit: 0,
    perUserLimit: 0,
    startDate: TODAY_ISO(),
    endDate: NEXT_YEAR_ISO(),
    isActive: true,
  });
  const id = String(res.data?.id ?? res.id ?? "");
  if (!id) throw new Error("Created coupon returned no id");
  return { value: id, label: code };
}

export function CouponInlineSelect(props: CouponInlineSelectProps) {
  const {
    scope,
    placeholder = "Search coupons…",
    disabled,
    allowCreate = scope === "store",
  } = props;
  const loader = React.useMemo(() => makeLoader(scope), [scope]);

  const sharedCreate =
    allowCreate && scope === "store"
      ? {
          createLabel: "coupon",
          drawerTitle: "Create coupon",
          createFields: [
            {
              name: "code",
              label: "Code",
              type: "text" as const,
              required: true,
              placeholder: "e.g. SAVE10",
            },
            {
              name: "type",
              label: "Type",
              type: "select" as const,
              required: true,
              options: [
                { value: "percentage", label: "Percentage off" },
                { value: "fixed", label: "Flat amount off (₹)" },
                { value: "free_shipping", label: "Free shipping" },
              ],
            },
            {
              name: "value",
              label: "Value (% for percentage, ₹ for flat)",
              type: "number" as const,
              required: true,
              placeholder: "10",
            },
          ],
          onCreateSubmit: quickCreateStoreCoupon,
          createSubmitLabel: "Create coupon",
        }
      : {};

  if (props.multiple) {
    return (
      <PaginatedSelect<string>
        multiple
        value={props.value}
        onChange={(v) => props.onChange(v)}
        loadOptions={loader}
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
      loadOptions={loader}
      placeholder={placeholder}
      disabled={disabled}
      {...sharedCreate}
    />
  );
}
