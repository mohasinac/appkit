import React from "react";
import { Div, Heading, Text } from "../../../../ui";
import type { AnalyticsTopProduct } from "../../types";

export interface AdminTopProductsTableLabels {
  title?: string;
  orders?: string;
  view?: string;
  revenue?: string;
}

export interface AdminTopProductsTableProps {
  products: AnalyticsTopProduct[];
  labels?: AdminTopProductsTableLabels;
  formatRevenue?: (amount: number) => string;
  renderProductLink?: (product: AnalyticsTopProduct) => React.ReactNode;
  className?: string;
}

export function AdminTopProductsTable({
  products,
  labels = {},
  formatRevenue = (n) => String(n),
  renderProductLink,
  className = "",
}: AdminTopProductsTableProps) {
  return (
    <Div
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 ${className}`}
    >
      {labels.title && (
        <Heading level={3} className="text-base font-semibold mb-4">
          {labels.title}
        </Heading>
      )}
      <Div>
        {products.map((product) => (
          <Div
            key={product.productId}
            className="flex items-center justify-between py-3 border-b last:border-b-0 border-neutral-100 dark:border-neutral-800"
          >
            <Div className="flex-1 min-w-0">
              <Text className="font-medium truncate">{product.title}</Text>
              <Text className="text-sm text-neutral-500">
                {product.orders} {labels.orders ?? "orders"}
              </Text>
            </Div>
            <Div className="text-right ml-4">
              <Text className="font-semibold">
                {formatRevenue(product.revenue)}
              </Text>
              {renderProductLink?.(product)}
            </Div>
          </Div>
        ))}
      </Div>
    </Div>
  );
}
