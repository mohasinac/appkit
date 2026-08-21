"use client";

/**
 * OrderStatusTimeline — a genuine (not fabricated/estimated) status timeline
 * built from the real per-status timestamps already written by the
 * order-status-update path (`orderDate`/`shippingDate`/`deliveryDate`/
 * `cancellationDate`). No live courier-API integration — `trackingUrl` is
 * just the passthrough link a seller/admin entered, rendered as an external
 * link that opens in a new tab. Statuses with no dedicated date field
 * (confirmed/processing/return_requested/returned/refunded) render as a step
 * without a timestamp rather than showing a made-up date.
 */

import { Anchor, Badge, Div, Heading, Row, Stack, Text } from "../../../ui";

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

interface TimelineStep {
  key: string;
  label: string;
  date?: string;
}

function buildSteps(props: {
  orderStatus: string;
  orderDate?: string;
  shippingDate?: string;
  deliveryDate?: string;
  cancellationDate?: string;
}): TimelineStep[] {
  const status = (props.orderStatus ?? "").toLowerCase();
  const currentIndex = STAGE_SEQUENCE.indexOf(status as (typeof STAGE_SEQUENCE)[number]);
  const steps: TimelineStep[] = [{ key: "pending", label: STAGE_LABELS.pending, date: props.orderDate }];

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
    steps.push({ key: "cancelled", label: STAGE_LABELS.cancelled, date: props.cancellationDate });
  } else if (status === "return_requested" || status === "returned" || status === "refunded") {
    steps.push({ key: status, label: STAGE_LABELS[status] ?? status });
  }

  return steps;
}

export interface OrderStatusTimelineProps {
  orderStatus: string;
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
  orderDate,
  shippingDate,
  deliveryDate,
  cancellationDate,
  trackingNumber,
  shippingCarrier,
  trackingUrl,
  className = "",
}: OrderStatusTimelineProps) {
  const steps = buildSteps({ orderStatus, orderDate, shippingDate, deliveryDate, cancellationDate });
  const isTerminalNegative = steps[steps.length - 1]?.key === "cancelled";

  return (
    <Div className={className} rounded="xl" padding="md" surface="muted" border="default">
      <Heading level={3} size="sm" weight="semibold" color="muted" className="mb-3">
        Tracking
      </Heading>

      <Stack gap="none">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isNegative = step.key === "cancelled";
          return (
            <Row key={step.key} gap="sm" padding={isLast ? "none" : "b-md"}>
              <Stack gap="none" align="center" className="shrink-0">
                <Div
                  className={`h-2.5 w-2.5 ${isNegative ? "" : "bg-[var(--appkit-color-primary)]"}`}
                  rounded="full"
                  surface={isNegative ? "danger-surface" : "none"}
                />
                {!isLast && <Div className="w-px flex-1 min-h-[24px]" surface="subtle" />}
              </Stack>
              <Stack gap="none" className="min-w-0 flex-1">
                <Text size="sm" weight="medium" className={isNegative ? "text-error" : undefined}>
                  {step.label}
                </Text>
                <Text size="xs" color="muted">
                  {step.date ? new Date(step.date).toLocaleString() : "—"}
                </Text>
              </Stack>
            </Row>
          );
        })}
      </Stack>

      {(trackingNumber || shippingCarrier || trackingUrl) && !isTerminalNegative && (
        <Div className="mt-3 border-t border-[var(--appkit-color-border)]" padding="t-sm">
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
        </Div>
      )}

      {!trackingNumber && !trackingUrl && !isTerminalNegative && (
        <Badge variant="default" className="mt-3">No tracking details yet</Badge>
      )}
    </Div>
  );
}
