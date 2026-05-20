"use client";
// S-STORE — Filter drawer for SellerProductsView. Extracted so the main
// component stays under the 150-line code-quality threshold.

import React from "react";
import { X } from "lucide-react";
import { Button, Div, FilterChipGroup, Row, Text } from "../../../ui";
import { INPUT_CLS, FILTER_LABEL_CLS } from "./seller-products-styles";
import { CategoryInlineSelect } from "./CategoryInlineSelect";
import { BrandInlineSelect } from "./BrandInlineSelect";

const HALF_INPUT_CLS = INPUT_CLS.replace("w-full", "w-1/2");

const CONDITION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "mint", label: "Mint" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
  { value: "for-parts", label: "For parts" },
] as const;

export interface SellerProductsFilterDrawerProps {
  isOpen: boolean;
  pendingFilters: Record<string, string>;
  statusOptions: ReadonlyArray<{ id: string; label: string }>;
  activeFilterCount: number;
  onChange: (next: Record<string, string>) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
}

export function SellerProductsFilterDrawer({
  isOpen,
  pendingFilters,
  statusOptions,
  activeFilterCount,
  onChange,
  onClear,
  onApply,
  onClose,
}: SellerProductsFilterDrawerProps) {
  if (!isOpen) return null;
  const patch = (k: string, v: string) => onChange({ ...pendingFilters, [k]: v });
  return (
    <>
      <Div
        role="presentation"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <Div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[var(--appkit-color-surface)] shadow-2xl">
        <Row justify="between" className="border-b border-[var(--appkit-color-border)] px-4 py-3.5">
          <Text className="text-base font-semibold text-[var(--appkit-color-text)]">Filters</Text>
          <Row className="gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-xs text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-error)]"
              >
                Clear all
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close filters">
              <X className="h-5 w-5" />
            </Button>
          </Row>
        </Row>
        <Div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <FilterChipGroup
            label="Status"
            tabs={statusOptions}
            value={pendingFilters.status ?? ""}
            onChange={(id) => patch("status", id)}
          />
          <Div className="space-y-1.5">
            <Text className={FILTER_LABEL_CLS}>Category</Text>
            <CategoryInlineSelect
              value={pendingFilters.category ?? ""}
              onChange={(v) => patch("category", v)}
              placeholder="Search categories…"
            />
          </Div>
          <Div className="space-y-1.5">
            <Text className={FILTER_LABEL_CLS}>Brand</Text>
            <BrandInlineSelect
              value={pendingFilters.brand ?? ""}
              onChange={(v) => patch("brand", v)}
              placeholder="Search brands…"
              allowCreate={false}
            />
          </Div>
          <Div className="space-y-1.5">
            <Text className={FILTER_LABEL_CLS}>Condition</Text>
            <select
              value={pendingFilters.condition ?? ""}
              onChange={(e) => patch("condition", e.target.value)}
              className={INPUT_CLS}
            >
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Div>
          <Div className="space-y-1.5">
            <Text className={FILTER_LABEL_CLS}>Price (₹ Rupees)</Text>
            <Row className="gap-2">
              <input
                type="number"
                min={0}
                value={pendingFilters.minPrice ?? ""}
                onChange={(e) => patch("minPrice", e.target.value)}
                placeholder="min"
                className={HALF_INPUT_CLS}
              />
              <input
                type="number"
                min={0}
                value={pendingFilters.maxPrice ?? ""}
                onChange={(e) => patch("maxPrice", e.target.value)}
                placeholder="max"
                className={HALF_INPUT_CLS}
              />
            </Row>
          </Div>
          <Div className="space-y-1.5">
            <Text className={FILTER_LABEL_CLS}>Tags (comma-separated)</Text>
            <input
              type="text"
              value={pendingFilters.tags ?? ""}
              onChange={(e) => patch("tags", e.target.value)}
              placeholder="pokemon, vintage, holo"
              className={INPUT_CLS}
            />
          </Div>
          <Div className="space-y-1.5">
            <Text className={FILTER_LABEL_CLS}>Badges (feature slugs)</Text>
            <input
              type="text"
              value={pendingFilters.badges ?? ""}
              onChange={(e) => patch("badges", e.target.value)}
              placeholder="feature-free-shipping, feature-verified"
              className={INPUT_CLS}
            />
          </Div>
        </Div>
        <Div className="border-t border-[var(--appkit-color-border)] px-4 py-3.5">
          <Button
            variant="primary"
            onClick={onApply}
            className="w-full rounded-lg py-2.5 active:scale-[0.98]"
          >
            Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </Div>
      </Div>
    </>
  );
}
