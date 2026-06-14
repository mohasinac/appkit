import React from "react";
import { BarChart2 } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminAnalyticsGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <BarChart2 className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-sm font-semibold text-[var(--appkit-color-text-muted)] uppercase tracking-widest">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl font-bold text-[var(--appkit-color-text)] mb-2">Analytics</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Revenue, order funnel, product performance, and store metrics on LetItRip.</Text>
      </Section>

      {[
        {
          title: "Revenue Dashboard",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">GMV (Gross Merchandise Value)</Span>: Total order subtotals across all stores. Does not deduct platform commission or refunds.</li>
              <li><Span weight="bold">Net Revenue</Span>: GMV × platformFee — refunded orders excluded.</li>
              <li><Span weight="bold">Period filter</Span>: Last 7 / 30 / 90 days, or custom date range. All monetary values shown in INR.</li>
              <li><Span weight="bold">Payout total</Span>: Total disbursed to sellers in the same period. Revenue - Payout = Platform earnings.</li>
            </ul>
          ),
        },
        {
          title: "Order Funnel",
          content: (
            <ul className={GC.listMuted}>
              <li>The funnel shows drop-off at each stage: Add to Cart → Checkout started → Payment initiated → Payment completed → Delivered.</li>
              <li>High drop-off at "Payment initiated → completed" often indicates a payment gateway issue or UX friction. Check Razorpay dashboard if you see a spike.</li>
              <li>High cancellation rate at PENDING → CANCELLED indicates buyers are placing test orders or listing quality issues (item description doesn&apos;t match photos).</li>
            </ul>
          ),
        },
        {
          title: "Product Performance",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">Top products by orders</Span>: Which products drive the most completed transactions.</li>
              <li><Span weight="bold">Top products by views</Span>: High views but low orders may indicate pricing, photos, or description issues.</li>
              <li><Span weight="bold">Return rate</Span>: Products with &gt;10% return rate need review — usually a condition description or photo quality issue.</li>
            </ul>
          ),
        },
        {
          title: "Store-Level Metrics",
          content: (
            <>
              <Text className="text-sm text-[var(--appkit-color-text-muted)] mb-3">Filter analytics by store to see individual seller performance. Available metrics:</Text>
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--appkit-color-text-muted)]">
                <li>Total orders and completion rate</li>
                <li>Average order value</li>
                <li>Return and refund rate</li>
                <li>Average seller rating</li>
                <li>Payout history</li>
              </ul>
              <Alert variant="info" className="mt-4">
                Store analytics are visible to the store owner in their seller dashboard. Admin sees the full platform view. Do not share a specific store&apos;s metrics with other stores.
              </Alert>
            </>
          ),
        },
      ].map(({ title, content }) => (
        <Section key={title} className="rounded-2xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden">
          <Div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20">
            <BarChart2 className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} className="text-base font-semibold text-[var(--appkit-color-text)]">{title}</Heading>
          </Div>
          <Div className="px-6 py-5">{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
