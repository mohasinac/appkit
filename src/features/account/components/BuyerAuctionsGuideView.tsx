import React from "react";
import { Gavel, TrendingUp, Trophy, AlertTriangle, Package, XCircle, ShieldCheck } from "lucide-react";
import { Alert, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

// ─── Section data ─────────────────────────────────────────────────────────────

interface AuctionSection {
  Icon: React.ComponentType<{ className?: string }>;
  iconCls?: string;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: AuctionSection[] = [
  {
    Icon: Gavel, title: "How Auctions Work",
    content: (
      <Ul className={GC.listMuted}>
        <Li><Span weight="bold" className={GC.textStrong}>Reserve price</Span> — the minimum amount the seller will accept. If bidding ends below the reserve, no sale occurs. You&apos;ll see &quot;Reserve not met&quot; on the listing.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Bid increment</Span> — each new bid must exceed the current highest bid by at least the set increment. The increment is shown on the listing.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Auction end time</Span> — displayed in your local timezone. Countdown timer shows hours and minutes remaining.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Auto-extend</Span> — if a bid is placed within the last 5 minutes of an auction, the end time extends by 5 minutes. This prevents last-second sniping and gives all bidders a fair chance.</Li>
      </Ul>
    ),
  },
  {
    Icon: TrendingUp, title: "Placing a Bid",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>Enter your bid amount — it must be at least the current high bid plus the increment — and click <Span weight="bold">Place Bid</Span>. You&apos;ll be asked to confirm.</Text>
        <Ul className={GC.listMuted}>
          <Li><Span weight="bold" className={GC.textStrong}>Outbid notification</Span> — you&apos;ll receive an in-app notification and email if someone outbids you.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>Max bid (proxy bidding)</Span> — enter the maximum you&apos;re willing to pay. LetItRip will automatically bid on your behalf up to that amount, in the minimum increments needed to keep you in the lead. Your max bid is never revealed to other bidders.</Li>
        </Ul>
        <Text className={`${GC.textMuted} mt-3`}>
          <Span weight="bold">Example:</Span> Current bid is ₹500, increment is ₹50. You set a max bid of ₹800. Your bid is placed at ₹550. If someone bids ₹600, the system auto-bids ₹650 for you — up to ₹800.
        </Text>
      </>
    ),
  },
  {
    Icon: Trophy, title: "Winning an Auction",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>When an auction ends and you&apos;re the highest bidder (above the reserve), you&apos;ve won.</Text>
        <Ul className={GC.listMuted}>
          <Li><Span weight="bold" className={GC.textStrong}>Payment window</Span> — you have <Span weight="bold">48 hours</Span> from the auction end time to complete payment.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>No payment</Span> — the order auto-cancels after 48 hours, you may receive a bid restriction, and the item may be offered to the next highest bidder.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>Winner badge</Span> — your winning order gets an &quot;Auction Winner&quot; badge in My Orders.</Li>
        </Ul>
      </>
    ),
  },
  {
    Icon: AlertTriangle, iconCls: "w-5 h-5 text-amber-500", title: "Bid Retraction Policy",
    content: (
      <Alert variant="warning">
        Bids on LetItRip are <Span weight="bold">binding</Span>. Only place a bid if you intend to pay. Retraction requires contacting support with a valid reason. Repeated retractions may result in a temporary restriction on placing new bids.
      </Alert>
    ),
  },
  {
    Icon: Package, title: "Pre-orders",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>A pre-order is an item not yet in stock. The seller takes deposits or full payment upfront and orders from their supplier in bulk once demand is confirmed.</Text>
        <Ul className={GC.listMuted}>
          <Li><Span weight="bold" className={GC.textStrong}>Deposit vs full price</Span> — check the listing. Some sellers take a partial deposit; others require full payment.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>Expected delivery date</Span> — shown on the listing. This is the seller&apos;s estimate based on supplier timelines — not a guaranteed date.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>&quot;Confirmed supplier&quot; status</Span> — some listings show this badge, meaning the seller has placed the order with their supplier and stock is secured.</Li>
        </Ul>
      </>
    ),
  },
  {
    Icon: XCircle, iconCls: "w-5 h-5 text-rose-500", title: "Pre-order Cancellations",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>To cancel a pre-order before the item is shipped, open a support ticket with category <Span weight="bold">Billing &amp; Payment</Span> or <Span weight="bold">Order Issue</Span> and reference your order ID.</Text>
        <Text className={GC.textMuted}>After cancellation is accepted, refunds follow the standard timeline: 3–7 business days to your original payment method.</Text>
      </>
    ),
  },
  {
    Icon: ShieldCheck, iconCls: "w-5 h-5 text-emerald-500", title: "Bidding Safety Tips",
    content: (
      <Alert variant="info">
        <Ul spacing="tight" size="sm">
          <Li>✓ Check the seller&apos;s rating and number of completed orders before bidding.</Li>
          <Li>✓ Read every product photo carefully — look for condition issues, especially on graded card slabs.</Li>
          <Li>✓ If authenticity is unclear, contact support before placing a bid — not after.</Li>
          <Li>✓ Set a max bid and stick to it. Bid heat is real — don&apos;t let excitement push you past your budget.</Li>
        </Ul>
      </Alert>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyerAuctionsGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: GC.pageHeaderGradient }}>
            <Gavel className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Buyer Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">
          Auctions &amp; Pre-orders
        </Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">
          How bidding works, how to win, and everything you need to know about pre-orders on LetItRip.
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
    </Stack>
  );
}
