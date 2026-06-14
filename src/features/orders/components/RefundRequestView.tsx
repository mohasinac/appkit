"use client";

/**
 * RefundRequestView — buyer-facing refund submission form.
 *
 * Shows 3 acknowledgment checkboxes (via the appkit Checkbox primitive) that
 * the buyer must tick before the submit button becomes active. On submit the
 * parent's `onSubmitRequest` is called with the reason string; the parent
 * (page or modal) is responsible for calling the API.
 *
 * This component is presentational: it has no server-action imports and
 * does not talk to the API directly.
 */

import React, { useState } from "react";
import { Button, Checkbox, Div, Span, Stack, Text, Textarea } from "../../../ui";
import { REFUND_COPY } from "../../../_internal/shared/features/orders/refund-copy";
import { formatCurrency } from "../../../utils/number.formatter";
import type { OrderDocument } from "../schemas";

export interface RefundRequestViewProps {
  order: Pick<OrderDocument, "id" | "totalPrice" | "currency" | "isNonRefundable" | "refunds" | "contestable">;
  onSubmitRequest: (reason: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const ACK_COUNT = REFUND_COPY.request.acknowledgments.length;
const CLS_WARN_PANEL = "rounded-xl border border-warning bg-warning-surface p-4 dark:border-warning";

export function RefundRequestView({
  order,
  onSubmitRequest,
  isLoading = false,
  className = "",
}: RefundRequestViewProps) {
  const [acknowledged, setAcknowledged] = useState<boolean[]>(Array(ACK_COUNT).fill(false));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const allChecked = acknowledged.every(Boolean);
  const canSubmit = allChecked && reason.trim().length >= 10 && !isLoading;

  if (order.isNonRefundable) {
    return (
      <Div
        className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
      >
        <Text size="sm" color="muted">
          {REFUND_COPY.request.nonRefundableMessage}
        </Text>
      </Div>
    );
  }

  if (order.contestable === false) {
    return (
      <Div
        className={`${CLS_WARN_PANEL} ${className}`}
      >
        <Text size="sm" className="text-warning">
          {REFUND_COPY.request.alreadyRefundedMessage}
        </Text>
      </Div>
    );
  }

  const handleToggle = (i: number) =>
    setAcknowledged((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const handleSubmit = async () => {
    setError(null);
    try {
      await onSubmitRequest(reason.trim());
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : REFUND_COPY.request.errorFallback);
    }
  };

  return (
    <Stack gap="md" className={className}>
      <Text size="sm" color="muted">
        {REFUND_COPY.request.orderTotalLabel}{" "}
        <Span weight="bold">{formatCurrency(order.totalPrice / 100, order.currency ?? "INR")}</Span>
      </Text>

      <Stack gap="xs">
        <Text size="sm" weight="semibold">
          {REFUND_COPY.request.reasonLabel} <span aria-hidden>*</span>
        </Text>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={REFUND_COPY.request.reasonPlaceholder}
          rows={3}
          aria-required="true"
          aria-label={REFUND_COPY.request.reasonLabel}
        />
      </Stack>

      <Stack gap="sm">
        <Text size="sm" weight="semibold">
          {REFUND_COPY.request.acknowledgeHeading}
        </Text>
        {REFUND_COPY.request.acknowledgments.map((text, i) => (
          <Checkbox
            key={i}
            checked={acknowledged[i]}
            onChange={() => handleToggle(i)}
            label={<Text size="sm" className="leading-snug">{text}</Text>}
            aria-label={`Acknowledgment ${i + 1}`}
          />
        ))}
      </Stack>

      {error && (
        <Text size="sm" color="danger" role="alert">
          {error}
        </Text>
      )}

      <Button
        variant="danger"
        onClick={handleSubmit}
        disabled={!canSubmit}
        aria-busy={isLoading}
      >
        {isLoading ? REFUND_COPY.request.submittingLabel : REFUND_COPY.request.submitLabel}
      </Button>
    </Stack>
  );
}
