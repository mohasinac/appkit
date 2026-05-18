"use client";
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { REVIEW_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

export type ReviewFilterVariant = "admin" | "seller" | "public";

export const REVIEW_FILTER_KEYS = {
  admin: [TABLE_KEYS.STATUS, TABLE_KEYS.RATING, TABLE_KEYS.BRAND, "verified", TABLE_KEYS.FEATURED, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
  seller: [TABLE_KEYS.STATUS, TABLE_KEYS.RATING, TABLE_KEYS.BRAND, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
  public: [TABLE_KEYS.RATING, TABLE_KEYS.BRAND, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
} as const;

export const REVIEW_ADMIN_SORT_OPTIONS = [
  { value: sortBy(REVIEW_FIELDS.CREATED_AT), key: "sortNewest" },
  { value: sortBy(REVIEW_FIELDS.CREATED_AT, "ASC"), key: "sortOldest" },
  { value: sortBy(REVIEW_FIELDS.RATING), key: "sortHighestRated" },
  { value: sortBy(REVIEW_FIELDS.RATING, "ASC"), key: "sortLowestRated" },
] as const;

export const REVIEW_SELLER_SORT_OPTIONS = REVIEW_ADMIN_SORT_OPTIONS;
export const REVIEW_PUBLIC_SORT_OPTIONS = REVIEW_ADMIN_SORT_OPTIONS;

// Backward-compatible alias.
export const REVIEW_SORT_OPTIONS = REVIEW_ADMIN_SORT_OPTIONS;

export function getReviewFilterKeys(
  variant: ReviewFilterVariant,
): readonly string[] {
  return REVIEW_FILTER_KEYS[variant];
}

export function getReviewSortOptions(
  variant: ReviewFilterVariant,
): ReadonlyArray<{ value: string; key: string }> {
  switch (variant) {
    case "admin":
      return REVIEW_ADMIN_SORT_OPTIONS;
    case "seller":
      return REVIEW_SELLER_SORT_OPTIONS;
    case "public":
      return REVIEW_PUBLIC_SORT_OPTIONS;
    default:
      return REVIEW_PUBLIC_SORT_OPTIONS;
  }
}

export interface ReviewFiltersProps {
  table: UrlTable;
  /** "admin" (default) shows status, rating, verified, featured.
   *  "public" shows rating only. */
  variant?: ReviewFilterVariant;
  /** Optional brand options for filter by brand */
  brandOptions?: FacetOption[];
}

export function ReviewFilters({
  table,
  variant = "admin",
  brandOptions,
}: ReviewFiltersProps) {
  const t = useTranslations("filters");

  const statusOptions = [
    { value: "pending", label: t("reviewStatusPending") },
    { value: "approved", label: t("reviewStatusApproved") },
    { value: "rejected", label: t("reviewStatusRejected") },
  ];

  const ratingOptions = [
    { value: "5", label: t("rating5Stars") },
    { value: "4", label: t("rating4Stars") },
    { value: "3", label: t("rating3Stars") },
    { value: "2", label: t("rating2Stars") },
    { value: "1", label: t("rating1Star") },
  ];

  const selectedStatus = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];
  const selectedRating = table.get("rating")
    ? table.get("rating").split("|").filter(Boolean)
    : [];
  const isAdmin = variant === "admin";
  const showStatus = variant !== "public";

  return (
    <Div>
      {showStatus && (
        <FilterFacetSection
          title={t("status")}
          options={statusOptions}
          selected={selectedStatus}
          onChange={(vals) => table.set("status", vals.join("|"))}
          searchable={false}
          defaultCollapsed={false}
        />
      )}

      <FilterFacetSection
        title={t("rating")}
        options={ratingOptions}
        selected={selectedRating}
        onChange={(vals) => table.set("rating", vals.join("|"))}
        searchable={false}
        defaultCollapsed={variant === "admin"}
      />

      {brandOptions && brandOptions.length > 0 && (
        <FilterFacetSection
          title={t("brand")}
          options={brandOptions}
          selected={table.get("brand") ? [table.get("brand")] : []}
          onChange={(vals) => table.set("brand", vals[0] ?? "")}
          searchable={brandOptions.length > 6}
          selectionMode="single"
          defaultCollapsed={true}
        />
      )}

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

      {isAdmin && (
        <>
          <SwitchFilter
            title={t("verified")}
            label={t("showVerifiedOnly")}
            checked={table.get("verified") === "true"}
            onChange={(v: boolean) => table.set("verified", v ? "true" : "")}
          />

          <SwitchFilter
            title={t("featured")}
            label={t("showFeaturedOnly")}
            checked={table.get("featured") === "true"}
            onChange={(v: boolean) => table.set("featured", v ? "true" : "")}
          />
        </>
      )}

      <RangeFilter
        title={t("votesRange")}
        minValue={table.get("minVotes")}
        maxValue={table.get("maxVotes")}
        onMinChange={(v) => table.set("minVotes", v)}
        onMaxChange={(v) => table.set("maxVotes", v)}
        minBound={0}
        maxBound={10000}
        step={1}
        minPlaceholder={t("minVotes")}
        maxPlaceholder={t("maxVotes")}
        defaultCollapsed={true}
      />

      <SwitchFilter
        title="Media"
        label="Show reviews with photos only"
        checked={table.get("hasImages") === "true"}
        onChange={(v: boolean) => table.set("hasImages", v ? "true" : "")}
      />
    </Div>
  );
}
