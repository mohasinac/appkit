"use client";

import { Span } from "./Typography";
import { Row } from "./Layout";
import {
  getDefaultCurrency,
  getDefaultLocale,
} from "../../core/baseline-resolver";

export interface PriceDisplayProps {
  amount: number;
  currency?: string;
  originalAmount?: number;
  variant?: "compact" | "detail";
  className?: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(getDefaultLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PriceDisplay({
  amount,
  currency = getDefaultCurrency(),
  originalAmount,
  variant = "compact",
  className,
}: PriceDisplayProps) {
  const hasDiscount = originalAmount !== undefined && originalAmount > amount;
  const discountPct = hasDiscount
    ? (originalAmount - amount) / originalAmount
    : 0;

  const priceClass =
    variant === "detail"
      ? "appkit-price-display__price appkit-price-display__price--detail"
      : "appkit-price-display__price appkit-price-display__price--compact";

  const originalClass =
    variant === "detail"
      ? "appkit-price-display__original appkit-price-display__original--detail"
      : "appkit-price-display__original appkit-price-display__original--compact";

  return (
    <Row
      wrap
      align="baseline"
      gap="xs"
      className={`appkit-price-display ${className ?? ""}`.trim()}
    >
      <Span className={priceClass}>{formatCurrency(amount, currency)}</Span>
      {hasDiscount && (
        <>
          <Span className={originalClass}>
            {formatCurrency(originalAmount, currency)}
          </Span>
          <Span className="appkit-price-display__discount">
            -{formatPercent(discountPct)}
          </Span>
        </>
      )}
    </Row>
  );
}
