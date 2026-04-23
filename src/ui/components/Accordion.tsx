"use client"
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
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  open: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}) {
  return (
    <details
      open={open}
      className={`appkit-accordion appkit-accordion--legacy ${className}`}
    >
      <summary className={`appkit-accordion__summary ${titleClassName}`}>
        {title}
        <span className="appkit-accordion__chevron" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className={`appkit-accordion__content ${contentClassName}`} data-section="accordion-div-447">
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
    <Div className={`appkit-accordion__item ${className}`}>
      <Button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => ctx.toggle(value)}
        className="appkit-accordion__trigger"
      >
        <Span>{title}</Span>
        <Span
          className={`appkit-accordion__item-chevron ${isOpen ? "appkit-accordion__item-chevron--open" : ""}`}
        >
          ▾
        </Span>
      </Button>
      {isOpen && <Div className="appkit-accordion__panel">{children}</Div>}
    </Div>
  );
}
