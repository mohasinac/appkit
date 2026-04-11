"use client";

/**
 * BulkActionBar
 *
 * Appears at the top of the content area whenever one or more list items are
 * selected. Shows a selection-count pill (tap ✕ to clear), a type-picker
 * dropdown, and an Apply button.
 *
 * Rendered by ListingLayout automatically when selectedCount > 0.
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "./Button";
import { Span } from "./Typography";

export interface BulkActionItem {
  id: string;
  label: string;
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "ghost"
    | "warning";
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface BulkActionBarLabels {
  /** e.g. "${count} selected" — receives count as format arg */
  selected?: string;
  apply?: string;
  clearSelection?: string;
  bulkActions?: string;
}

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection?: () => void;
  actions?: BulkActionItem[];
  labels?: BulkActionBarLabels;
}

const DEFAULT_LABELS: Required<BulkActionBarLabels> = {
  selected: "selected",
  apply: "Apply",
  clearSelection: "Clear selection",
  bulkActions: "Bulk actions",
};

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  actions = [],
  labels,
}: BulkActionBarProps) {
  const l = { ...DEFAULT_LABELS, ...labels };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inline click-outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep selectedActionId in sync with available actions
  useEffect(() => {
    setSelectedActionId((prev) => {
      const ids = actions.map((a) => a.id);
      if (prev && ids.includes(prev)) return prev;
      return ids[0] ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.map((a) => a.id).join(",")]);

  if (selectedCount === 0) return null;

  const selectedAction = actions.find((a) => a.id === selectedActionId);

  const handleApply = () => {
    if (!selectedActionId) return;
    selectedAction?.onClick();
    setPickerOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden border border-primary/20 dark:border-primary/30 animate-in fade-in slide-in-from-top-1 duration-150"
      role="region"
      aria-live="polite"
      aria-label={l.bulkActions}
    >
      {/* Accent stripe */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 dark:from-secondary-600 dark:via-secondary-400 dark:to-secondary-600" />

      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Selection count pill */}
        <Button
          type="button"
          variant="ghost"
          onClick={onClearSelection}
          className="inline-flex items-center gap-1.5 flex-shrink-0 bg-primary-50 hover:bg-primary-100 active:bg-primary-200 dark:bg-primary-950/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full pl-2 pr-3 h-8 border border-primary-200/70 dark:border-primary-800/50 transition-colors min-h-0"
          aria-label={l.clearSelection}
        >
          <X className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <Span className="text-xs font-semibold tabular-nums whitespace-nowrap leading-none">
            {selectedCount} {l.selected}
          </Span>
        </Button>

        {/* Picker trigger */}
        {actions.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPickerOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            className={[
              "flex-1 min-w-0 h-10 flex items-center gap-2 px-3 rounded-lg border text-sm font-medium transition-colors",
              "bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 dark:bg-slate-800/60 dark:hover:bg-slate-700/60",
              "border-zinc-200 dark:border-slate-700",
              selectedAction?.variant === "danger"
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-800 dark:text-zinc-100",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {selectedAction?.icon && (
              <Span
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                aria-hidden="true"
              >
                {selectedAction.icon}
              </Span>
            )}
            <Span className="flex-1 truncate text-left leading-none">
              {selectedAction?.label ?? l.bulkActions}
            </Span>
            {pickerOpen ? (
              <ChevronUp
                className="w-4 h-4 flex-shrink-0 text-zinc-400"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="w-4 h-4 flex-shrink-0 text-zinc-400"
                aria-hidden="true"
              />
            )}
          </Button>
        )}

        {/* Apply button */}
        {actions.length > 0 && (
          <Button
            type="button"
            variant={selectedAction?.variant ?? "primary"}
            size="sm"
            isLoading={selectedAction?.loading}
            disabled={
              !selectedActionId ||
              selectedAction?.disabled ||
              selectedAction?.loading
            }
            onClick={handleApply}
            className="h-10 flex-shrink-0"
          >
            <Span className="leading-none">{l.apply}</Span>
          </Button>
        )}
      </div>

      {/* Picker dropdown */}
      {actions.length > 0 && (
        <div
          role="listbox"
          aria-label={l.bulkActions}
          className={[
            "overflow-hidden border-t border-zinc-200/80 dark:border-slate-700/80",
            "transition-[max-height,opacity] duration-200 ease-out",
            pickerOpen
              ? "max-h-64 opacity-100"
              : "max-h-0 opacity-0 pointer-events-none",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              role="option"
              aria-selected={selectedActionId === action.id}
              disabled={action.disabled}
              onClick={() => {
                setSelectedActionId(action.id);
                setPickerOpen(false);
              }}
              className={[
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors",
                "hover:bg-zinc-50 dark:hover:bg-slate-800/60",
                action.variant === "danger"
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-700 dark:text-zinc-200",
                selectedActionId === action.id
                  ? "bg-zinc-50 dark:bg-slate-800/60 font-medium"
                  : "",
                action.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {action.icon && (
                <Span
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                  aria-hidden="true"
                >
                  {action.icon}
                </Span>
              )}
              <Span className="flex-1">{action.label}</Span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
