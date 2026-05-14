"use client";
import React, { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Pagination, SortDropdown, Div, Text, Heading } from "../../../ui";
import { usePromotions } from "../hooks/usePromotions";
import { CouponCard } from "./CouponCard";
import type { CouponType } from "../types";

const COUPON_SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "-name", label: "Name Z–A" },
  { value: "-validity.endDate", label: "Expiring Soon" },
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
];

const COUPON_TYPES: { value: CouponType; label: string }[] = [
  { value: "percentage", label: "% Off" },
  { value: "fixed", label: "Fixed Amount" },
  { value: "free_shipping", label: "Free Shipping" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
];

export interface CouponsIndexListingProps {
  /** Pre-fetched coupons to show on first render */
  initialCoupons?: any[];
  /** If set, only show coupons from this store (slug, for display) */
  storeSlug?: string;
  /** If set, only show coupons from this store (id, for filtering) */
  storeId?: string;
}

export function CouponsIndexListing({
  initialCoupons,
  storeSlug,
  storeId,
}: CouponsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: "12", sort: "-createdAt" } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);

  // Build Sieve filter string
  const buildFilters = () => {
    const parts: string[] = ["validity.isActive==true"];
    const typeFilter = table.get("type");
    if (typeFilter) parts.push(`type==${typeFilter}`);
    const dateFrom = table.get("dateFrom");
    if (dateFrom) parts.push(`validity.startDate>=${dateFrom}`);
    const dateTo = table.get("dateTo");
    if (dateTo) parts.push(`validity.endDate<=${dateTo}`);
    if (storeId) parts.push(`storeId==${storeId}`);
    return parts.join(",");
  };

  const { promotions: coupons, total, totalPages, isLoading } = usePromotions({
    page: table.getNumber("page", 1),
    pageSize: table.getNumber("pageSize", 12),
    sort: table.get("sort") || "-createdAt",
    filters: buildFilters(),
  });

  // Use initial data on first load if available and no search/filter active
  const displayCoupons =
    !isLoading && coupons.length > 0
      ? coupons
      : !isLoading && initialCoupons && !table.get("q") && !table.get("type")
        ? initialCoupons
        : coupons;

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
    table.setPage(1);
  }, [searchInput, table]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch();
  };


  const activeType = table.get("type") as CouponType | "";
  const hasActiveFilters = !!activeType || !!table.get("dateFrom") || !!table.get("dateTo");

  const clearFilters = () => {
    table.set("type", "");
    table.set("dateFrom", "");
    table.set("dateTo", "");
    table.setPage(1);
  };

  return (
    <div className="min-h-[40vh]">
      {/* ── Sticky toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-[var(--header-height,0px)] z-20 border-b border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2.5 px-4">
        <div className="flex items-center gap-2.5 max-w-full">
          {/* Filters button */}
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? "border-primary bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters{hasActiveFilters ? " •" : ""}</span>
          </button>

          {/* Search */}
          <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or description…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); table.set("q", ""); }}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={commitSearch}
              className="flex shrink-0 items-center justify-center px-3 py-2 text-zinc-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Sort */}
          <div className="flex shrink-0 items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden md:inline whitespace-nowrap">Sort by</span>
            <SortDropdown
              value={table.get("sort") || "-createdAt"}
              onChange={(v) => { table.set("sort", v); }}
              options={COUPON_SORT_OPTIONS as any}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {activeType && (
              <span className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium px-2.5 py-1">
                {COUPON_TYPES.find((t) => t.value === activeType)?.label ?? activeType}
                <button type="button" onClick={() => { table.set("type", ""); }} aria-label="Remove type filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {table.get("dateFrom") && (
              <span className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium px-2.5 py-1">
                From: {table.get("dateFrom")}
                <button type="button" onClick={() => { table.set("dateFrom", ""); }} aria-label="Remove from-date filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {table.get("dateTo") && (
              <span className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium px-2.5 py-1">
                To: {table.get("dateTo")}
                <button type="button" onClick={() => { table.set("dateTo", ""); }} aria-label="Remove to-date filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Coupon grid ─────────────────────────────────────────────────── */}
      <div className="py-6 px-4">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border-2 border-zinc-100 dark:border-slate-700 p-4 animate-pulse space-y-3"
              >
                <div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayCoupons.length === 0 ? (
          <div className="py-16 text-center">
            <Text className="text-zinc-400 dark:text-zinc-500">No coupons match your search.</Text>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {displayCoupons.map((coupon: any) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                labels={{
                  copy: "Copy",
                  copied: "Copied!",
                  expires: "Expires",
                  minOrder: "Min. order",
                  off: "OFF",
                  freeShipping: "Free Shipping",
                }}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={table.getNumber("page", 1)}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}

        {!isLoading && total > 0 && (
          <Div className="mt-4 text-center">
            <Text className="text-xs text-zinc-400 dark:text-zinc-500">{total} coupon{total !== 1 ? "s" : ""} available</Text>
          </Div>
        )}
      </div>

      {/* ── Filter Drawer ──────────────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable filter body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Coupon type */}
              <div>
                <Heading level={6} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                  Discount Type
                </Heading>
                <div className="space-y-2">
                  {COUPON_TYPES.map((t) => (
                    <label key={t.value} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="radio"
                        name="coupon-type"
                        value={t.value}
                        checked={table.get("type") === t.value}
                        onChange={() => { table.set("type", t.value); }}
                        className="accent-primary"
                      />
                      {t.label}
                    </label>
                  ))}
                  {table.get("type") && (
                    <button
                      type="button"
                      onClick={() => { table.set("type", ""); }}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
                    >
                      Clear type
                    </button>
                  )}
                </div>
              </div>

              {/* Date range */}
              <div>
                <Heading level={6} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                  Valid Date Range
                </Heading>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">From date</label>
                    <input
                      type="date"
                      value={table.get("dateFrom") || ""}
                      onChange={(e) => { table.set("dateFrom", e.target.value); }}
                      className="w-full rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">To date</label>
                    <input
                      type="date"
                      value={table.get("dateTo") || ""}
                      onChange={(e) => { table.set("dateTo", e.target.value); }}
                      className="w-full rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5 flex gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 rounded-lg border border-zinc-300 dark:border-slate-600 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
