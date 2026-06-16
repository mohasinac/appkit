"use client";

/**
 * RefundHistoryTable — read-only list of OrderRefundEvent entries on an order.
 *
 * Used on both buyer order-detail and seller/admin order-detail pages.
 * Non-contestable banner is shown when order.contestable === false.
 */

import React from "react";
import { Badge, Div, Heading, Row, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { REFUND_COPY } from "../../../_internal/shared/features/orders/refund-copy";
import type { OrderDocument, OrderRefundEvent } from "../schemas";

const __P = {
  p4: "p-4",
} as const;

export interface RefundHistoryTableProps {
  order: Pick<OrderDocument, "refunds" | "contestable" | "totalPrice" | "currency">;
  className?: string;
}

function formatDate(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function RefundRow({ event, currency }: { event: OrderRefundEvent; currency: string }) {
  return (
    <Row
      justify="between"
      align="start"
      gap="sm"
      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800" padding="y-sm"
    >
      <Stack gap="xs" className="flex-1">
        <Row gap="sm" align="center">
          <Badge variant={event.type === "full" ? "danger" : "warning"}>
            {event.type === "full" ? REFUND_COPY.history.badgeFull : REFUND_COPY.history.badgePartial}
          </Badge>
          <Text size="xs" color="muted">
            {formatDate(event.refundedAt)}
          </Text>
        </Row>
        <Text size="sm">{event.reason}</Text>
        {event.manualTransactionId && (
          <Text size="xs" color="muted">
            {REFUND_COPY.history.labelTxn} {event.manualTransactionId}
          </Text>
        )}
        {event.razorpayRefundId && (
          <Text size="xs" color="muted">
            {REFUND_COPY.history.labelRazorpay} {event.razorpayRefundId}
          </Text>
        )}
      </Stack>
      <Text size="sm" weight="semibold" className="shrink-0">
        {formatCurrency(event.amount / 100, currency)}
      </Text>
    </Row>
  );
}

/** Warning triangle icon — inline SVG kept here since it's a single-use decorative element. */
function WarningIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-warning"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function RefundHistoryTable({ order, className = "" }: RefundHistoryTableProps) {
  const events = order.refunds ?? [];
  const currency = order.currency ?? "INR";

  if (events.length === 0 && order.contestable !== false) return null;

  return (
    <Div className={`${className}`} rounded="xl" surface="default" border="default">
      {order.contestable === false && (
        <Div className="rounded-t-xl px-4" surface="warning-surface" padding="y-sm">
          <Row gap="sm" align="center">
            <WarningIcon />
            <Text size="sm" weight="semibold" className="text-warning">
              {REFUND_COPY.history.nonContestableBanner}
            </Text>
          </Row>
        </Div>
      )}

      {events.length > 0 && (
        <Div className={`${__P.p4}`}>
          <Heading level={4} className="mb-3" color="muted" size="sm" weight="semibold">
            {REFUND_COPY.history.heading}
          </Heading>
          <Stack gap="none">
            {events.map((e) => (
              <RefundRow key={e.refundId} event={e} currency={currency} />
            ))}
          </Stack>
        </Div>
      )}
    </Div>
  );
}
