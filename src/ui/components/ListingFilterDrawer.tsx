"use client";

import React from "react";
import { X } from "lucide-react";

export interface ListingFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  activeCount: number;
  children: React.ReactNode;
}

export function ListingFilterDrawer({
  open,
  onClose,
  onApply,
  onClear,
  activeCount,
  children,
}: ListingFilterDrawerProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button type="button" onClick={onClear} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">
                Clear all
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {children}
        </div>
        <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
          <button type="button" onClick={onApply} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
            Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}
