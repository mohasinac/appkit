"use client";

import { useState } from "react";
import { Button, Div, Span, Text } from "../../ui";
import { cn } from "./filterUtils";

export interface SwitchFilterProps {
  title: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  defaultCollapsed?: boolean;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
}

export function SwitchFilter({
  title,
  label,
  checked,
  onChange,
  defaultCollapsed = true,
  className = "",
  isOpen: controlledOpen,
  onToggle,
  onClear,
}: SwitchFilterProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = isControlled ? !controlledOpen : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalCollapsed((c) => !c);
  };

  return (
    <Div
      role="group"
      aria-labelledby={`sf-${title}`}
      className={cn(
        "p-4 border-b border-zinc-200 dark:border-slate-700 last:border-b-0",
        className,
      )}
    >
      <Div className="flex items-center gap-2">
        <Button
          type="button"
          id={`sf-${title}`}
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          className="flex flex-1 items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 py-1 hover:opacity-80 transition-opacity"
          aria-expanded={!isCollapsed}
        >
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </Text>
          <svg
            className={cn(
              "w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform duration-200",
              isCollapsed ? "" : "rotate-180",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
        {checked && onClear && (
          <Button
            type="button"
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="inline-flex items-center justify-center w-5 h-5 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors"
            aria-label="Clear"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
      </Div>

      {!isCollapsed && (
        <Div className="mt-3">
          <Button
            type="button"
            role="switch"
            variant="ghost"
            size="sm"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full group"
          >
            <Span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
              {label}
            </Span>

            {/* Toggle pill */}
            <Span
              aria-hidden="true"
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                checked
                  ? "bg-primary-600 dark:bg-secondary-500"
                  : "bg-zinc-200 dark:bg-slate-700",
              )}
            >
              <Span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
                  checked ? "translate-x-4" : "translate-x-0",
                )}
              />
            </Span>
          </Button>
        </Div>
      )}
    </Div>
  );
}
