"use client";

import { useState } from "react";
import { Div } from "@mohasinac/ui";
import { FilterFacetSection } from "./FilterFacetSection";
import type { FacetOption } from "./FilterFacetSection";
import { RangeFilter } from "./RangeFilter";
import { SwitchFilter } from "./SwitchFilter";

// ─── UrlTable interface ───────────────────────────────────────────────────────

export interface UrlTable {
  get(key: string): string;
  set(key: string, value: string): void;
  setMany(updates: Record<string, string>): void;
}

// ─── FilterConfig discriminated union ────────────────────────────────────────

export interface FacetSingleConfig {
  type: "facet-single";
  key: string;
  title: string;
  options: FacetOption[];
  defaultCollapsed?: boolean;
  searchable?: boolean;
}

export interface FacetMultiConfig {
  type: "facet-multi";
  key: string;
  title: string;
  options: FacetOption[];
  defaultCollapsed?: boolean;
  searchable?: boolean;
}

export interface SwitchConfig {
  type: "switch";
  key: string;
  title: string;
  label: string;
  defaultCollapsed?: boolean;
}

export interface RangeNumberConfig {
  type: "range-number";
  minKey: string;
  maxKey: string;
  title: string;
  prefix?: string;
  minLabel?: string;
  maxLabel?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  showSlider?: boolean;
  minBound?: number;
  maxBound?: number;
  step?: number;
  defaultCollapsed?: boolean;
}

export interface RangeDateConfig {
  type: "range-date";
  fromKey: string;
  toKey: string;
  title: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  defaultCollapsed?: boolean;
}

export type FilterConfig =
  | FacetSingleConfig
  | FacetMultiConfig
  | SwitchConfig
  | RangeNumberConfig
  | RangeDateConfig;

// ─── FilterPanel ─────────────────────────────────────────────────────────────

export interface FilterPanelProps {
  config: FilterConfig[];
  table: UrlTable;
  className?: string;
}

export function FilterPanel({
  config,
  table,
  className = "",
}: FilterPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(() =>
    config.findIndex(
      (c) => !(c as { defaultCollapsed?: boolean }).defaultCollapsed,
    ),
  );

  const handleToggle = (idx: number) =>
    setExpandedIndex((prev) => (prev === idx ? null : idx));

  return (
    <Div className={className}>
      {config.map((item, idx) => {
        const isOpen = expandedIndex === idx;

        switch (item.type) {
          case "facet-single": {
            const value = table.get(item.key);
            const selected = value ? [value] : [];
            return (
              <FilterFacetSection
                key={`${item.type}-${item.key}`}
                title={item.title}
                options={item.options}
                selectionMode="single"
                selected={selected}
                defaultCollapsed={item.defaultCollapsed}
                searchable={item.searchable}
                isOpen={isOpen}
                onToggle={() => handleToggle(idx)}
                onClear={() => table.set(item.key, "")}
                onChange={(vals: string[]) =>
                  table.set(item.key, vals[0] ?? "")
                }
              />
            );
          }

          case "facet-multi": {
            const raw = table.get(item.key);
            const selected = raw ? raw.split(",").filter(Boolean) : [];
            return (
              <FilterFacetSection
                key={`${item.type}-${item.key}`}
                title={item.title}
                options={item.options}
                selectionMode="multi"
                selected={selected}
                defaultCollapsed={item.defaultCollapsed}
                searchable={item.searchable}
                isOpen={isOpen}
                onToggle={() => handleToggle(idx)}
                onClear={() => table.set(item.key, "")}
                onChange={(vals: string[]) =>
                  table.set(item.key, vals.join(","))
                }
              />
            );
          }

          case "switch": {
            const checked = table.get(item.key) === "true";
            return (
              <SwitchFilter
                key={`${item.type}-${item.key}`}
                title={item.title}
                label={item.label}
                checked={checked}
                onChange={(v) => table.set(item.key, v ? "true" : "")}
                defaultCollapsed={item.defaultCollapsed}
                isOpen={isOpen}
                onToggle={() => handleToggle(idx)}
                onClear={() => table.set(item.key, "")}
              />
            );
          }

          case "range-number": {
            const min = table.get(item.minKey);
            const max = table.get(item.maxKey);
            return (
              <RangeFilter
                key={`${item.type}-${item.minKey}-${item.maxKey}`}
                title={item.title}
                type="number"
                minValue={min}
                maxValue={max}
                onMinChange={(v) => table.set(item.minKey, v)}
                onMaxChange={(v) => table.set(item.maxKey, v)}
                prefix={item.prefix}
                minLabel={item.minLabel}
                maxLabel={item.maxLabel}
                minPlaceholder={item.minPlaceholder}
                maxPlaceholder={item.maxPlaceholder}
                showSlider={item.showSlider}
                minBound={item.minBound}
                maxBound={item.maxBound}
                step={item.step}
                defaultCollapsed={item.defaultCollapsed}
                isOpen={isOpen}
                onToggle={() => handleToggle(idx)}
                onClear={() =>
                  table.setMany({ [item.minKey]: "", [item.maxKey]: "" })
                }
              />
            );
          }

          case "range-date": {
            const from = table.get(item.fromKey);
            const to = table.get(item.toKey);
            return (
              <RangeFilter
                key={`${item.type}-${item.fromKey}-${item.toKey}`}
                title={item.title}
                type="date"
                minValue={from}
                maxValue={to}
                onMinChange={(v) => table.set(item.fromKey, v)}
                onMaxChange={(v) => table.set(item.toKey, v)}
                minPlaceholder={item.minPlaceholder}
                maxPlaceholder={item.maxPlaceholder}
                defaultCollapsed={item.defaultCollapsed}
                isOpen={isOpen}
                onToggle={() => handleToggle(idx)}
                onClear={() =>
                  table.setMany({ [item.fromKey]: "", [item.toKey]: "" })
                }
              />
            );
          }
        }
      })}
    </Div>
  );
}
