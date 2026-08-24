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
import {
  ALL_EVENT_STATUSES,
  ALL_EVENT_TYPES,
  type EventStatus,
  type EventType,
} from "../types";

export type EventFilterVariant = "admin" | "seller" | "public";

/**
 * `sale` -> `eventTypeSale`, `spin_wheel` -> `eventTypeSpinWheel`.
 *
 * Derived rather than a lookup map so a new union member cannot be silently
 * label-less; a missing i18n key surfaces as the key itself, which is loud.
 */
function pascal(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
function eventTypeLabelKey(value: EventType): string {
  return `eventType${pascal(value)}`;
}
function eventStatusLabelKey(value: EventStatus): string {
  return `eventStatus${pascal(value)}`;
}

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
  { value: sortBy("stats.totalEntries", "DESC"), label: "Most Entries" },
  { value: sortBy(EVENT_FIELDS.CREATED_AT), label: "Newest First" },
] as const;

export const EVENT_SELLER_SORT_OPTIONS = EVENT_ADMIN_SORT_OPTIONS;

export const EVENT_PUBLIC_SORT_OPTIONS = [
  { value: sortBy(EVENT_FIELDS.STARTS_AT, "ASC"), label: "Starts Soonest" },
  { value: sortBy(EVENT_FIELDS.STARTS_AT), label: "Starts Latest" },
  { value: sortBy(EVENT_FIELDS.TITLE, "ASC"), label: "Title A–Z" },
  { value: sortBy(EVENT_FIELDS.TITLE), label: "Title Z–A" },
  { value: sortBy("stats.totalEntries", "DESC"), label: "Most Entries" },
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
  /**
   * Matching-row counts keyed by event type AND status value. Optional — when
   * absent every facet renders uncounted and nothing is hidden, which is the
   * pre-existing behaviour.
   */
  counts?: Record<string, number | undefined>;
  /** Drop facets whose count is 0. Requires `counts`. */
  hideEmpty?: boolean;
}

export function EventFilters({
  table,
  variant = "admin",
  counts,
  hideEmpty = false,
}: EventFiltersProps) {
  const t = useTranslations("filters");

  // Derived from the unions, not hand-listed. The previous literals were
  // missing `lottery` (type) and `cancelled` (admin status) — a facet that
  // doesn't exist can never be selected, so those events were unfilterable
  // (Root Cause #61).
  const typeOptions = ALL_EVENT_TYPES.map((value) => ({
    value,
    label: t(eventTypeLabelKey(value)),
    count: counts?.[value],
  }));

  const adminStatusOptions = ALL_EVENT_STATUSES.map((value) => ({
    value,
    label: t(eventStatusLabelKey(value)),
    count: counts?.[value],
  }));

  // Deliberately narrower than the union: a shopper has no use for draft,
  // paused or cancelled events, and the public list query only ever returns
  // active ones anyway. Kept as an explicit subset of ALL_EVENT_STATUSES so it
  // is a documented omission rather than another drifted literal.
  const PUBLIC_STATUSES: EventStatus[] = ["active", "ended"];
  const publicStatusOptions = PUBLIC_STATUSES.map((value) => ({
    value,
    label: t(eventStatusLabelKey(value)),
    count: counts?.[value],
  }));

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
        hideEmpty={hideEmpty}
      />

      <FilterFacetSection
        title={t("status")}
        options={statusOptions}
        selected={selectedStatus}
        onChange={(vals) => table.set("status", vals.join("|"))}
        hideEmpty={hideEmpty}
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
