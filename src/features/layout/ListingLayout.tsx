"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Aside, Button, Nav } from "@mohasinac/ui";

export interface ListingLayoutLabels {
  filtersTitle?: string;
  showFilters?: string;
  hideFilters?: string;
  clearAll?: string;
  applyFilters?: string;
  close?: string;
}

export interface ListingLayoutProps {
  headerSlot?: ReactNode;
  statusTabsSlot?: ReactNode;
  filterContent?: ReactNode;
  filterActiveCount?: number;
  onFilterApply?: () => void;
  onFilterClear?: () => void;
  filterTitle?: string;
  activeFiltersSlot?: ReactNode;
  searchSlot?: ReactNode;
  sortSlot?: ReactNode;
  viewToggleSlot?: ReactNode;
  actionsSlot?: ReactNode;
  selectedCount?: number;
  toolbarPaginationSlot?: ReactNode;
  paginationSlot?: ReactNode;
  children: ReactNode;
  defaultSidebarOpen?: boolean;
  className?: string;
  errorSlot?: ReactNode;
  isDashboard?: boolean;
  labels?: ListingLayoutLabels;
  bulkActionBarSlot?: ReactNode;
}

export function ListingLayout({
  headerSlot,
  statusTabsSlot,
  filterContent,
  filterActiveCount = 0,
  onFilterApply,
  onFilterClear,
  filterTitle,
  activeFiltersSlot,
  searchSlot,
  sortSlot,
  viewToggleSlot,
  actionsSlot,
  selectedCount = 0,
  toolbarPaginationSlot,
  paginationSlot,
  children,
  defaultSidebarOpen = false,
  className = "",
  errorSlot,
  isDashboard = false,
  labels,
  bulkActionBarSlot,
}: ListingLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  const hasFilter = Boolean(filterContent);
  const l = {
    filtersTitle: labels?.filtersTitle ?? "Filters",
    showFilters: labels?.showFilters ?? "Show filters",
    hideFilters: labels?.hideFilters ?? "Hide filters",
    clearAll: labels?.clearAll ?? "Clear all",
    applyFilters: labels?.applyFilters ?? "Apply filters",
    close: labels?.close ?? "Close",
  };

  const panelTitle = filterTitle ?? l.filtersTitle;

  useEffect(() => {
    if (!mobileFilterOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileFilterOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [mobileFilterOpen]);

  useEffect(() => {
    if (mobileFilterOpen) {
      const w = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${w}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [mobileFilterOpen]);

  const handleMobileApply = () => {
    onFilterApply?.();
    setMobileFilterOpen(false);
  };

  return (
    <div
      className={[
        "w-full space-y-4",
        toolbarPaginationSlot
          ? selectedCount > 0
            ? "pb-28 md:pb-0"
            : "pb-12 md:pb-0"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {headerSlot}

      {statusTabsSlot && (
        <div className="overflow-x-auto touch-pan-x -mx-4 px-4 md:-mx-6 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {statusTabsSlot}
        </div>
      )}

      <div
        className={[
          "sticky z-20 -mx-4 px-4 md:-mx-6 md:px-6",
          isDashboard ? "top-0" : "top-14 md:top-[120px]",
          "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md",
          "border-b border-zinc-200/70 dark:border-slate-800/70",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
          "py-2.5",
        ].join(" ")}
      >
        <div className="hidden md:flex items-center gap-2 min-w-0">
          {hasFilter && (
            <Button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? l.hideFilters : l.showFilters}
              aria-expanded={sidebarOpen}
              variant="ghost"
              size="sm"
              className={[
                "hidden lg:flex flex-shrink-0 items-center gap-1.5",
                "rounded-full h-8 px-3 text-sm font-medium",
                "border transition-all duration-150",
                sidebarOpen
                  ? "bg-primary/10 border-primary/30 text-primary dark:bg-primary/15 dark:border-primary/40"
                  : "border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-slate-300 hover:border-zinc-300 dark:hover:border-slate-600 hover:bg-zinc-50 dark:hover:bg-slate-800/60",
              ].join(" ")}
            >
              {l.filtersTitle}
              {filterActiveCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-white">
                  {filterActiveCount}
                </span>
              )}
            </Button>
          )}

          {searchSlot && <div className="flex-1 min-w-0">{searchSlot}</div>}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sortSlot}
            {viewToggleSlot && (
              <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
                {viewToggleSlot}
              </div>
            )}
            {actionsSlot}
          </div>

          {toolbarPaginationSlot && (
            <div className="ml-auto flex-shrink-0 pl-3 border-l border-zinc-200/70 dark:border-slate-700/70">
              {toolbarPaginationSlot}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center gap-2">
            {hasFilter && (
              <Button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                aria-label={l.filtersTitle}
                variant="ghost"
                size="sm"
                className={[
                  "flex-shrink-0 flex items-center gap-1.5",
                  "rounded-full h-9 px-3 text-sm font-medium",
                  "border border-zinc-200 dark:border-slate-700",
                  "text-zinc-600 dark:text-slate-300",
                  "hover:bg-zinc-50 dark:hover:bg-slate-800/60 transition-colors",
                  filterActiveCount > 0
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "",
                ].join(" ")}
              >
                {l.filtersTitle}
                {filterActiveCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-white">
                    {filterActiveCount}
                  </span>
                )}
              </Button>
            )}
            {searchSlot && <div className="flex-1 min-w-0">{searchSlot}</div>}
          </div>

          {(sortSlot || viewToggleSlot || actionsSlot) && (
            <div className="flex items-stretch min-h-[44px] gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-2 flex-shrink-0 pb-px">
                {sortSlot}
                {viewToggleSlot}
                {actionsSlot}
              </div>
            </div>
          )}
        </div>

        {selectedCount > 0 && bulkActionBarSlot && (
          <div className="hidden md:block pt-2 mt-2 border-t border-zinc-100 dark:border-slate-800">
            {bulkActionBarSlot}
          </div>
        )}
      </div>

      <div className="flex gap-4 lg:gap-6 items-start">
        {hasFilter && (
          <Aside
            aria-label={panelTitle}
            className={[
              "hidden lg:block flex-shrink-0 self-start",
              isDashboard ? "sticky top-16" : "sticky top-[176px]",
              "transition-all duration-200 ease-in-out overflow-hidden",
              sidebarOpen
                ? "w-60 xl:w-64 2xl:w-72 opacity-100"
                : "w-0 opacity-0 pointer-events-none",
            ].join(" ")}
          >
            <div className="w-60 xl:w-64 2xl:w-72 rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-slate-800">
                <div className="font-semibold text-sm">{panelTitle}</div>
                {filterActiveCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onFilterClear}
                    className="text-xs text-primary hover:text-primary/80 hover:underline p-0 h-auto leading-none font-medium"
                  >
                    {l.clearAll}
                  </Button>
                )}
              </div>

              <div className="px-3 pt-5 pb-3 max-h-[calc(100vh-15rem)] overflow-y-auto space-y-4">
                {filterContent}
              </div>

              <div className="px-3 pb-3 pt-2 border-t border-zinc-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full rounded-xl bg-primary text-white py-2 px-3"
                  onClick={onFilterApply}
                >
                  {l.applyFilters}
                </Button>
              </div>
            </div>
          </Aside>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          {activeFiltersSlot}

          {errorSlot ? (
            errorSlot
          ) : (
            <>
              {children}
              {paginationSlot && <div className="pt-2">{paginationSlot}</div>}
            </>
          )}
        </div>
      </div>

      {toolbarPaginationSlot && (
        <Nav
          aria-label="Pagination"
          className={[
            "fixed left-0 right-0 md:hidden",
            isDashboard
              ? "bottom-0"
              : selectedCount > 0
                ? "bottom-28"
                : "bottom-14",
            "z-[39]",
            "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md",
            "shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.20)]",
            "h-10 flex items-center justify-center px-3 overflow-x-auto pb-px",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          ].join(" ")}
        >
          {toolbarPaginationSlot}
        </Nav>
      )}

      {hasFilter && mobileFilterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={mobileOverlayRef}
            className="fixed inset-0 z-50 flex flex-col lg:hidden bg-white dark:bg-slate-950"
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-slate-800 flex-shrink-0">
              <div className="font-semibold">
                {panelTitle}
                {filterActiveCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-primary text-white">
                    {filterActiveCount}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMobileFilterOpen(false)}
                aria-label={l.close}
                className="rounded-full w-8 h-8 p-0 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-slate-800"
              >
                x
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-4">
              {filterContent}
            </div>

            <div className="flex-shrink-0 flex gap-3 px-4 py-4 border-t border-zinc-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl bg-zinc-200 dark:bg-slate-700 py-2 px-3"
                onClick={() => {
                  onFilterClear?.();
                }}
              >
                {l.clearAll}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 rounded-xl bg-primary text-white py-2 px-3"
                onClick={handleMobileApply}
              >
                {l.applyFilters}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
