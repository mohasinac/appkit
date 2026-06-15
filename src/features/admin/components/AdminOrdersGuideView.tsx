import React from "react";
import { ShoppingBag, Hash, Scale, Wallet, RotateCcw, DollarSign, Gavel } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminOrdersGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <ShoppingBag className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl text-[var(--appkit-color-text)] mb-2" weight="bold">Orders &amp; Finance</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Order statuses, payouts, disputes, returns, and commission math on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: ShoppingBag, title: "Order Statuses",
          content: (
            <Div className="space-y-2 text-sm">
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
            </Div>
          ),
        },
        {
          Icon: Hash, title: "Order ID Format",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                Format: <code className="text-xs bg-[var(--appkit-color-border)] px-1 py-0.5 rounded">order-&#123;itemCount&#125;-&#123;YYYYMMDD&#125;-&#123;rand6&#125;</code>
              </Text>
              <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                The item count in the ID enables quick triage — a <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">order-8-...</code> is a large multi-item order that needs more careful handling than a <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">order-1-...</code>. Search by order ID in the admin panel using the full ID string.
              </Text>
            </>
          ),
        },
        {
          Icon: Scale, title: "Intervening in a Dispute",
          content: (
            <ul className={GC.listMuted}>
              <li>Admin steps in when: seller is unresponsive for 3+ days on a return, or buyer escalates via support ticket.</li>
              <li>Admin dispute tools: <Span weight="bold">force-accept return</Span> (moves to REFUNDED and withholds seller payout), <Span weight="bold">platform credit</Span> (future feature).</li>
              <li>Document your reasoning in the support ticket before taking any force action.</li>
            </ul>
          ),
        },
        {
          Icon: Wallet, title: "Payouts",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">Payout cycle</Span>: Weekly. All DELIVERED orders (minus platform commission) are batched into a single payout per store.</li>
              <li><Span weight="bold">Status flow</Span>: PENDING → PROCESSING → PAID / FAILED.</li>
              <li><Span weight="bold">FAILED payout</Span>: Check the store&apos;s <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">payoutDetails</code> — UPI VPA or bank details may be stale. Contact the seller via their store email before retrying.</li>
              <li><Span weight="bold">ordersIncluded</Span>: Array of order IDs bundled in this payout batch — use to audit which orders are covered.</li>
            </ul>
          ),
        },
        {
          Icon: RotateCcw, title: "Return Requests",
          content: (
            <ul className={GC.listMuted}>
              <li>Admin can view the return reason and attached photos on the order detail page.</li>
              <li><Span weight="bold">When to override a seller rejection</Span>: Only when photographic evidence clearly supports the buyer&apos;s claim of a significant not-as-described defect. Do not override for buyer&apos;s remorse.</li>
              <li>After admin override: refund is issued automatically via Razorpay (3–7 business days for card, 1–2 for UPI). Seller payout for that order is withheld.</li>
            </ul>
          ),
        },
        {
          Icon: DollarSign, title: "Commission & Settlement Math",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">platformFee</Span>: Set in <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">siteSettings.fees.platformFee</code> (percentage). Applied to the order&apos;s item subtotal.</li>
              <li><Span weight="bold">customCommissionRate</Span>: Stored on <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">StoreDocument</code> for stores with the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">lower_commission_rate</code> capability. Overrides the platform default for that store.</li>
              <li>Payout = order subtotal × (1 − commission rate). Shipping fees are passed through to the seller at cost.</li>
            </ul>
          ),
        },
        {
          Icon: Gavel, title: "Auction Settlement",
          content: (
            <ul className={GC.listMuted}>
              <li>When an auction ends and the winner does not pay within 48 hours: the order auto-cancels and the system notifies the next-highest bidder.</li>
              <li>If the auto-cancel system fails (rare), admin can manually cancel from the order detail page and trigger the next-bidder flow via a support action.</li>
              <li>Repeat non-paying winners can receive a <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">place_bids</code> soft ban from the Trust &amp; Safety section.</li>
            </ul>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="rounded-2xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden">
          <Div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Div>
          <Div className="px-6 py-5">{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
