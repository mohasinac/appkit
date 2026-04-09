"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Label, Span, Text } from "./Typography";
import { Ul, Li } from "./Semantic";
import { Button } from "./Button";

/**
 * Select — accessible combobox with label, error state, and disabled support.
 *
 * Standalone @mohasinac/ui primitive. No app-specific imports.
 */

export interface SelectOption<V = string> {
  label: string;
  value: V;
  disabled?: boolean;
}

export interface SelectProps<V extends string = string> {
  options: SelectOption<V>[];
  value?: V;
  onChange?: (value: V) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export function Select<V extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  error,
  disabled = false,
  required,
  className = "",
  id: externalId,
}: SelectProps<V>) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const toggle = useCallback(() => {
    if (!disabled) {
      if (!open && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUp(spaceBelow < 160 && spaceAbove > spaceBelow);
      }
      setOpen((v) => !v);
    }
  }, [disabled, open]);

  const handleSelect = useCallback(
    (val: V) => {
      onChange?.(val);
      setOpen(false);
    },
    [onChange],
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        toggle();
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown" && !open) {
        setOpen(true);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = options.findIndex((o) => o.value === value);
        const next = options
          .slice(idx < 0 ? 0 : idx + 1)
          .find((o) => !o.disabled);
        if (next) onChange?.(next.value);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = options.findIndex((o) => o.value === value);
        if (idx < 0) return;
        const prev = [...options]
          .slice(0, idx)
          .reverse()
          .find((o) => !o.disabled);
        if (prev) onChange?.(prev.value);
      }
    },
    [open, options, value, onChange, toggle],
  );

  const triggerClass = [
    "flex h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
    "transition-colors bg-white dark:bg-slate-800/60",
    "focus:outline-none focus:ring-2 focus:ring-offset-0",
    error
      ? "border-red-400 dark:border-red-500 focus:ring-red-500/20"
      : "border-zinc-200 dark:border-slate-700 focus:ring-primary-500/20 dark:focus:ring-secondary-400/20 focus:border-primary-500 dark:focus:border-secondary-400",
    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
    className,
  ].join(" ");

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <Label
          htmlFor={id}
          className="!text-zinc-700 dark:!text-zinc-300"
          required={required}
        >
          {label}
        </Label>
      )}

      <Button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        disabled={disabled}
        variant="ghost"
        className={triggerClass}
        onClick={toggle}
        onKeyDown={handleKeyDown}
      >
        <Span
          className={
            selected
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-zinc-400 dark:text-zinc-500"
          }
        >
          {selected?.label ?? placeholder}
        </Span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </Button>

      {open && (
        <Ul
          role="listbox"
          className={[
            "absolute z-50 w-full overflow-auto rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-60 py-1",
            openUp ? "bottom-full mb-1" : "top-full mt-1",
          ].join(" ")}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                className={[
                  "relative flex cursor-pointer items-center px-3 py-2 text-sm select-none",
                  option.disabled
                    ? "opacity-40 cursor-not-allowed"
                    : isSelected
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-700",
                ].join(" ")}
                onClick={() => !option.disabled && handleSelect(option.value)}
              >
                <Span className="flex-1">{option.label}</Span>
                {isSelected && (
                  <Check
                    className="h-4 w-4 ml-2 flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </Li>
            );
          })}
        </Ul>
      )}

      {error && (
        <Text size="xs" variant="error" className="mt-1.5" role="alert">
          {error}
        </Text>
      )}
    </div>
  );
}
