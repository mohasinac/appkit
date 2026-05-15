"use client";
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { ORDER_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

export const ORDER_FILTER_KEYS = {
  admin: [
    TABLE_KEYS.STATUS,
    "paymentStatus",
    TABLE_KEYS.PAYOUT_STATUS,
    "minAmount",
    "maxAmount",
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ],
  seller: [
    TABLE_KEYS.STATUS,
    "paymentStatus",
    "minAmount",
    "maxAmount",
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ],
  user: [
    TABLE_KEYS.STATUS,
    "paymentStatus",
    "minAmount",
    "maxAmount",
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ],
} as const;

export const ORDER_ADMIN_SORT_OPTIONS = [
  { value: sortBy(ORDER_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(ORDER_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(ORDER_FIELDS.TOTAL_PRICE), label: "Amount: High to Low" },
  { value: sortBy(ORDER_FIELDS.TOTAL_PRICE, "ASC"), label: "Amount: Low to High" },
  { value: sortBy(ORDER_FIELDS.ORDER_DATE), label: "Order Date: Newest" },
  { value: sortBy(ORDER_FIELDS.ORDER_DATE, "ASC"), label: "Order Date: Oldest" },
  { value: sortBy(ORDER_FIELDS.USER_NAME, "ASC"), label: "Customer A–Z" },
  { value: sortBy(ORDER_FIELDS.PRODUCT_TITLE, "ASC"), label: "Product A–Z" },
] as const;

export const ORDER_SELLER_SORT_OPTIONS = [
  { value: sortBy(ORDER_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(ORDER_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(ORDER_FIELDS.TOTAL_PRICE), label: "Amount: High to Low" },
  { value: sortBy(ORDER_FIELDS.TOTAL_PRICE, "ASC"), label: "Amount: Low to High" },
  { value: sortBy(ORDER_FIELDS.ORDER_DATE), label: "Order Date: Newest" },
  { value: sortBy(ORDER_FIELDS.USER_NAME, "ASC"), label: "Customer A–Z" },
] as const;

export const ORDER_USER_SORT_OPTIONS = [
  { value: sortBy(ORDER_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(ORDER_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(ORDER_FIELDS.TOTAL_PRICE), label: "Amount: High to Low" },
  { value: sortBy(ORDER_FIELDS.TOTAL_PRICE, "ASC"), label: "Amount: Low to High" },
  { value: sortBy(ORDER_FIELDS.ORDER_DATE), label: "Order Date: Newest" },
  { value: sortBy(ORDER_FIELDS.ORDER_DATE, "ASC"), label: "Order Date: Oldest" },
] as const;

/** Controls which Sieve field set to expose in the filter UI */
export type OrderFilterVariant = "admin" | "seller" | "user";

export function getOrderFilterKeys(
  variant: OrderFilterVariant,
): readonly string[] {
  return ORDER_FILTER_KEYS[variant];
}

export function getOrderSortOptions(
  variant: OrderFilterVariant,
): ReadonlyArray<{
  value: string;
  label: string;
}> {
  switch (variant) {
    case "admin":
      return ORDER_ADMIN_SORT_OPTIONS;
    case "seller":
      return ORDER_SELLER_SORT_OPTIONS;
    case "user":
      return ORDER_USER_SORT_OPTIONS;
    default:
      return ORDER_USER_SORT_OPTIONS;
  }
}

export interface OrderFiltersProps {
  table: UrlTable;
  variant?: OrderFilterVariant;
  currencyPrefix?: string;
}

export function OrderFilters({
  table,
  variant = "admin",
  currencyPrefix = "",
}: OrderFiltersProps) {
  const t = useTranslations("filters");

  const statusOptions = [
    { value: "pending", label: t("orderStatusPending") },
    { value: "confirmed", label: t("orderStatusConfirmed") },
    { value: "shipped", label: t("orderStatusShipped") },
    { value: "delivered", label: t("orderStatusDelivered") },
    { value: "cancelled", label: t("orderStatusCancelled") },
    { value: "returned", label: t("orderStatusReturned") },
  ];

  const paymentStatusOptions = [
    { value: "pending", label: t("paymentStatusPending") },
    { value: "paid", label: t("paymentStatusPaid") },
    { value: "failed", label: t("paymentStatusFailed") },
    { value: "refunded", label: t("paymentStatusRefunded") },
  ];

  const payoutStatusOptions = [
    { value: "eligible", label: t("orderPayoutEligible") },
    { value: "requested", label: t("orderPayoutRequested") },
    { value: "paid", label: t("orderPayoutPaid") },
  ];

  const selectedStatus = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];
  const selectedPaymentStatus = table.get("paymentStatus")
    ? table.get("paymentStatus").split("|").filter(Boolean)
    : [];
  const selectedPayoutStatus = table.get("payoutStatus")
    ? table.get("payoutStatus").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      <FilterFacetSection
        title={t("status")}
        options={statusOptions}
        selected={selectedStatus}
        onChange={(vals) => table.set("status", vals.join("|"))}
        searchable={false}
        defaultCollapsed={false}
      />

      <FilterFacetSection
        title={t("paymentStatus")}
        options={paymentStatusOptions}
        selected={selectedPaymentStatus}
        onChange={(vals) => table.set("paymentStatus", vals.join("|"))}
        searchable={false}
        defaultCollapsed={true}
      />

      {variant === "admin" && (
        <FilterFacetSection
          title={t("orderPayoutStatus")}
          options={payoutStatusOptions}
          selected={selectedPayoutStatus}
          onChange={(vals) => table.set("payoutStatus", vals.join("|"))}
          searchable={false}
          defaultCollapsed={true}
        />
      )}

      <RangeFilter
        title={t("amountRange")}
        minValue={table.get("minAmount")}
        maxValue={table.get("maxAmount")}
        onMinChange={(v) => table.set("minAmount", v)}
        onMaxChange={(v) => table.set("maxAmount", v)}
        prefix={currencyPrefix}
        showSlider
        minBound={0}
        maxBound={500000}
        step={500}
        minPlaceholder={t("minAmount")}
        maxPlaceholder={t("maxAmount")}
        defaultCollapsed={true}
      />

      <RangeFilter
        title={t("dateRange")}
        type="date"
        minValue={table.get("dateFrom")}
        maxValue={table.get("dateTo")}
        onMinChange={(v) => table.set("dateFrom", v)}
        onMaxChange={(v) => table.set("dateTo", v)}
        minPlaceholder={t("minDate")}
        maxPlaceholder={t("maxDate")}
        defaultCollapsed={true}
      />
    </Div>
  );
}
