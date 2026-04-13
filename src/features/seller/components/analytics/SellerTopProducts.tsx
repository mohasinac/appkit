"use client";

import React from "react";
import { Div, Heading, Span, Text } from "../../../../ui";
import type { SellerAnalyticsTopProduct } from "../../types";

export interface SellerTopProductsLabels {
  title?: string;
  ordersLabel?: string;
  noData?: string;
  noDataDescription?: string;
}

export interface SellerTopProductsProps {
  products: SellerAnalyticsTopProduct[];
  labels?: SellerTopProductsLabels;
  formatRevenue?: (amount: number) => string;
  renderProductLink?: (product: SellerAnalyticsTopProduct) => React.ReactNode;
  renderEmptyAction?: () => React.ReactNode;
  className?: string;
}

export function SellerTopProducts({
  products,
  labels = {},
  formatRevenue = (amount) => String(amount),
  renderProductLink,
  renderEmptyAction,
  className = "",
}: SellerTopProductsProps) {
  return (
    <Div
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 ${className}`}
    >
      {labels.title && (
        <Heading level={3} className="text-base font-semibold mb-4">
          {labels.title}
        </Heading>
      )}

      {products.length > 0 ? (
        <Div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {products.map((product, index) => (
            <Div key={product.productId} className="flex items-center gap-4 py-3">
              <Span className="w-6 text-sm font-bold text-neutral-500 dark:text-neutral-400">
                {index + 1}.
              </Span>
              <Div className="flex-1 min-w-0">
                <Text className="text-sm font-medium truncate">{product.title}</Text>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                  {product.orders} {labels.ordersLabel ?? "orders"}
                </Text>
              </Div>
              <Div className="text-right ml-2">
                <Span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatRevenue(product.revenue)}
                </Span>
                {renderProductLink?.(product)}
              </Div>
            </Div>
          ))}
        </Div>
      ) : (
        <Div className="text-center py-8">
          <Text className="text-sm font-medium">{labels.noData ?? "No data available"}</Text>
          {labels.noDataDescription && (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {labels.noDataDescription}
            </Text>
          )}
          {renderEmptyAction?.()}
        </Div>
      )}
    </Div>
  );
}
