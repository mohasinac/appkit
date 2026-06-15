"use client";

/**
 * OrderSiblingPayments — renders links to other orders that were created
 * in the same checkout transaction (same paymentBatchId). Displayed on the
 * order-detail page below the main order summary.
 *
 * Purely presentational. Parent fetches the sibling orders server-side and
 * passes them as props.
 */

import React from "react";
import Link from "next/link";
import { Div, Heading, Row, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { REFUND_COPY } from "../../../_internal/shared/features/orders/refund-copy";
import { formatCurrency } from "../../../utils/number.formatter";
import type { OrderDocument } from "../schemas";

export interface OrderSiblingPaymentsProps {
  siblings: OrderDocument[];
  /** The current order's id — excluded from the sibling list. */
  currentOrderId: string;
  className?: string;
}

export function OrderSiblingPayments({
  siblings,
  currentOrderId,
  className = "",
}: OrderSiblingPaymentsProps) {
  const others = siblings.filter((o) => o.id !== currentOrderId);
  if (others.length === 0) return null;

  return (
    <Div
      className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <Heading level={3} className="mb-3 text-zinc-700 dark:text-zinc-300" size="sm" weight="semibold">
        {REFUND_COPY.siblingPayments.heading(others.length)}
      </Heading>
      <Stack gap="xs">
        {others.map((o) => {
          const href = String(ROUTES.USER.ORDER_DETAIL(o.id));
          return (
            <Row key={o.id} justify="between" align="center" gap="sm">
              <Link
                href={href}
                className="text-sm font-medium text-[color:var(--appkit-color-primary)] hover:underline"
              >
                {o.id}
              </Link>
              <Row gap="sm" align="center">
                <Text size="xs" color="muted" transform="capitalize">
                  {o.status}
                </Text>
                <Text size="xs" weight="semibold">
                  {formatCurrency(o.totalPrice / 100, o.currency ?? "INR")}
                </Text>
              </Row>
            </Row>
          );
        })}
      </Stack>
    </Div>
  );
}
