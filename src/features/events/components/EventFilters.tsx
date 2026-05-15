"use client";
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { EVENT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

export type EventFilterVariant = "admin" | "seller" | "public";

export const EVENT_FILTER_KEYS = {
  admin: ["type", TABLE_KEYS.STATUS, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
  seller: ["type", TABLE_KEYS.STATUS, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
  public: ["type", TABLE_KEYS.STATUS, TABLE_KEYS.DATE_FROM, TABLE_KEYS.DATE_TO],
} as const;

export const EVENT_ADMIN_SORT_OPTIONS = [
  { value: sortBy(EVENT_FIELDS.TITLE, "ASC"), label: "Title A–Z" },
  { value: sortBy(EVENT_FIELDS.TITLE), label: "Title Z–A" },
  { value: sortBy(EVENT_FIELDS.STARTS_AT), label: "Starts Latest" },
  { value: sortBy(EVENT_FIELDS.STARTS_AT, "ASC"), label: "Starts Soonest" },
  { value: sortBy(EVENT_FIELDS.ENDS_AT), label: "Ends Latest" },
  { value: sortBy(EVENT_FIELDS.ENDS_AT, "ASC"), label: "Ends Soonest" },
  { value: "-stats.totalEntries", label: "Most Entries" },
  { value: sortBy(EVENT_FIELDS.CREATED_AT), label: "Newest First" },
] as const;

export const EVENT_SELLER_SORT_OPTIONS = EVENT_ADMIN_SORT_OPTIONS;

export const EVENT_PUBLIC_SORT_OPTIONS = [
  { value: sortBy(EVENT_FIELDS.STARTS_AT, "ASC"), label: "Starts Soonest" },
  { value: sortBy(EVENT_FIELDS.STARTS_AT), label: "Starts Latest" },
  { value: sortBy(EVENT_FIELDS.TITLE, "ASC"), label: "Title A–Z" },
  { value: "-stats.totalEntries", label: "Most Entries" },
] as const;

// Backward-compatible alias.
export const EVENT_SORT_OPTIONS = EVENT_ADMIN_SORT_OPTIONS;

export function getEventFilterKeys(
  variant: EventFilterVariant,
): readonly string[] {
  return EVENT_FILTER_KEYS[variant];
}

export function getEventSortOptions(
  variant: EventFilterVariant,
): ReadonlyArray<{
  value: string;
  label: string;
}> {
  switch (variant) {
    case "admin":
      return EVENT_ADMIN_SORT_OPTIONS;
    case "seller":
      return EVENT_SELLER_SORT_OPTIONS;
    case "public":
      return EVENT_PUBLIC_SORT_OPTIONS;
    default:
      return EVENT_PUBLIC_SORT_OPTIONS;
  }
}

export interface EventFiltersProps {
  table: UrlTable;
  variant?: EventFilterVariant;
}

export function EventFilters({ table, variant = "admin" }: EventFiltersProps) {
  const t = useTranslations("filters");

  const typeOptions = [
    { value: "sale", label: t("eventTypeSale") },
    { value: "offer", label: t("eventTypeOffer") },
    { value: "poll", label: t("eventTypePoll") },
    { value: "survey", label: t("eventTypeSurvey") },
    { value: "feedback", label: t("eventTypeFeedback") },
  ];

  const adminStatusOptions = [
    { value: "draft", label: t("eventStatusDraft") },
    { value: "active", label: t("eventStatusActive") },
    { value: "paused", label: t("eventStatusPaused") },
    { value: "ended", label: t("eventStatusEnded") },
  ];

  const publicStatusOptions = [
    { value: "active", label: t("eventStatusActive") },
    { value: "ended", label: t("eventStatusEnded") },
  ];

  const statusOptions =
    variant === "public" ? publicStatusOptions : adminStatusOptions;

  const selectedType = table.get("type")
    ? table.get("type").split("|").filter(Boolean)
    : [];
  const selectedStatus = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      <FilterFacetSection
        title={t("type")}
        options={typeOptions}
        selected={selectedType}
        onChange={(vals) => table.set("type", vals.join("|"))}
        searchable={false}
        defaultCollapsed={false}
      />

      <FilterFacetSection
        title={t("status")}
        options={statusOptions}
        selected={selectedStatus}
        onChange={(vals) => table.set("status", vals.join("|"))}
        searchable={false}
        defaultCollapsed={false}
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

      <SwitchFilter
        title={t("expired")}
        label={t("showExpiredOnly")}
        checked={table.get("showExpired") === "true"}
        onChange={(v) => table.set("showExpired", v ? "true" : "")}
      />
    </Div>
  );
}
