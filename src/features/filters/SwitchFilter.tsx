"use client"
import { useState } from "react";
import { Button, Div, Row, Span, Text, Toggle } from "../../ui";
import { cn } from "./filterUtils";

const CLS_CLEAR_BTN = "inline-flex items-center justify-center w-5 h-5 text-zinc-500 dark:text-zinc-400 hover:text-error dark:hover:text-error rounded-full transition-colors";

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
  defaultCollapsed = false,
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
      <Row gap="sm">
        <Button
          type="button"
          id={`sf-${title}`}
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          className="flex-1 justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 py-1 hover:opacity-80 transition-opacity"
          aria-expanded={!isCollapsed}
        >
          <Text size="sm" weight="semibold" color="primary">
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
            className={CLS_CLEAR_BTN}
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
      </Row>

      {!isCollapsed && (
        <Row className="mt-3" align="center" justify="between" gap="3">
          <Span size="sm" color="muted">
            {label}
          </Span>
          <Toggle checked={checked} onChange={onChange} size="sm" />
        </Row>
      )}
    </Div>
  );
}
