import React from "react";
import { Button, Div, Span, Text } from "@mohasinac/ui";
import type { CouponItem, CouponType } from "../types";

const TYPE_COLORS: Record<CouponType, string> = {
  percentage: "bg-purple-50 border-purple-200 text-purple-800",
  fixed: "bg-green-50 border-green-200 text-green-800",
  free_shipping: "bg-blue-50 border-blue-200 text-blue-800",
  buy_x_get_y: "bg-orange-50 border-orange-200 text-orange-800",
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
  const colorClass = TYPE_COLORS[coupon.type] ?? TYPE_COLORS.percentage;
  const expiry = coupon.expiresAt
    ? new Date(coupon.expiresAt).toLocaleDateString()
    : null;

  const discountLabel =
    coupon.type === "percentage"
      ? `${coupon.discountValue}% ${labels.off ?? "OFF"}`
      : coupon.type === "fixed"
        ? `${coupon.discountValue} ${labels.off ?? "OFF"}`
        : (labels.freeShipping ?? "Free Shipping");

  return (
    <Div className={`rounded-xl border-2 p-4 ${colorClass} ${className}`}>
      <Div className="flex items-start justify-between gap-2 mb-2">
        <Div>
          <Text className="text-xl font-bold tracking-wide">
            {discountLabel}
          </Text>
          <Text className="text-sm mt-0.5">{coupon.name}</Text>
        </Div>
        <Button
          type="button"
          onClick={() => onCopy?.(coupon.code)}
          className="shrink-0 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
        >
          {coupon.code} — {labels.copy ?? "Copy"}
        </Button>
      </Div>

      {coupon.description && (
        <Text className="text-xs opacity-70 mb-2">{coupon.description}</Text>
      )}

      <Div className="flex flex-wrap gap-2 text-xs opacity-70">
        {coupon.minOrderAmount && (
          <Span>
            {labels.minOrder ?? "Min order"}: {coupon.minOrderAmount}
          </Span>
        )}
        {expiry && (
          <Span>
            {labels.expires ?? "Expires"}: {expiry}
          </Span>
        )}
      </Div>
    </Div>
  );
}
