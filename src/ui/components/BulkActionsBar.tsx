"use client";
import React from "react";
import { X } from "lucide-react";

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  requiresAuth?: boolean;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  isAuthenticated?: boolean;
}

const variantClass: Record<string, string> = {
  primary:
    "bg-[var(--appkit-color-primary,theme(colors.violet.600))] text-white hover:opacity-90 btn-glow",
  secondary:
    "border border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
};

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  isAuthenticated = false,
}: BulkActionsBarProps) {
  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 transition-transform duration-300 ease-out",
        selectedCount > 0 ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      style={{ zIndex: "var(--appkit-z-modal, 1000)" }}
      aria-live="polite"
      aria-label={`${selectedCount} items selected`}
    >
      <div className="border-t border-zinc-200 dark:border-slate-700 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md px-4 py-3 shadow-2xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {selectedCount} selected
          </span>

          <div className="h-4 w-px shrink-0 bg-zinc-200 dark:bg-slate-700" />

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {actions.map((action, i) => {
              if (action.requiresAuth && !isAuthenticated) return null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  className={[
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
                    variantClass[action.variant ?? "secondary"],
                  ].join(" ")}
                >
                  {action.icon}
                  {action.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
