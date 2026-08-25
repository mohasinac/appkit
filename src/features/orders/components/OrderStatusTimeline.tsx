"use client";

/**
 * OrderStatusTimeline — the order-shaped wrapper around `<StatusTimeline>`.
 *
 * Two branches, and the fallback matters as much as the primary path:
 *
 * **Branch A — real history.** When the order carries `timeline` entries
 * (written by the repository since W2), each status change becomes a step
 * dated by when it actually happened, stamped with who did it. This finally
 * makes transitions with no dedicated date field visible at all — a payment
 * review, a re-upload request, a partial refund.
 *
 * **Branch B — legacy orders.** Every order written before `statusHistory`
 * existed has none, and back-filling one would mean inventing timestamps. So
 * the original derivation from the four scalar dates is kept verbatim for
 * those. Statuses with no dedicated date field render without one.
 *
 * No live courier API: `trackingUrl` is the passthrough link a seller entered.
 */

import { Anchor, Badge, Row, Stack, Text } from "../../../ui";
import {
  StatusTimeline,
  stepsFromEntries,
  type TimelineEntry,
  type TimelineStep,
} from "../../status-history/components/StatusTimeline";

const STAGE_SEQUENCE = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

const STAGE_LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refunded: "Refunded",
};

const NEGATIVE_STATUSES = new Set(["cancelled"]);

const labelFor = (status: string) => STAGE_LABELS[status] ?? status;
const isNegative = (status: string) => NEGATIVE_STATUSES.has(status);

/** Branch B — derive from the four scalar dates, for orders with no history. */
function buildLegacySteps(props: {
  orderStatus: string;
  orderDate?: string;
  shippingDate?: string;
  deliveryDate?: string;
  cancellationDate?: string;
}): TimelineStep[] {
  const status = (props.orderStatus ?? "").toLowerCase();
  const currentIndex = STAGE_SEQUENCE.indexOf(status as (typeof STAGE_SEQUENCE)[number]);
  const steps: TimelineStep[] = [
    { key: "pending", label: STAGE_LABELS.pending, date: props.orderDate },
  ];

  if ((status === "confirmed" || status === "processing") && !props.shippingDate) {
    steps.push({ key: status, label: STAGE_LABELS[status] });
  }
  if (props.shippingDate || currentIndex >= 3) {
    steps.push({ key: "shipped", label: STAGE_LABELS.shipped, date: props.shippingDate });
  }
  if (props.deliveryDate || status === "delivered") {
    steps.push({ key: "delivered", label: STAGE_LABELS.delivered, date: props.deliveryDate });
  }
  if (status === "cancelled" || props.cancellationDate) {
    steps.push({
      key: "cancelled",
      label: STAGE_LABELS.cancelled,
      date: props.cancellationDate,
      negative: true,
    });
  } else if (status === "return_requested" || status === "returned" || status === "refunded") {
    steps.push({ key: status, label: STAGE_LABELS[status] ?? status });
  }
  return steps;
}

export interface OrderStatusTimelineProps {
  orderStatus: string;
  /** Recorded history. When present it wins over the scalar-date fallback. */
  timeline?: TimelineEntry[];
  timelineTruncated?: number;
  orderDate?: string;
  shippingDate?: string;
  deliveryDate?: string;
  cancellationDate?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  trackingUrl?: string;
  className?: string;
}

export function OrderStatusTimeline({
  orderStatus,
  timeline,
  timelineTruncated,
  orderDate,
  shippingDate,
  deliveryDate,
  cancellationDate,
  trackingNumber,
  shippingCarrier,
  trackingUrl,
  className = "",
}: OrderStatusTimelineProps) {
  const fromHistory = stepsFromEntries(timeline, labelFor, isNegative);
  const steps = fromHistory.length
    ? fromHistory
    : buildLegacySteps({ orderStatus, orderDate, shippingDate, deliveryDate, cancellationDate });

  const hasTracking = Boolean(trackingNumber || shippingCarrier || trackingUrl);

  return (
    <StatusTimeline
      title="Tracking"
      steps={steps}
      truncatedCount={timelineTruncated}
      className={className}
      footer={
        hasTracking ? (
          <Stack gap="xs">
            {shippingCarrier && (
              <Row justify="between">
                <Text size="sm" color="muted">Carrier</Text>
                <Text size="sm" weight="medium">{shippingCarrier}</Text>
              </Row>
            )}
            {trackingNumber && (
              <Row justify="between">
                <Text size="sm" color="muted">Tracking number</Text>
                <Text size="sm" weight="medium">{trackingNumber}</Text>
              </Row>
            )}
            {trackingUrl && (
              <Row justify="end">
                <Anchor href={trackingUrl} tone="brand" weight="semibold" size="sm">
                  Track with carrier →
                </Anchor>
              </Row>
            )}
          </Stack>
        ) : (
          <Badge variant="default">No tracking details yet</Badge>
        )
      }
    />
  );
}
