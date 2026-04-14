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
    "appkit-select__trigger",
    error ? "appkit-select__trigger--error" : "appkit-select__trigger--default",
    disabled
      ? "appkit-select__trigger--disabled"
      : "appkit-select__trigger--enabled",
    className,
  ].join(" ");

  return (
    <div ref={ref} className="appkit-select">
      {label && (
        <Label
          htmlFor={id}
          className="appkit-select__label"
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
              ? "appkit-select__value appkit-select__value--selected"
              : "appkit-select__value appkit-select__value--placeholder"
          }
        >
          {selected?.label ?? placeholder}
        </Span>
        <ChevronDown
          className={`appkit-select__chevron ${open ? "appkit-select__chevron--open" : ""}`}
          aria-hidden="true"
        />
      </Button>

      {open && (
        <Ul
          role="listbox"
          className={[
            "appkit-select__list",
            openUp ? "appkit-select__list--up" : "appkit-select__list--down",
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
                  "appkit-select__option",
                  option.disabled
                    ? "appkit-select__option--disabled"
                    : isSelected
                      ? "appkit-select__option--selected"
                      : "appkit-select__option--default",
                ].join(" ")}
                onClick={() => !option.disabled && handleSelect(option.value)}
              >
                <Span className="appkit-select__option-label">
                  {option.label}
                </Span>
                {isSelected && (
                  <Check className="appkit-select__check" aria-hidden="true" />
                )}
              </Li>
            );
          })}
        </Ul>
      )}

      {error && (
        <Text
          size="xs"
          variant="error"
          className="appkit-select__error"
          role="alert"
        >
          {error}
        </Text>
      )}
    </div>
  );
}
