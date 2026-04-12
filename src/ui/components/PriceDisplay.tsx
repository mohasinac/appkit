"use client";

import { Span } from "./Typography";
import { Row } from "./Layout";

export interface PriceDisplayProps {
  amount: number;
  currency?: string;
  originalAmount?: number;
  variant?: "compact" | "detail";
  className?: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
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
  currency = "INR",
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
      ? "text-xl font-bold text-primary"
      : "text-base font-bold text-primary";

  const originalClass =
    variant === "detail"
      ? "text-sm text-zinc-400 line-through dark:text-zinc-500"
      : "text-xs text-zinc-400 line-through dark:text-zinc-500";

  return (
    <Row wrap align="baseline" gap="xs" className={className}>
      <Span className={priceClass}>{formatCurrency(amount, currency)}</Span>
      {hasDiscount && (
        <>
          <Span className={originalClass}>
            {formatCurrency(originalAmount, currency)}
          </Span>
          <Span className="rounded bg-emerald-100 px-1 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            -{formatPercent(discountPct)}
          </Span>
        </>
      )}
    </Row>
  );
}
