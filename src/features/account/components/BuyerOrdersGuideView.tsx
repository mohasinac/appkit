import React from "react";
import { PackageCheck, Truck, Camera, RotateCcw, Clock, Headphones, Scale } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";
import { GC } from "../../_guide-cls";

// ─── Section data ─────────────────────────────────────────────────────────────

const ORDER_STATUSES = [
  { status: "PENDING", desc: "Payment received. Seller has been notified. You can cancel at this stage." },
  { status: "PROCESSING", desc: "Seller is packing your item. Cancellation window has closed." },
  { status: "SHIPPED", desc: "Item dispatched. Tracking number available in your order detail." },
  { status: "DELIVERED", desc: "Carrier confirmed delivery. Return window (7 days) starts from this date." },
  { status: "RETURN_REQUESTED", desc: "You have opened a return request. Awaiting seller response." },
  { status: "REFUNDED", desc: "Return accepted and refund issued." },
  { status: "CANCELLED", desc: "Order was cancelled before shipping (by you, the seller, or automatically)." },
];

interface OrderSection {
  Icon: React.ComponentType<{ className?: string }>;
  iconCls?: string;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: OrderSection[] = [
  {
    Icon: PackageCheck, title: "Order Lifecycle",
    content: (
      <Div className="space-y-4 text-sm">
        <Text className={GC.textMuted}>Every order on LetItRip moves through these statuses:</Text>
        <Div className="space-y-2">
          {ORDER_STATUSES.map(({ status, desc }) => (
            <Div key={status} className="flex gap-3">
              <Text className="flex-shrink-0 font-mono text-[var(--appkit-color-primary)] w-36" size="xs" weight="semibold">{status}</Text>
              <Text className={GC.textMuted}>{desc}</Text>
            </Div>
          ))}
        </Div>
      </Div>
    ),
  },
  {
    Icon: Truck, title: "Tracking Your Order",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>Once your order is SHIPPED, go to <Span weight="bold">My Orders → [Order] → Tracking</Span> tab. Your tracking number and carrier name are shown there.</Text>
        <Text className={GC.textMuted}>Paste the tracking number into the carrier&apos;s website for real-time updates. Common carriers: Shiprocket, Delhivery, BlueDart, India Post, Ekart.</Text>
        <Text className={GC.textMuted}>Typical delivery times: 2–5 days metro cities, 5–10 days remote areas, 7–14 days for pre-orders subject to supplier shipping.</Text>
      </Div>
    ),
  },
  {
    Icon: Camera, iconCls: "w-5 h-5 text-amber-500", title: "Wrong or Damaged Item",
    content: (
      <>
        <Alert variant="warning" title="Do NOT refuse delivery.">
          Accept the parcel, then photograph it immediately — both the packaging and the contents before and after unwrapping. This evidence is required for any return or damage claim.
        </Alert>
        <Text className={`${GC.textMuted} mt-4`}>After photographing, open a <Span weight="bold">return request within 2 days of delivery</Span> and attach your photos.</Text>
      </>
    ),
  },
  {
    Icon: RotateCcw, title: "Return Policy",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>Platform-wide return window: <Span weight="bold">7 days from DELIVERED date</Span>. Some stores offer 30-day windows — shown on the product page.</Text>
        <Text className="text-[var(--appkit-color-text)]" size="sm" weight="semibold">Non-returnable items:</Text>
        <ul className={GC.listDiscMuted}>
          <li>Opened card packs (Pokémon, Yu-Gi-Oh!, etc.)</li>
          <li>Cracked or opened graded card slabs without documented photographic evidence of a defect</li>
          <li>Items explicitly marked &quot;Final Sale&quot; on the listing</li>
        </ul>
      </Div>
    ),
  },
  {
    Icon: Clock, title: "Refund Timeline",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>After the seller accepts your return and confirms receipt of the item:</Text>
        <ul className={GC.listMuted}>
          <li><Span weight="bold" className={GC.textStrong}>Credit/debit card</Span> — 3–7 business days back to your card via Razorpay.</li>
          <li><Span weight="bold" className={GC.textStrong}>UPI</Span> — typically 1–2 business days.</li>
          <li><Span weight="bold" className={GC.textStrong}>Net banking</Span> — 3–5 business days.</li>
        </ul>
        <Text className={GC.textMuted}>Refunds go back to the original payment method. LetItRip does not issue platform credits in lieu of a refund unless both parties agree.</Text>
      </Div>
    ),
  },
  {
    Icon: Headphones, title: "Opening a Support Ticket",
    content: (
      <Div className="space-y-3">
        <Text className="text-[var(--appkit-color-text)]" size="sm" weight="semibold">When to use a support ticket:</Text>
        <ul className={GC.listDiscMuted}>
          <li>Seller is unresponsive to your return request for more than 3 days</li>
          <li>Tracking has not updated in 7+ days</li>
          <li>Item is significantly not as described</li>
        </ul>
        <Text className="text-[var(--appkit-color-text)]" size="sm" weight="semibold">What to include:</Text>
        <ul className={GC.listDiscMuted}>
          <li>Your order ID (e.g. <code className={GC.code}>order-2-20260508-a1b2c3</code>)</li>
          <li>Photos of the item and packaging</li>
          <li>A clear timeline of events</li>
        </ul>
        <Text className={GC.textMuted}>Response SLA: 24–48 hours. You can have up to 2 active general tickets and 1 additional ticket per active order.</Text>
      </Div>
    ),
  },
  {
    Icon: Scale, title: "Dispute Escalation",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>If the seller does not respond to your return request within <Span weight="bold">3 days</Span>, LetItRip&apos;s support team steps in to mediate.</Text>
        <Text className={GC.textMuted}>If mediation cannot resolve the dispute, LetItRip issues a <Span weight="bold">full platform-funded refund</Span> to the buyer. The seller&apos;s payout for that order is withheld.</Text>
        <Alert variant="info">
          All dispute decisions are final. False dispute claims may result in account restrictions. Always provide accurate, photographic evidence when raising a dispute.
        </Alert>
      </Div>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyerOrdersGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" rounded="xl" style={{ background: GC.pageHeaderGradient }}>
            <PackageCheck className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Buyer Guide</Text>
        </Div>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">
          Orders, Returns &amp; Support
        </Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">
          From placing an order to getting a refund — everything you need to know about managing your orders on LetItRip.
        </Text>
      </Section>

      {SECTIONS.map(({ Icon, iconCls, title, content }) => (
        <Section key={title} className={GC.sectionWrap}>
          <Div className={GC.sectionHeader}>
            <Icon className={iconCls ?? GC.iconPrimary} />
            <Heading level={2} className={GC.sectionTitle}>{title}</Heading>
          </Div>
          <Div className={GC.sectionBody}>{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
