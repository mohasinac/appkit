import React from "react";
import { ShoppingBag, Hash, Scale, Wallet, RotateCcw, DollarSign, Gavel } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminOrdersGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <ShoppingBag className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">Orders &amp; Finance</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Order statuses, payouts, disputes, returns, and commission math on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: ShoppingBag, title: "Order Statuses",
          content: (
            <Stack className="text-sm" gap="sm">
              {[
                ["PENDING", "Payment received. Can still be cancelled by buyer or admin."],
                ["PROCESSING", "Seller has acknowledged and is packing."],
                ["SHIPPED", "Dispatched. Tracking number provided by seller."],
                ["DELIVERED", "Carrier confirmed delivery."],
                ["RETURN_REQUESTED", "Buyer opened a return. Seller has 3 days to respond."],
                ["REFUNDED", "Return accepted and refund issued via Razorpay."],
                ["CANCELLED", "Cancelled before shipping. Payment returned."],
              ].map(([status, note]) => (
                <Div key={status} className="flex gap-3">
                  <Text className="flex-shrink-0 font-mono text-[var(--appkit-color-primary)] w-40" size="xs" weight="semibold">{status}</Text>
                  <Text className="text-[var(--appkit-color-text-muted)]">{note}</Text>
                </Div>
              ))}
              <Text className="text-[var(--appkit-color-text-muted)] pt-2" size="sm">Admin-only transitions: force-cancel (any status before DELIVERED), force-refund (post-DELIVERED dispute).</Text>
            </Stack>
          ),
        },
        {
          Icon: Hash, title: "Order ID Format",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                Format: <Code size="xs" padding="inline" rounded="default" surface="subtle">order-&#123;itemCount&#125;-&#123;YYYYMMDD&#125;-&#123;rand6&#125;</Code>
              </Text>
              <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                The item count in the ID enables quick triage — a <Code size="xs" padding="xs" rounded="default" surface="subtle">order-8-...</Code> is a large multi-item order that needs more careful handling than a <Code size="xs" padding="xs" rounded="default" surface="subtle">order-1-...</Code>. Search by order ID in the admin panel using the full ID string.
              </Text>
            </>
          ),
        },
        {
          Icon: Scale, title: "Intervening in a Dispute",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Admin steps in when: seller is unresponsive for 3+ days on a return, or buyer escalates via support ticket.</Li>
              <Li>Admin dispute tools: <Span weight="bold">force-accept return</Span> (moves to REFUNDED and withholds seller payout), <Span weight="bold">platform credit</Span> (future feature).</Li>
              <Li>Document your reasoning in the support ticket before taking any force action.</Li>
            </Ul>
          ),
        },
        {
          Icon: Wallet, title: "Payouts",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Payout cycle</Span>: Weekly. All DELIVERED orders (minus platform commission) are batched into a single payout per store.</Li>
              <Li><Span weight="bold">Status flow</Span>: PENDING → PROCESSING → PAID / FAILED.</Li>
              <Li><Span weight="bold">FAILED payout</Span>: Check the store&apos;s <Code size="xs" padding="xs" rounded="default" surface="subtle">payoutDetails</Code> — UPI VPA or bank details may be stale. Contact the seller via their store email before retrying.</Li>
              <Li><Span weight="bold">ordersIncluded</Span>: Array of order IDs bundled in this payout batch — use to audit which orders are covered.</Li>
            </Ul>
          ),
        },
        {
          Icon: RotateCcw, title: "Return Requests",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Admin can view the return reason and attached photos on the order detail page.</Li>
              <Li><Span weight="bold">When to override a seller rejection</Span>: Only when photographic evidence clearly supports the buyer&apos;s claim of a significant not-as-described defect. Do not override for buyer&apos;s remorse.</Li>
              <Li>After admin override: refund is issued automatically via Razorpay (3–7 business days for card, 1–2 for UPI). Seller payout for that order is withheld.</Li>
            </Ul>
          ),
        },
        {
          Icon: DollarSign, title: "Commission & Settlement Math",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">platformFee</Span>: Set in <Code size="xs" padding="xs" rounded="default" surface="subtle">siteSettings.fees.platformFee</Code> (percentage). Applied to the order&apos;s item subtotal.</Li>
              <Li><Span weight="bold">customCommissionRate</Span>: Stored on <Code size="xs" padding="xs" rounded="default" surface="subtle">StoreDocument</Code> for stores with the <Code size="xs" padding="xs" rounded="default" surface="subtle">lower_commission_rate</Code> capability. Overrides the platform default for that store.</Li>
              <Li>Payout = order subtotal × (1 − commission rate). Shipping fees are passed through to the seller at cost.</Li>
            </Ul>
          ),
        },
        {
          Icon: Gavel, title: "Auction Settlement",
          content: (
            <Ul className={GC.listMuted}>
              <Li>When an auction ends and the winner does not pay within 48 hours: the order auto-cancels and the system notifies the next-highest bidder.</Li>
              <Li>If the auto-cancel system fails (rare), admin can manually cancel from the order detail page and trigger the next-bidder flow via a support action.</Li>
              <Li>Repeat non-paying winners can receive a <Code size="xs" padding="xs" rounded="default" surface="subtle">place_bids</Code> soft ban from the Trust &amp; Safety section.</Li>
            </Ul>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
          <Row className="border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="inlineLg" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div className="py-5" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
