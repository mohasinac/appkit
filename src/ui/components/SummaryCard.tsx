"use client";

import React from "react";

import { Div } from "./Div";
import { Divider } from "./Divider";
import { Span } from "./Typography";
import { classNames } from "../style.helper";

export interface SummaryLine {
  label: string;
  value: string;
  muted?: boolean;
}

export interface SummaryCardProps {
  lines: SummaryLine[];
  total: { label: string; value: string };
  action?: React.ReactNode;
  variant?: "default" | "homepage" | "public" | "admin" | "order";
  className?: string;
}

const SUMMARY_CARD_VARIANT_CLASS = {
  default: "appkit-summary-card--default",
  homepage: "appkit-summary-card--homepage",
  public: "appkit-summary-card--public",
  admin: "appkit-summary-card--admin",
  order: "appkit-summary-card--order",
} as const;

export function SummaryCard({
  lines,
  total,
  action,
  variant = "default",
  className,
}: SummaryCardProps) {
  return (
    <Div
      className={classNames(
        "appkit-summary-card",
        SUMMARY_CARD_VARIANT_CLASS[variant],
        className,
      )}
    >
      <Div className="appkit-summary-card__lines">
        {lines.map((line, i) => (
          <Div key={i} className="appkit-summary-card__line">
            <Span className="appkit-summary-card__label">{line.label}</Span>
            <Span
              className={
                line.muted
                  ? "appkit-summary-card__value appkit-summary-card__value--muted"
                  : "appkit-summary-card__value"
              }
            >
              {line.value}
            </Span>
          </Div>
        ))}
      </Div>

      <Divider />

      <Div className="appkit-summary-card__total">
        <Span className="appkit-summary-card__total-label">{total.label}</Span>
        <Span className="appkit-summary-card__total-value">{total.value}</Span>
      </Div>

      {action && <Div className="appkit-summary-card__action">{action}</Div>}
    </Div>
  );
}
