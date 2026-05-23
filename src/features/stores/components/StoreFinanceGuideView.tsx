import React from "react";
import { ArrowLeft } from "lucide-react";
import { Alert, Div, Heading, Section, Span, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";

const SUBHEADING = "mb-1 font-semibold text-[var(--appkit-color-text)]";
const LIST_DISC = "list-disc leading-relaxed";
const SECTION_BODY = "space-y-4 text-sm text-[var(--appkit-color-text-muted)]";
const MONO_MUTED = "font-mono text-xs text-[var(--appkit-color-text-muted)]";

// -- Section wrapper -----------------------------------------------------------

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-6 shadow-sm">
      <Heading level={2} className="mb-4 text-lg font-semibold text-[var(--appkit-color-text)]">
        {title}
      </Heading>
      {children}
    </Section>
  );
}

// -- Section 1: Commission structure ------------------------------------------

function CommissionSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>How it works</Text>
        <Text className="leading-relaxed">
          LetItRip deducts a platform fee from every completed order before paying out to you.
          The current fee rate is shown in your store Settings → Finance page and in the platform site settings.
          Custom commission rates are available to high-volume sellers — see the Capabilities guide for details.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Worked example</Text>
        <Div className="rounded-lg border border-[var(--appkit-color-border)] p-4 font-mono text-xs space-y-1">
          <Text className={MONO_MUTED}>
            Order total: ₹1,000.00
          </Text>
          <Text className={MONO_MUTED}>
            Platform fee (e.g. 5%): − ₹50.00
          </Text>
          <Text className={MONO_MUTED}>
            Payment processing (Razorpay ~2%): − ₹20.00
          </Text>
          <Div className="border-t border-[var(--appkit-color-border)] pt-1">
            <Text className="font-mono text-xs font-semibold text-[var(--appkit-color-text)]">
              Seller receives: ≈ ₹930.00
            </Text>
          </Div>
        </Div>
        <Text className="text-xs text-[var(--appkit-color-text-muted)] mt-2">
          Exact amounts depend on the current platform fee configured in Site Settings.
          Razorpay charges vary by payment method (UPI is lowest).
        </Text>
      </Div>
      <Alert variant="info" title="Shipping is separate">
        Shipping costs you charge buyers are passed through in full — the platform fee applies
        only to the product price, not the shipping amount.
      </Alert>
    </Div>
  );
}

// -- Section 2: Payout cycle --------------------------------------------------

const PAYOUT_STATUSES = [
  { status: "PENDING", note: "Orders delivered this week — awaiting batch processing on Sunday." },
  { status: "PROCESSING", note: "Batch being processed — funds being transferred to your account." },
  { status: "PAID", note: "Funds sent. UPI arrives same day; bank transfer 1–2 business days." },
  { status: "FAILED", note: "Transfer failed — usually a stale UPI ID or closed account. Update payoutDetails in Settings and contact support." },
];

function PayoutCycleSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>When payouts are processed</Text>
        <Text className="leading-relaxed">
          Payouts are processed weekly on Sunday. Orders included are those that reached DELIVERED status
          at least 7 days before the batch date (the settlement delay). This delay ensures time for
          return requests and fraud checks before funds are released.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Payout statuses</Text>
        <Div className="space-y-2">
          {PAYOUT_STATUSES.map(({ status, note }) => (
            <Div key={status} className="flex gap-3">
              <Text className="shrink-0 font-mono font-semibold text-[var(--appkit-color-text)] w-24">{status}</Text>
              <Text className="text-[var(--appkit-color-text-muted)]">{note}</Text>
            </Div>
          ))}
        </Div>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Minimum payout threshold</Text>
        <Text className="leading-relaxed">
          Payouts below the minimum threshold (visible in your Finance settings) are rolled over to the next week.
          There is no penalty for rolling over — it accumulates until the threshold is met.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Where to view payout history</Text>
        <Text className="leading-relaxed">
          Go to your Store Dashboard → Finance → Payouts. Each payout shows the date range, orders included,
          gross amount, fee deducted, and net amount received.
        </Text>
      </Div>
    </Div>
  );
}

// -- Section 3: Coupons -------------------------------------------------------

const COUPON_FIELDS = [
  {
    field: "Type",
    detail: "percentage (% off), fixed (₹ off), free_shipping (removes shipping charge), buy_x_get_y (buy N items, get M free or discounted).",
  },
  {
    field: "Value",
    detail: "The discount amount. For percentage: 0–100. For fixed: amount in ₹. For buy_x_get_y: the N and M counts.",
  },
  {
    field: "Max discount",
    detail: "For percentage coupons — caps the maximum ₹ discount. E.g. 20% off but max ₹200.",
  },
  {
    field: "Min purchase",
    detail: "Minimum cart value before the coupon applies. Enforced at checkout.",
  },
  {
    field: "Total limit",
    detail: "Maximum number of times the coupon can be used across all buyers. Leave blank for unlimited.",
  },
  {
    field: "Per-user limit",
    detail: "Maximum uses per buyer account. Typically 1 for one-time welcome coupons.",
  },
  {
    field: "Start / End date",
    detail: "The validity window. Outside this window the coupon code is rejected at checkout.",
  },
  {
    field: "First-time user only",
    detail: "Restricts redemption to buyers with no prior completed orders on LetItRip.",
  },
  {
    field: "Combine with seller coupons",
    detail: "For admin coupons — whether they stack with a seller coupon on the same cart.",
  },
];

function CouponsSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>Admin coupons vs store coupons</Text>
        <ul className="space-y-1 pl-5">
          <li className={LIST_DISC}>
            <Span weight="bold" className="text-[var(--appkit-color-text)]">Admin coupons</Span> — created by LetItRip and apply platform-wide (all stores). You cannot create these.
          </li>
          <li className={LIST_DISC}>
            <Span weight="bold" className="text-[var(--appkit-color-text)]">Store coupons</Span> — created by you. Apply only to purchases from your store. You control the terms.
          </li>
          <li className={LIST_DISC}>
            Admin coupons and store coupons can stack if the admin coupon has "Combine with seller coupons" enabled. If not, only the better coupon is applied automatically.
          </li>
        </ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Coupon field reference</Text>
        <Div className="space-y-3">
          {COUPON_FIELDS.map(({ field, detail }) => (
            <Div key={field} className="flex gap-3">
              <Text className="shrink-0 w-32 font-semibold text-[var(--appkit-color-text)] text-sm">{field}</Text>
              <Text className="text-[var(--appkit-color-text-muted)] text-sm leading-relaxed">{detail}</Text>
            </Div>
          ))}
        </Div>
      </Div>
    </Div>
  );
}

// -- Section 4: Promoted & featured listings ----------------------------------

function PromotedSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>isPromoted — Deals & promoted sections</Text>
        <Text className="leading-relaxed">
          Promoted listings appear in the Deals carousel on the homepage and in search-result promoted slots.
          For most stores, this flag is set by a LetItRip admin. If you want a product promoted, contact
          support with the product slug and reason.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>isFeatured — Featured badge & priority</Text>
        <Text className="leading-relaxed">
          Featured listings get a "Featured" badge on their listing card and receive priority ordering
          in search results and category pages. Like isPromoted, this is admin-controlled for most stores.
          Stores with the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">manage_promoted_listings</code> capability
          can self-promote from their dashboard.
        </Text>
      </Div>
      <Alert variant="info" title="Promoted placement vs sponsored listings">
        LetItRip does not currently offer paid sponsored placements — promoted and featured flags are
        granted editorially by the LetItRip team based on listing quality and seller performance.
      </Alert>
    </Div>
  );
}

// -- Section 5: Taxes notice --------------------------------------------------

function TaxesSection() {
  return (
    <Div className={SECTION_BODY}>
      <Alert variant="warning" title="Seller tax responsibility">
        LetItRip is a marketplace platform. Each seller operates independently and is individually
        responsible for applicable taxes on their sales, including GST where required by Indian tax law.
        LetItRip does not collect or remit GST on your behalf. Consult a qualified tax advisor to
        understand your obligations based on your turnover and registration status.
      </Alert>
      <Text className="leading-relaxed">
        TCS (Tax Collected at Source) deducted by LetItRip under Section 194-O of the Income Tax Act
        will be reflected in your annual Form 26AS. Your gross payouts (before TCS) are visible in the
        Finance → Payouts dashboard.
      </Text>
    </Div>
  );
}

// -- Main view -----------------------------------------------------------------

export type StoreFinanceGuideViewProps = Record<string, never>;

export function StoreFinanceGuideView(_props: StoreFinanceGuideViewProps) {
  return (
    <Div className="space-y-6 pb-10">
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
        <Heading level={1} className="text-2xl font-bold text-[var(--appkit-color-text)]">
          Finance Guide
        </Heading>
        <Text className="mt-1 text-sm text-[var(--appkit-color-text-muted)]">
          Payouts, commissions, coupons, and promoted listings.
        </Text>
      </Div>

      {/* Sections */}
      <GuideSection title="1. Commission structure">
        <CommissionSection />
      </GuideSection>

      <GuideSection title="2. Payout cycle">
        <PayoutCycleSection />
      </GuideSection>

      <GuideSection title="3. Coupons">
        <CouponsSection />
      </GuideSection>

      <GuideSection title="4. Promoted & featured listings">
        <PromotedSection />
      </GuideSection>

      <GuideSection title="5. Taxes">
        <TaxesSection />
      </GuideSection>
    </Div>
  );
}
