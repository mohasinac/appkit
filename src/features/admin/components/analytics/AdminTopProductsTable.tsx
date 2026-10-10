import React from "react";
import { Div, Heading, Row, Text } from "../../../../ui";
import type { AnalyticsTopProduct } from "../../types";

export interface AdminTopProductsTableLabels {
  title?: string;
  orders?: string;
  views?: string;
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
      className={`border border-[var(--appkit-color-border-subtle)] sm:p-[1.5rem] ${className}`} rounded="xl" padding="md" surface="default"
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
            className="border-b last:border-b-0 border-[var(--appkit-color-border-subtle)]" padding="y-sm" align="center" justify="between"
          >
            <Div className="flex-1 min-w-0">
              <Text className="truncate" weight="medium">{product.title}</Text>
              <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                {product.orders} {labels.orders ?? "orders"}
              </Text>
            </Div>
            {/*
              * 🛑 The views column was REMOVED 2026-10-10 because it rendered
              * "0 views" on every row, permanently.
              *
              * `viewCount` is on no product document — measured, 0 of 72 — and
              * nothing has written it since `incrementViewCount` left the
              * render path on 2026-08-31. The guard here was `!= null`, and
              * `adminAnalytics` fed it `topProductDocs[i]?.viewCount ?? 0`, so
              * the coercion turned an absent field into a `0` that PASSED the
              * guard. A permanent zero presented as a measurement is worse
              * than an absent column: it reads as "nobody views our products".
              *
              * The data to render here does exist — `pageViews` is collected on
              * ~30 surfaces. It needs joining into the rollup first
              * (`metrics.views7d`/`views30d`), which is its own step; until
              * then this shows nothing rather than a confident wrong number.
              */}
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
