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
      className="appkit-bulk-bar"
      role="region"
      aria-live="polite"
      aria-label={l.bulkActions}
    >
      <div className="appkit-bulk-bar__stripe" />

      <div className="appkit-bulk-bar__row">
        <Button
          type="button"
          variant="ghost"
          onClick={onClearSelection}
          className="appkit-bulk-bar__count-pill"
          aria-label={l.clearSelection}
        >
          <X className="appkit-bulk-bar__count-icon" aria-hidden="true" />
          <Span className="appkit-bulk-bar__count-label">
            {selectedCount} {l.selected}
          </Span>
        </Button>

        {actions.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPickerOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            className={[
              "appkit-bulk-bar__picker-trigger",
              selectedAction?.variant === "danger"
                ? "appkit-bulk-bar__picker-trigger--danger"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {selectedAction?.icon && (
              <Span className="appkit-bulk-bar__picker-icon" aria-hidden="true">
                {selectedAction.icon}
              </Span>
            )}
            <Span className="appkit-bulk-bar__picker-label">
              {selectedAction?.label ?? l.bulkActions}
            </Span>
            {pickerOpen ? (
              <ChevronUp
                className="appkit-bulk-bar__picker-chevron"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="appkit-bulk-bar__picker-chevron"
                aria-hidden="true"
              />
            )}
          </Button>
        )}

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
            className="appkit-bulk-bar__apply"
          >
            <Span className="leading-none">{l.apply}</Span>
          </Button>
        )}
      </div>

      {actions.length > 0 && (
        <div
          role="listbox"
          aria-label={l.bulkActions}
          className={[
            "appkit-bulk-bar__dropdown",
            pickerOpen ? "appkit-bulk-bar__dropdown--open" : "",
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
                "appkit-bulk-bar__option",
                action.variant === "danger"
                  ? "appkit-bulk-bar__option--danger"
                  : "",
                selectedActionId === action.id
                  ? "appkit-bulk-bar__option--selected"
                  : "",
                action.disabled ? "appkit-bulk-bar__option--disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {action.icon && (
                <Span
                  className="appkit-bulk-bar__option-icon"
                  aria-hidden="true"
                >
                  {action.icon}
                </Span>
              )}
              <Span className="appkit-bulk-bar__option-label">
                {action.label}
              </Span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
