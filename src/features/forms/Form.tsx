"use client";

import React from "react";
import { Div } from "@mohasinac/ui";
import { cn } from "./utils";

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function Form({ children, className = "", ...props }: FormProps) {
  return (
    <form className={cn("space-y-6 lg:space-y-8", className)} {...props}>
      {children}
    </form>
  );
}

// ─── FormGroup ────────────────────────────────────────────────────────────────

type GapToken = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const GAP_MAP: Record<GapToken, string> = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4 lg:gap-6",
  lg: "gap-6 lg:gap-8",
  xl: "gap-8 lg:gap-10",
};

export interface FormGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: GapToken;
  className?: string;
}

export function FormGroup({
  children,
  columns = 1,
  gap = "md",
  className = "",
}: FormGroupProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <Div className={cn("grid", gridClasses[columns], GAP_MAP[gap], className)}>
      {children}
    </Div>
  );
}

// ─── FormFieldSpan ────────────────────────────────────────────────────────────

/** Wraps a child so it spans full width inside a multi-column FormGroup. */
export function FormFieldSpan({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Div className={cn("col-span-full", className)}>{children}</Div>;
}

// ─── FormActions ─────────────────────────────────────────────────────────────

export interface FormActionsProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right" | "between";
  className?: string;
}

const ALIGN_MAP = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
  between: "justify-between",
};

export function FormActions({
  children,
  align = "right",
  className = "",
}: FormActionsProps) {
  return (
    <Div
      className={cn(
        "flex items-center gap-3 pt-2",
        ALIGN_MAP[align],
        className,
      )}
    >
      {children}
    </Div>
  );
}
