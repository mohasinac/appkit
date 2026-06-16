import React from "react";
import { BarChart2 } from "lucide-react";
import { Alert, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminAnalyticsGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <BarChart2 className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">Analytics</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Revenue, order funnel, product performance, and store metrics on LetItRip.</Text>
      </Section>

      {[
        {
          title: "Revenue Dashboard",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">GMV (Gross Merchandise Value)</Span>: Total order subtotals across all stores. Does not deduct platform commission or refunds.</Li>
              <Li><Span weight="bold">Net Revenue</Span>: GMV × platformFee — refunded orders excluded.</Li>
              <Li><Span weight="bold">Period filter</Span>: Last 7 / 30 / 90 days, or custom date range. All monetary values shown in INR.</Li>
              <Li><Span weight="bold">Payout total</Span>: Total disbursed to sellers in the same period. Revenue - Payout = Platform earnings.</Li>
            </Ul>
          ),
        },
        {
          title: "Order Funnel",
          content: (
            <Ul className={GC.listMuted}>
              <Li>The funnel shows drop-off at each stage: Add to Cart → Checkout started → Payment initiated → Payment completed → Delivered.</Li>
              <Li>High drop-off at "Payment initiated → completed" often indicates a payment gateway issue or UX friction. Check Razorpay dashboard if you see a spike.</Li>
              <Li>High cancellation rate at PENDING → CANCELLED indicates buyers are placing test orders or listing quality issues (item description doesn&apos;t match photos).</Li>
            </Ul>
          ),
        },
        {
          title: "Product Performance",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Top products by orders</Span>: Which products drive the most completed transactions.</Li>
              <Li><Span weight="bold">Top products by views</Span>: High views but low orders may indicate pricing, photos, or description issues.</Li>
              <Li><Span weight="bold">Return rate</Span>: Products with &gt;10% return rate need review — usually a condition description or photo quality issue.</Li>
            </Ul>
          ),
        },
        {
          title: "Store-Level Metrics",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Filter analytics by store to see individual seller performance. Available metrics:</Text>
              <Ul className="list-inside text-[var(--appkit-color-text-muted)]" marker="disc" spacing="tight" size="sm">
                <Li>Total orders and completion rate</Li>
                <Li>Average order value</Li>
                <Li>Return and refund rate</Li>
                <Li>Average seller rating</Li>
                <Li>Payout history</Li>
              </Ul>
              <Alert variant="info" className="mt-4">
                Store analytics are visible to the store owner in their seller dashboard. Admin sees the full platform view. Do not share a specific store&apos;s metrics with other stores.
              </Alert>
            </>
          ),
        },
      ].map(({ title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
          <Row className="border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="inlineLg" align="center" gap="3">
            <BarChart2 className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div className="py-5" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
