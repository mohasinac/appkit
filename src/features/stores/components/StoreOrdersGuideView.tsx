import React from "react";
import { ArrowLeft } from "lucide-react";
import { Accordion, Alert, Code, Div, Heading, Li, Ol, Row, Section, Span, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Ul } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";

const SUBHEADING = "mb-1 font-semibold text-[var(--appkit-color-text)]";
const LIST_DISC = "list-disc leading-relaxed";
const SECTION_BODY = "space-y-4 text-sm text-[var(--appkit-color-text-muted)]";

// -- Section wrapper -----------------------------------------------------------

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="xl" shadow="sm" padding="lg">
      <Heading level={2} className="mb-4 text-[var(--appkit-color-text)]" size="lg" weight="semibold">
        {title}
      </Heading>
      {children}
    </Section>
  );
}

// -- Section 1: Order lifecycle ------------------------------------------------

const STATUS_LIFECYCLE = `
PENDING ──► PROCESSING ──► SHIPPED ──► DELIVERED
 │ │ │
 └──► CANCELLED │ └──► RETURN_REQUESTED ──► REFUNDED
 │
 └──► CANCELLED
`;

const STATUS_ROWS = [
  {
    status: "PENDING",
    meaning: "Order placed, payment received — awaiting your action.",
    action: 'Confirm stock availability, then click "Mark Processing".',
  },
  {
    status: "PROCESSING",
    meaning: "You have accepted and are preparing the item for dispatch.",
    action: 'Package the item. Enter tracking number + carrier, then click "Mark Shipped".',
  },
  {
    status: "SHIPPED",
    meaning: "Item is with the courier. Buyer can track delivery.",
    action: "Monitor tracking. No action required unless there is a problem.",
  },
  {
    status: "DELIVERED",
    meaning: "Courier confirms delivery. Buyer has their item.",
    action: "Payout is queued for the next settlement cycle.",
  },
  {
    status: "CANCELLED",
    meaning: "Order was cancelled before shipping (by buyer or seller).",
    action: "Refund is automatic via Razorpay (3–7 business days).",
  },
  {
    status: "RETURN_REQUESTED",
    meaning: "Buyer raised a return within the return window.",
    action: "Accept (triggers refund) or reject (triggers dispute SLA). See Section 5.",
  },
  {
    status: "REFUNDED",
    meaning: "Refund processed — order permanently closed.",
    action: "No further action. Payout for this order is withheld.",
  },
];

function OrderLifecycle() {
  return (
    <Stack gap="md">
      <Div textSize="xs" overflow="x-auto" className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-subtle,var(--appkit-color-border))/20] font-mono text-[var(--appkit-color-text-muted)] whitespace-pre" rounded="lg" padding="md">
        {STATUS_LIFECYCLE}
      </Div>
      <Stack gap="sm">
        {STATUS_ROWS.map(({ status, meaning, action }) => (
          <Div textSize="sm" key={status} className="border border-[var(--appkit-color-border)]" rounded="lg" padding="sm">
            <Row className="mb-1" align="center" gap="sm">
              <Text className="font-mono text-[var(--appkit-color-text)] w-28 shrink-0" weight="semibold">{status}</Text>
              <Text className="text-[var(--appkit-color-text-muted)]">{meaning}</Text>
            </Row>
            <Text className="pl-[7.5rem] text-[var(--appkit-color-text-muted)] italic" size="xs">
              → {action}
            </Text>
          </Div>
        ))}
      </Stack>
    </Stack>
  );
}

// -- Section 2: Processing an order -------------------------------------------

const PROCESSING_STEPS = [
  "Open the order from your Orders dashboard — click the order ID to view the detail page.",
  "Verify the item is in stock and matches the listing (condition, edition, grade).",
  'Click "Mark Processing" — this starts the fulfilment SLA clock and notifies the buyer.',
  "Package the item securely. Use appropriate padding for cards and fragile collectibles.",
  "Enter the tracking number and select the carrier in the Shipping tab of the order detail.",
  'Click "Mark Shipped" — the buyer receives a notification with the tracking number immediately.',
  "Share any additional tracking link in the order notes if the carrier app is easier to use.",
];

function ProcessingWalkthrough() {
  return (
    <Ol spacing="loose" indent="lg">
      {PROCESSING_STEPS.map((step, i) => (
        <Li key={i} textSize="sm" color="muted" className="list-decimal leading-relaxed">
          {step}
        </Li>
      ))}
    </Ol>
  );
}

// -- Section 3: Supported carriers --------------------------------------------

const CARRIERS = [
  { name: "Delhivery", sla: "2–5 business days (most metros next-day)" },
  { name: "Blue Dart", sla: "1–3 business days — premium, reliable for high-value items" },
  { name: "India Post Speed Post", sla: "3–7 business days — widest PIN coverage" },
  { name: "DTDC", sla: "2–5 business days" },
  { name: "Ekart (Flipkart)", sla: "2–4 business days" },
  { name: "XpressBees", sla: "2–4 business days — strong in Tier 2/3 cities" },
  { name: "Shadowfax", sla: "1–3 business days — good for urban same-day" },
];

function CarriersSection() {
  return (
    <Stack gap="3">
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
        Any carrier is accepted — enter the tracking number manually in the order detail.
        Buyers receive the tracking number as entered; they look it up on the carrier's website.
      </Text>
      <Div overflow="x-auto" className="-mx-6">
        <Table className="min-w-full" size="sm">
          <Thead>
            <Tr className="border-b border-[var(--appkit-color-border)]">
              <Th weight="semibold" padding="lg-3" className="text-left text-[var(--appkit-color-text)]">Carrier</Th>
              <Th weight="semibold" padding="lg-3" className="text-left text-[var(--appkit-color-text)]">Typical SLA</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-[var(--appkit-color-border)]">
            {CARRIERS.map(({ name, sla }) => (
              <Tr key={name}>
                <Td weight="medium" padding="lg-3" className="text-[var(--appkit-color-text)]">{name}</Td>
                <Td padding="lg-3" className="text-[var(--appkit-color-text-muted)]">{sla}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Div>
      <Alert variant="info" title="Tip: insurance for high-value shipments">
        For items above ₹5,000, consider using a carrier that offers shipment insurance (Blue Dart, Delhivery Premium).
        Document the item with photos before sealing the package — this is your evidence if a damage claim arises.
      </Alert>
    </Stack>
  );
}

// -- Section 4: Cancellations -------------------------------------------------

function CancellationsSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>Who can cancel</Text>
        <Ul spacing="tight" indent="lg">
          <Li className={LIST_DISC}>
            <Span weight="bold">Buyer</Span> — can self-cancel any time before the order reaches SHIPPED status.
          </Li>
          <Li className={LIST_DISC}>
            <Span weight="bold">Seller (you)</Span> — can cancel any time before SHIPPED (e.g. item found damaged during packaging).
          </Li>
          <Li className={LIST_DISC}>
            <Span weight="bold">LetItRip admin</Span> — can force-cancel at any status for policy violations or unresolved disputes.
          </Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Refund timeline</Text>
        <Text className="leading-relaxed">
          Cancellation triggers an automatic Razorpay refund. Funds typically reach the buyer in
          <Span weight="bold"> 3–7 business days</Span> depending on the payment method (UPI is usually 1–2 business days).
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Already shipped?</Text>
        <Text className="leading-relaxed">
          If you have already dispatched the item but the order is still PROCESSING (tracking not yet entered),
          enter the tracking number and mark it SHIPPED first — then contact the buyer via order notes.
          Do not cancel after shipping; work with the buyer to return the item through the normal return flow.
        </Text>
      </Div>
      <Alert variant="warning" title="Repeated cancellations affect your rating">
        Cancelling more than 5% of your orders per month will reduce your store rating and may result in listing restrictions.
        Only cancel if you genuinely cannot fulfil — never as a price-change workaround.
      </Alert>
    </Div>
  );
}

// -- Section 5: Return requests -----------------------------------------------

function ReturnsSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>When a buyer can raise a return</Text>
        <Text className="leading-relaxed">
          Buyers can open a return request within the <Span weight="bold">return window</Span> after the order is marked DELIVERED.
          The default return window is 7 days. Stores with the <Code size="xs" padding="xs" rounded="default" surface="subtle">extended_return_window</Code> capability can offer 30 days.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>What you see</Text>
        <Ul spacing="tight" indent="lg">
          <Li className={LIST_DISC}>The buyer's reason for return (pre-defined category + optional description).</Li>
          <Li className={LIST_DISC}>Photos of the item as received.</Li>
          <Li className={LIST_DISC}>A 3-day SLA to respond before LetItRip mediates.</Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Accepting a return</Text>
        <Text className="leading-relaxed">
          Click "Accept return" in the order detail. The buyer will receive a return shipping label or instructions.
          Once the item is received by you and you confirm it, the refund is triggered automatically via Razorpay.
          The payout for this order is withheld.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Rejecting a return</Text>
        <Text className="leading-relaxed">
          You can reject a return request with a reason. If the buyer disagrees, they can escalate to LetItRip support.
          LetItRip will mediate — if the evidence supports the buyer, the return will be approved regardless of your rejection.
          Unjustified rejections count against your seller rating.
        </Text>
      </Div>
    </Div>
  );
}

// -- Section 6: Auction orders ------------------------------------------------

function AuctionOrdersSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>Payment window</Text>
        <Text className="leading-relaxed">
          Auction winners have <Span weight="bold">48 hours</Span> from auction end to complete payment.
          You will receive a notification when the auction closes and again when the winner pays.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>If the winner does not pay</Text>
        <Ul spacing="tight" indent="lg">
          <Li className={LIST_DISC}>The order is automatically cancelled after 48 hours.</Li>
          <Li className={LIST_DISC}>You are notified. The winner may receive a bid restriction on their account.</Li>
          <Li className={LIST_DISC}>If "offer to next bidder" is enabled in your auction settings, the next-highest bidder is contacted automatically.</Li>
          <Li className={LIST_DISC}>You can re-list the item immediately.</Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Fulfilment after payment</Text>
        <Text className="leading-relaxed">
          Once the auction order is paid, it enters PENDING status — the same fulfilment flow as a standard order applies.
          Process and ship within your stated dispatch time.
        </Text>
      </Div>
      <Alert variant="info" title="Auction orders cannot be cancelled by the buyer">
        Unlike standard orders, auction orders cannot be self-cancelled by the buyer after payment.
        If a buyer requests a cancel, it requires seller approval. Treat winning bids as binding commitments.
      </Alert>
    </Div>
  );
}

// -- Section 7: Common questions (FAQ collapsibles) ----------------------------

const FAQS = [
  {
    q: "What if the buyer claims non-delivery but tracking shows delivered?",
    a: "Do not cancel immediately. Ask the buyer to check with neighbours and at the nearest post office or courier depot. If after 5 days the parcel is still missing, contact the carrier to file a trace. If the trace confirms loss, you may need to refund — document everything and contact LetItRip support if needed.",
  },
  {
    q: "Can I cancel an order after I've already shipped it?",
    a: "No — once the order is marked SHIPPED, you cannot cancel it. If you shipped the wrong item or need to resolve an issue, use the order notes to communicate with the buyer and initiate a return via normal channels after delivery.",
  },
  {
    q: "What if I run out of stock on a pre-order?",
    a: "You must notify the buyer immediately via order notes and initiate cancellation from the order detail page. Refund is automatic. Repeated pre-order cancellations due to stock issues may result in the pre-order listing capability being reviewed.",
  },
  {
    q: "How do I handle a partial order if I sold multiple items?",
    a: "Currently each product listing creates a separate order. If you sold a bundle, the bundle order must be fulfilled as a single shipment. If one item in a bundle is unavailable, contact the buyer and LetItRip support — partial fulfilment is not supported in the standard flow.",
  },
];

function CommonFAQs() {
  return (
    <Stack gap="3">
      {FAQS.map(({ q, a }) => (
        <Accordion key={q} title={q}>
          <Text className="text-[var(--appkit-color-text-muted)] leading-relaxed" size="sm">{a}</Text>
        </Accordion>
      ))}
    </Stack>
  );
}

// -- Main view -----------------------------------------------------------------

export type StoreOrdersGuideViewProps = Record<string, never>;

export function StoreOrdersGuideView(_props: StoreOrdersGuideViewProps) {
  return (
    <Stack gap="lg" padding="b-2xl">
      {/* Back nav */}
      <a
        href={String(ROUTES.STORE.GUIDE)}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Seller Guide
      </a>

      {/* Page title */}
      <Div>
        <Heading level={1} className="text-[var(--appkit-color-text)]" size="2xl" weight="bold">
          Orders & Fulfilment Guide
        </Heading>
        <Text className="mt-1 text-[var(--appkit-color-text-muted)]" size="sm">
          Processing orders, shipping, cancellations, returns, and auction orders.
        </Text>
      </Div>

      {/* Sections */}
      <GuideSection title="1. Order lifecycle">
        <OrderLifecycle />
      </GuideSection>

      <GuideSection title="2. Processing an order">
        <ProcessingWalkthrough />
      </GuideSection>

      <GuideSection title="3. Supported carriers">
        <CarriersSection />
      </GuideSection>

      <GuideSection title="4. Cancellations">
        <CancellationsSection />
      </GuideSection>

      <GuideSection title="5. Return requests">
        <ReturnsSection />
      </GuideSection>

      <GuideSection title="6. Auction orders">
        <AuctionOrdersSection />
      </GuideSection>

      <GuideSection title="7. Common questions">
        <CommonFAQs />
      </GuideSection>
    </Stack>
  );
}
