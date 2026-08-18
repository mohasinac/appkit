"use client";

/**
 * OrderPaymentSummary — the single place both admin and seller order-detail
 * views render payment info from, regardless of how the buyer paid (manual
 * cash/UPI proof, Razorpay, or COD). Reads `order.paymentRecord` when present;
 * falls back to an adapter over the pre-existing legacy fields
 * (`paymentMethod`/`paymentId`/`paymentProofUrl`/`paymentTransactionId`) for
 * orders placed before Feature C shipped, so old orders keep rendering
 * correctly instead of showing a blank/broken Payment section.
 */

import React from "react";
import { Badge, Div, Heading, Row, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import type { OrderDocument, OrderPaymentRecord } from "../schemas";

const METHOD_LABEL: Record<OrderPaymentRecord["method"], string> = {
  manual: "Manual (Cash / UPI)",
  razorpay: "Razorpay",
  cod: "Cash on Delivery",
};

function legacyFallback(order: OrderDocument): OrderPaymentRecord | null {
  if (!order.paymentMethod) return null;
  const method: OrderPaymentRecord["method"] =
    order.paymentMethod === "razorpay" || order.paymentMethod === "online"
      ? "razorpay"
      : order.paymentMethod === "cod"
        ? "cod"
        : "manual";
  return {
    method,
    transactionId: order.paymentTransactionId ?? order.paymentId,
    proofUrl: order.paymentProofUrl,
    amount: order.totalPrice,
    verificationMethod:
      method === "razorpay" ? "webhook" : method === "cod" ? "cod_collection" : "manual_review",
  };
}

export interface OrderPaymentSummaryProps {
  order: OrderDocument;
  className?: string;
}

export function OrderPaymentSummary({ order, className = "" }: OrderPaymentSummaryProps) {
  const record = order.paymentRecord ?? legacyFallback(order);
  if (!record) {
    return (
      <Div className={className} rounded="xl" padding="md" surface="muted" border="default">
        <Text size="sm" color="muted">
          No payment information recorded yet.
        </Text>
      </Div>
    );
  }

  return (
    <Div className={className} rounded="xl" padding="md" surface="muted" border="default">
      <Row justify="between" align="center" className="mb-2">
        <Heading level={3} size="sm" weight="semibold" color="muted">
          Payment
        </Heading>
        <Badge variant={order.paymentStatus === "paid" ? "success" : "default"}>
          {order.paymentStatus ?? "pending"}
        </Badge>
      </Row>
      <Stack gap="xs">
        <Row justify="between">
          <Text size="sm" color="muted">Method</Text>
          <Text size="sm" weight="medium">{METHOD_LABEL[record.method]}</Text>
        </Row>
        <Row justify="between">
          <Text size="sm" color="muted">Amount</Text>
          <Text size="sm" weight="medium">{formatCurrency(record.amount, order.currency ?? "INR")}</Text>
        </Row>
        {record.transactionId && (
          <Row justify="between">
            <Text size="sm" color="muted">Reference</Text>
            <Text size="sm" weight="medium">{record.transactionId}</Text>
          </Row>
        )}
        {record.paidAt && (
          <Row justify="between">
            <Text size="sm" color="muted">Paid at</Text>
            <Text size="sm">{new Date(record.paidAt).toLocaleString()}</Text>
          </Row>
        )}
        {record.verifiedBy && (
          <Row justify="between">
            <Text size="sm" color="muted">Verified by</Text>
            <Text size="sm">{record.verifiedBy}</Text>
          </Row>
        )}
        {record.gatewayRef?.paymentId && (
          <Row justify="between">
            <Text size="sm" color="muted">Gateway payment ID</Text>
            <Text size="sm">{record.gatewayRef.paymentId}</Text>
          </Row>
        )}
      </Stack>
    </Div>
  );
}
