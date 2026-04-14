"use client";

import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { UrlTable } from "../../filters/FilterPanel";

export const EVENT_SORT_OPTIONS = [
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "-startsAt", label: "Starts Latest" },
  { value: "startsAt", label: "Starts Soonest" },
  { value: "-endsAt", label: "Ends Latest" },
  { value: "endsAt", label: "Ends Soonest" },
  { value: "-stats.totalEntries", label: "Most Entries" },
  { value: "-createdAt", label: "Newest First" },
] as const;

export interface EventFiltersProps {
  table: UrlTable;
}

export function EventFilters({ table }: EventFiltersProps) {
  const t = useTranslations("filters");

  const typeOptions = [
    { value: "sale", label: t("eventTypeSale") },
    { value: "offer", label: t("eventTypeOffer") },
    { value: "poll", label: t("eventTypePoll") },
    { value: "survey", label: t("eventTypeSurvey") },
    { value: "feedback", label: t("eventTypeFeedback") },
  ];

  const statusOptions = [
    { value: "draft", label: t("eventStatusDraft") },
    { value: "active", label: t("eventStatusActive") },
    { value: "paused", label: t("eventStatusPaused") },
    { value: "ended", label: t("eventStatusEnded") },
  ];

  const selectedType = table.get("type")
    ? table.get("type").split("|").filter(Boolean)
    : [];
  const selectedStatus = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];

  return (
    <div>
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
    </div>
  );
}
