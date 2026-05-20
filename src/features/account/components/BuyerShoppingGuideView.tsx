import React from "react";
import { ShoppingBag, ShoppingCart, CreditCard, Tag, CheckCircle, UserX } from "lucide-react";
import { Div, Heading, Text, Section, Alert } from "../../../ui";
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
        <Text className="text-sm font-semibold text-[var(--appkit-color-text)] mb-2">Available filters:</Text>
        <ul className={GC.listDiscMuted}>
          <li><strong>Category</strong> — Trading Cards, Action Figures, Diecast, Spinning Tops, Model Kits, Vintage &amp; Rare</li>
          <li><strong>Brand</strong> — Pokémon Company, Bandai, Hot Wheels, Hasbro, Funko, and more</li>
          <li><strong>Price range</strong> — set a minimum and maximum in rupees</li>
          <li><strong>Condition</strong> — grades 1–10 (10 = Gem Mint, 1 = Poor)</li>
          <li><strong>Listing type</strong> — Standard / Auction / Pre-order</li>
        </ul>
        <Text className={`${GC.textMuted} mt-3`}>
          Sort options: Relevance, Price (Low to High), Price (High to Low), Newest First. On mobile, tap the Filter icon to open the filter drawer.
        </Text>
      </>
    ),
  },
  {
    Icon: ShoppingBag, title: "Reading a Product Page",
    content: (
      <ul className={GC.listMuted}>
        <li><strong className={GC.textStrong}>Images</strong> — tap or click to zoom; swipe left/right to browse all photos.</li>
        <li><strong className={GC.textStrong}>Condition grade</strong> — rated 1–10: 10 = PSA 10 Gem Mint (flawless), 9 = Mint, 8 = Near Mint–Mint, 7 = Near Mint, 5 = Heavily Played, 3 = Damaged, 1 = Poor.</li>
        <li><strong className={GC.textStrong}>Seller card</strong> — shows store name, rating, and total orders delivered. Click the store name to browse all their listings.</li>
        <li><strong className={GC.textStrong}>Reviews tab</strong> — verified buyer reviews with star ratings, photos, and seller responses.</li>
        <li><strong className={GC.textStrong}>Questions?</strong> — if listing details are unclear, open a support ticket and reference the product URL.</li>
      </ul>
    ),
  },
  {
    Icon: ShoppingCart, title: "Cart",
    content: (
      <ul className={GC.listMuted}>
        <li><strong className={GC.textStrong}>Adding items</strong> — click &quot;Add to Cart&quot; on any standard product or pre-order. Auctions have a &quot;Place Bid&quot; flow instead.</li>
        <li><strong className={GC.textStrong}>Guest cart</strong> — saved in your browser (localStorage); cleared after 30 days of inactivity.</li>
        <li><strong className={GC.textStrong}>Logged-in cart</strong> — synced to your account via Firestore; persists across all your devices.</li>
        <li><strong className={GC.textStrong}>Item limit</strong> — up to 20 items per cart. Remove items before adding more.</li>
        <li><strong className={GC.textStrong}>Updating</strong> — use the quantity selector or click the trash icon to remove. Changes sync instantly.</li>
      </ul>
    ),
  },
  {
    Icon: CreditCard, title: "Checkout",
    content: (
      <ul className={GC.listMuted}>
        <li><strong className={GC.textStrong}>Shipping address</strong> — enter or select a saved address. All fields required: full name, phone, address line, city, state, pin code.</li>
        <li><strong className={GC.textStrong}>Payment methods</strong> — UPI, credit/debit card (Visa, Mastercard, Rupay), net banking — all processed via Razorpay.</li>
        <li><strong className={GC.textStrong}>Secure checkout</strong> — LetItRip never stores your card details. All payment data is handled by Razorpay&apos;s PCI-DSS compliant gateway.</li>
      </ul>
    ),
  },
  {
    Icon: Tag, title: "Coupons",
    content: (
      <>
        <Text className={`${GC.textMuted} mb-3`}>
          Enter your coupon code at step 2 of checkout (Order Summary). The discount is applied immediately and shown in the total.
        </Text>
        <Text className="text-sm font-semibold text-[var(--appkit-color-text)] mb-2">Why a coupon might not apply:</Text>
        <ul className={GC.listDiscMuted}>
          <li>Your order total is below the coupon&apos;s minimum purchase amount</li>
          <li>The coupon has expired or hasn&apos;t started yet</li>
          <li>Your cart contains items from categories excluded by the coupon</li>
          <li>The coupon is &quot;first order only&quot; but you&apos;ve placed orders before</li>
          <li>You&apos;ve already used this coupon the maximum allowed times</li>
        </ul>
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
        <ul className={`${GC.listDiscMuted} mt-3`}>
          <li>An email confirmation to your registered address</li>
          <li>A WhatsApp message if you&apos;ve added and verified your phone number</li>
        </ul>
        <Text className={`${GC.textMuted} mt-3`}>
          View all your orders at any time under <strong>My Account → My Orders</strong>.
        </Text>
      </>
    ),
  },
  {
    Icon: UserX, title: "Guest Limitations",
    content: (
      <Alert variant="info" title="Browsing as a guest?">
        You can browse listings and add items to your cart as a guest. However, to <strong>complete checkout</strong>, save your wishlist, or contact support you must be signed in. Creating an account takes under 30 seconds — just an email and a password.
      </Alert>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyerShoppingGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GC.pageHeaderGradient }}>
            <ShoppingBag className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-sm font-semibold text-[var(--appkit-color-text-muted)] uppercase tracking-widest">Buyer Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl font-bold text-[var(--appkit-color-text)] mb-2">
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
    </Div>
  );
}
