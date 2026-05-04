"use client";

import { useState } from "react";
import { Div, Row, Span, Text } from "../../../ui";
import type { CouponItem, CouponType } from "../types";

const TYPE_COLORS: Record<CouponType, { card: string; code: string }> = {
  percentage:   { card: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800", code: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700" },
  fixed:        { card: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",   code: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" },
  free_shipping:{ card: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",      code: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700" },
  buy_x_get_y:  { card: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", code: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700" },
};

interface CouponCardProps {
  coupon: CouponItem;
  labels?: {
    copy?: string;
    copied?: string;
    expires?: string;
    minOrder?: string;
    off?: string;
    freeShipping?: string;
  };
  onCopy?: (code: string) => void;
  className?: string;
}

export function CouponCard({
  coupon,
  labels = {},
  onCopy,
  className = "",
}: CouponCardProps) {
  const [copied, setCopied] = useState(false);
  const colors = TYPE_COLORS[coupon.type] ?? TYPE_COLORS.percentage;

  const expiry = coupon.expiresAt
    ? new Date(coupon.expiresAt).toLocaleDateString()
    : null;

  const discountLabel =
    coupon.type === "percentage"
      ? `${coupon.discountValue}% ${labels.off ?? "OFF"}`
      : coupon.type === "fixed"
        ? `${coupon.discountValue} ${labels.off ?? "OFF"}`
        : (labels.freeShipping ?? "Free Shipping");

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code).catch(() => {});
    setCopied(true);
    onCopy?.(coupon.code);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Div className={`rounded-xl border-2 p-4 ${colors.card} ${className}`}>
      {/* Discount label + name */}
      <Div className="mb-3">
        <Text className="text-2xl font-extrabold tracking-tight leading-none">
          {discountLabel}
        </Text>
        <Text className="text-sm mt-0.5 font-medium opacity-80">{coupon.name}</Text>
      </Div>

      {coupon.description && (
        <Text className="text-xs opacity-60 mb-3">{coupon.description}</Text>
      )}

      {/* Copy code block */}
      <div className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 ${colors.code}`}>
        <span className="flex-1 font-mono text-sm font-bold tracking-widest uppercase select-all">
          {coupon.code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 active:scale-95 bg-white/60 dark:bg-black/20 border border-current/20"
          aria-label="Copy coupon code"
        >
          {copied ? (labels.copied ?? "Copied!") : (labels.copy ?? "Copy")}
        </button>
      </div>

      {/* Meta row */}
      <Row wrap gap="sm" className="text-xs opacity-60 mt-2">
        {coupon.minOrderAmount && (
          <Span>{labels.minOrder ?? "Min order"}: {coupon.minOrderAmount}</Span>
        )}
        {expiry && (
          <Span>{labels.expires ?? "Expires"}: {expiry}</Span>
        )}
      </Row>
    </Div>
  );
}
