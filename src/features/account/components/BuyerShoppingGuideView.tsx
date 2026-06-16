import React from "react";
import { ShoppingBag, ShoppingCart, CreditCard, Tag, CheckCircle, UserX } from "lucide-react";
import { Alert, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

// ─── Section data ─────────────────────────────────────────────────────────────

interface ShoppingSection {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: ShoppingSection[] = [
  {
    Icon: ShoppingBag, title: "Browsing & Search",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>
          Use the search bar at the top of any page to find items by keyword — e.g. &quot;Charizard Base Set&quot;, &quot;Hot Wheels Redline&quot;, or &quot;Beyblade Burst&quot;. Combine keywords for best results.
        </Text>
        <Text className="text-[var(--appkit-color-text)] mb-2" size="sm" weight="semibold">Available filters:</Text>
        <Ul className={GC.listDiscMuted}>
          <Li><Span weight="bold">Category</Span> — Trading Cards, Action Figures, Diecast, Spinning Tops, Model Kits, Vintage &amp; Rare</Li>
          <Li><Span weight="bold">Brand</Span> — Pokémon Company, Bandai, Hot Wheels, Hasbro, Funko, and more</Li>
          <Li><Span weight="bold">Price range</Span> — set a minimum and maximum in rupees</Li>
          <Li><Span weight="bold">Condition</Span> — grades 1–10 (10 = Gem Mint, 1 = Poor)</Li>
          <Li><Span weight="bold">Listing type</Span> — Standard / Auction / Pre-order</Li>
        </Ul>
        <Text className={`${GC.textMuted} mt-3`}>
          Sort options: Relevance, Price (Low to High), Price (High to Low), Newest First. On mobile, tap the Filter icon to open the filter drawer.
        </Text>
      </>
    ),
  },
  {
    Icon: ShoppingBag, title: "Reading a Product Page",
    content: (
      <Ul className={GC.listMuted}>
        <Li><Span weight="bold" className={GC.textStrong}>Images</Span> — tap or click to zoom; swipe left/right to browse all photos.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Condition grade</Span> — rated 1–10: 10 = PSA 10 Gem Mint (flawless), 9 = Mint, 8 = Near Mint–Mint, 7 = Near Mint, 5 = Heavily Played, 3 = Damaged, 1 = Poor.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Seller card</Span> — shows store name, rating, and total orders delivered. Click the store name to browse all their listings.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Reviews tab</Span> — verified buyer reviews with star ratings, photos, and seller responses.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Questions?</Span> — if listing details are unclear, open a support ticket and reference the product URL.</Li>
      </Ul>
    ),
  },
  {
    Icon: ShoppingCart, title: "Cart",
    content: (
      <Ul className={GC.listMuted}>
        <Li><Span weight="bold" className={GC.textStrong}>Adding items</Span> — click &quot;Add to Cart&quot; on any standard product or pre-order. Auctions have a &quot;Place Bid&quot; flow instead.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Guest cart</Span> — saved in your browser (localStorage); cleared after 30 days of inactivity.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Logged-in cart</Span> — synced to your account via Firestore; persists across all your devices.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Item limit</Span> — up to 20 items per cart. Remove items before adding more.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Updating</Span> — use the quantity selector or click the trash icon to remove. Changes sync instantly.</Li>
      </Ul>
    ),
  },
  {
    Icon: CreditCard, title: "Checkout",
    content: (
      <Ul className={GC.listMuted}>
        <Li><Span weight="bold" className={GC.textStrong}>Shipping address</Span> — enter or select a saved address. All fields required: full name, phone, address line, city, state, pin code.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Payment methods</Span> — UPI, credit/debit card (Visa, Mastercard, Rupay), net banking — all processed via Razorpay.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Secure checkout</Span> — LetItRip never stores your card details. All payment data is handled by Razorpay&apos;s PCI-DSS compliant gateway.</Li>
      </Ul>
    ),
  },
  {
    Icon: Tag, title: "Coupons",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>
          Enter your coupon code at step 2 of checkout (Order Summary). The discount is applied immediately and shown in the total.
        </Text>
        <Text className="text-[var(--appkit-color-text)] mb-2" size="sm" weight="semibold">Why a coupon might not apply:</Text>
        <Ul className={GC.listDiscMuted}>
          <Li>Your order total is below the coupon&apos;s minimum purchase amount</Li>
          <Li>The coupon has expired or hasn&apos;t started yet</Li>
          <Li>Your cart contains items from categories excluded by the coupon</Li>
          <Li>The coupon is &quot;first order only&quot; but you&apos;ve placed orders before</Li>
          <Li>You&apos;ve already used this coupon the maximum allowed times</Li>
        </Ul>
      </>
    ),
  },
  {
    Icon: CheckCircle, title: "Order Confirmation",
    content: (
      <>
        <Text className={GC.textMuted}>
          After a successful payment you&apos;ll see an on-screen confirmation with your order ID. You&apos;ll also receive:
        </Text>
        <Ul className={`${GC.listDiscMuted} mt-3`}>
          <Li>An email confirmation to your registered address</Li>
          <Li>A WhatsApp message if you&apos;ve added and verified your phone number</Li>
        </Ul>
        <Text className={`${GC.textMuted} mt-3`}>
          View all your orders at any time under <Span weight="bold">My Account → My Orders</Span>.
        </Text>
      </>
    ),
  },
  {
    Icon: UserX, title: "Guest Limitations",
    content: (
      <Alert variant="info" title="Browsing as a guest?">
        You can browse listings and add items to your cart as a guest. However, to <Span weight="bold">complete checkout</Span>, save your wishlist, or contact support you must be signed in. Creating an account takes under 30 seconds — just an email and a password.
      </Alert>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyerShoppingGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: GC.pageHeaderGradient }}>
            <ShoppingBag className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Buyer Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">
          Shopping &amp; Checkout
        </Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">
          Everything you need to know about finding, evaluating, and buying collectibles on LetItRip.
        </Text>
      </Section>

      {SECTIONS.map(({ Icon, title, content }) => (
        <Section key={title} className={GC.sectionWrap}>
          <Div className={GC.sectionHeader}>
            <Icon className={GC.iconPrimary} />
            <Heading level={2} className={GC.sectionTitle}>{title}</Heading>
          </Div>
          <Div className={GC.sectionBody}>{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
