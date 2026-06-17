import React from "react";
import { Div, Heading, Row, Text } from "../../../../ui";
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
    // audit-variant-ok: card container — border + sm:p-6 responsive bump (PADDING_MAP lacks responsive sm-up ladder)
    <Div
      className={`border border-neutral-200 dark:border-neutral-800 sm:p-6 ${className}`} rounded="xl" padding="md" surface="default"
    >
      {labels.title && (
        <Heading level={3} className="mb-4" size="base" weight="semibold">
          {labels.title}
        </Heading>
      )}
      <Div>
        {products.map((product) => (
          <Row
            key={product.productId}
            className="border-b last:border-b-0 border-neutral-100 dark:border-neutral-800" padding="y-sm" align="center" justify="between"
          >
            <Div className="flex-1 min-w-0">
              <Text className="truncate" weight="medium">{product.title}</Text>
              <Text className="text-neutral-500 dark:text-neutral-400" size="sm">
                {product.orders} {labels.orders ?? "orders"}
              </Text>
            </Div>
            <Div className="text-right ml-4">
              <Text weight="semibold">
                {formatRevenue(product.revenue)}
              </Text>
              {renderProductLink?.(product)}
            </Div>
          </Row>
        ))}
      </Div>
    </Div>
  );
}
