"use client";

/**
 * RefundRequestView — buyer-facing refund submission form.
 *
 * Shows 3 acknowledgment checkboxes the buyer must tick before the
 * "Request refund" button becomes active — each maps to a step in the
 * confirmIrrevocable contract. On submit the parent's `onSubmitRequest`
 * is called with the reason; the parent (page or modal) calls the API.
 *
 * This component is presentational: it has no server-action imports and
 * does not talk to the API directly.
 */

import React, { useState } from "react";
import { Button, Div, Stack, Text } from "../../../ui";
import type { OrderDocument } from "../schemas";
import { formatCurrency } from "../../../utils/number.formatter";

export interface RefundRequestViewProps {
  order: Pick<OrderDocument, "id" | "totalPrice" | "currency" | "isNonRefundable" | "refunds" | "contestable">;
  onSubmitRequest: (reason: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const ACKNOWLEDGMENTS = [
  "I understand this refund request, once approved, permanently removes my ability to file any dispute or RMA claim on this order.",
  "I confirm the item has not been used, worn, or damaged by me, and I am returning it in original condition (if a return is required).",
  "I understand the refund amount may take 5–7 business days to reflect and that platform fees may be non-recoverable.",
] as const;

export function RefundRequestView({
  order,
  onSubmitRequest,
  isLoading = false,
  className = "",
}: RefundRequestViewProps) {
  const [acknowledged, setAcknowledged] = useState<boolean[]>([false, false, false]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const allChecked = acknowledged.every(Boolean);
  const canSubmit = allChecked && reason.trim().length >= 10 && !isLoading;

  if (order.isNonRefundable) {
    return (
      <Div className={`rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
        <Text size="sm" color="muted">
          This order is non-refundable (prize draw or bundle). Refunds cannot be issued.
        </Text>
      </Div>
    );
  }

  if (order.contestable === false) {
    return (
      <Div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}>
        <Text size="sm" className="text-amber-700 dark:text-amber-400">
          A refund has already been processed on this order. No further disputes or refund requests can be filed.
        </Text>
      </Div>
    );
  }

  const handleToggle = (i: number) => {
    setAcknowledged((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      await onSubmitRequest(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit refund request");
    }
  };

  return (
    <Stack gap="md" className={className}>
      <Text size="sm" color="muted">
        Order total: <strong>{formatCurrency(order.totalPrice / 100, order.currency ?? "INR")}</strong>
      </Text>

      <Stack gap="xs">
        <Text size="sm" weight="semibold">Reason for refund <span aria-hidden>*</span></Text>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the issue in at least 10 characters…"
          rows={3}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-zinc-700 dark:bg-zinc-900"
          aria-required="true"
          aria-label="Reason for refund"
        />
      </Stack>

      <Stack gap="sm">
        <Text size="sm" weight="semibold">Before submitting, please acknowledge:</Text>
        {ACKNOWLEDGMENTS.map((text, i) => (
          <label key={i} className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acknowledged[i]}
              onChange={() => handleToggle(i)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
              aria-label={`Acknowledgment ${i + 1}`}
            />
            <Text size="sm" className="leading-snug">{text}</Text>
          </label>
        ))}
      </Stack>

      {error && (
        <Text size="sm" color="danger" role="alert">{error}</Text>
      )}

      <Button
        variant="danger"
        onClick={handleSubmit}
        disabled={!canSubmit}
        aria-busy={isLoading}
      >
        {isLoading ? "Submitting…" : "Request refund"}
      </Button>
    </Stack>
  );
}
