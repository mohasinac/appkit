"use client";
import React from "react";
import { ShoppingCart, Heart, X } from "lucide-react";

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

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  isAuthenticated = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const variantClass: Record<string, string> = {
    primary:
      "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20",
    secondary:
      "border border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-slate-800",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2.5 shadow-xl">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mr-1">
          {selectedCount} selected
        </span>

        <div className="h-4 w-px bg-zinc-200 dark:bg-slate-700" />

        {actions.map((action, i) => {
          if (action.requiresAuth && !isAuthenticated) return null;
          return (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              className={[
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
                variantClass[action.variant ?? "secondary"],
              ].join(" ")}
            >
              {action.icon}
              {action.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Clear selection"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
