"use client";

import Link from "next/link";
import React from "react";
import { Div, Heading, Span, Text } from "../../../ui";
import type { PreorderItem, PreorderStatus } from "../types";
import { getPreorderStatus } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";

const STATUS_LABELS: Record<PreorderStatus, string> = {
  available: "Pre-order now",
  shipping_soon: "Shipping soon",
  shipped: "Shipped",
};

const STATUS_COLORS: Record<PreorderStatus, string> = {
  available: "bg-indigo-100 text-indigo-800",
  shipping_soon: "bg-amber-100 text-amber-800",
  shipped: "bg-green-100 text-green-800",
};

interface PreorderBadgeProps {
  shipDate?: string;
  className?: string;
}

export function PreorderBadge({ shipDate, className }: PreorderBadgeProps) {
  const status = getPreorderStatus(shipDate);
  return (
    <Span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]} ${className ?? ""}`}
    >
      {STATUS_LABELS[status]}
    </Span>
  );
}

interface PreorderCardProps {
  item: PreorderItem;
  href: string;
}

export function PreorderCard({ item, href }: PreorderCardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      {item.images[0] ? (
        <Div
          role="img"
          aria-label={item.name}
          className="h-56 w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${item.images[0]})` }}
        />
      ) : (
        <Div className="h-56 w-full bg-gray-100" />
      )}
      <Div className="p-4">
        <PreorderBadge shipDate={item.preorderShipDate} />
        <Heading
          level={3}
          className="mt-2 font-semibold text-gray-900 text-base"
        >
          {item.name}
        </Heading>
        <Text className="mt-1 text-sm text-gray-500">{item.brand}</Text>
        <Div className="mt-3 flex items-baseline gap-2">
          <Span className="text-lg font-bold text-gray-900">
            {formatCurrency(item.salePrice)}
          </Span>
          {item.regularPrice > item.salePrice && (
            <Span className="text-sm text-gray-400 line-through">
              {formatCurrency(item.regularPrice)}
            </Span>
          )}
        </Div>
        {item.preorderShipDate && (
          <Text className="mt-1 text-xs text-gray-400">
            Ships:{" "}
            {new Date(item.preorderShipDate).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}
          </Text>
        )}
      </Div>
    </Link>
  );
}
