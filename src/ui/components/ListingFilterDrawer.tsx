"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

const CLS_CLEAR_BTN = "text-xs text-zinc-500 hover:text-error dark:text-zinc-400 transition-colors min-h-0 h-auto p-0";

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
              <Button variant="ghost" type="button" onClick={onClear} className={CLS_CLEAR_BTN}>
                Clear all
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-0 h-auto">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {children}
        </div>
        <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
          <Button type="button" onClick={onApply} className="w-full">
            Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </div>
    </>
  );
}
