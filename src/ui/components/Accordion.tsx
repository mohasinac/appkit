"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { Button } from "./Button";
import { Div } from "./Div";
import { Span } from "./Typography";

interface AccordionContextValue {
  type: "single" | "multiple";
  openValues: string[];
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps {
  /** Legacy simple mode: renders a native details/summary accordion */
  title?: React.ReactNode;
  /** Legacy simple mode open state */
  open?: boolean;
  /** Legacy simple mode title styling */
  titleClassName?: string;
  /** Legacy simple mode content styling */
  contentClassName?: string;

  /** Controlled/list mode: single or multiple expanded items */
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;

  className?: string;
  children?: React.ReactNode;
}

export interface AccordionItemProps {
  value: string;
  title: React.ReactNode;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function renderLegacyAccordion({
  title,
  children,
  open,
  className = "",
  titleClassName = "",
  contentClassName = "",
}: Required<
  Pick<
    AccordionProps,
    | "title"
    | "children"
    | "open"
    | "className"
    | "titleClassName"
    | "contentClassName"
  >
>) {
  return (
    <details
      open={open}
      className={`group border-b border-zinc-200 dark:border-zinc-700 ${className}`}
    >
      <summary
        className={`flex cursor-pointer select-none list-none items-center justify-between py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 ${titleClassName}`}
      >
        {title}
        <span
          className="ml-2 flex-shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          ▾
        </span>
      </summary>
      <div
        className={`pb-4 text-sm text-zinc-600 dark:text-zinc-400 ${contentClassName}`}
      >
        {children}
      </div>
    </details>
  );
}

export function Accordion({
  title,
  children,
  open = false,
  className = "",
  titleClassName = "",
  contentClassName = "",
  type = "single",
  defaultValue,
  value,
  onChange,
}: AccordionProps) {
  // Backward-compatible simple details mode.
  if (title !== undefined) {
    return renderLegacyAccordion({
      title,
      children,
      open,
      className,
      titleClassName,
      contentClassName,
    });
  }

  const initialOpen = useMemo(() => {
    if (value !== undefined) return toArray(value);
    return toArray(defaultValue);
  }, [defaultValue, value]);

  const [internalOpenValues, setInternalOpenValues] =
    useState<string[]>(initialOpen);

  const activeOpenValues =
    value !== undefined ? toArray(value) : internalOpenValues;

  const toggle = (itemValue: string) => {
    const nextOpenValues =
      type === "single"
        ? activeOpenValues.includes(itemValue)
          ? []
          : [itemValue]
        : activeOpenValues.includes(itemValue)
          ? activeOpenValues.filter((v) => v !== itemValue)
          : [...activeOpenValues, itemValue];

    if (value === undefined) {
      setInternalOpenValues(nextOpenValues);
    }

    onChange?.(type === "single" ? (nextOpenValues[0] ?? "") : nextOpenValues);
  };

  return (
    <AccordionContext.Provider
      value={{ type, openValues: activeOpenValues, toggle }}
    >
      <Div className={className}>{children}</Div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  title,
  disabled = false,
  className = "",
  children,
}: AccordionItemProps) {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error("AccordionItem must be used within Accordion.");
  }

  const isOpen = ctx.openValues.includes(value);

  return (
    <Div
      className={`border-b border-gray-200 dark:border-gray-700 ${className}`}
    >
      <Button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => ctx.toggle(value)}
        className="w-full flex items-center justify-between py-3 px-1 text-left text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Span>{title}</Span>
        <Span
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          ▾
        </Span>
      </Button>
      {isOpen && (
        <Div className="pb-3 px-1 text-sm text-gray-600 dark:text-gray-400">
          {children}
        </Div>
      )}
    </Div>
  );
}
