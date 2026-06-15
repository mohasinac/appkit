import React from "react";
import { ArrowLeft } from "lucide-react";
import { Alert, Div, Heading, Section, Text } from "../../../ui";
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

// -- Section 1: What are capabilities -----------------------------------------

function WhatAreCapabilitiesSection() {
  return (
    <Div className={SECTION_BODY}>
      <Text className="leading-relaxed">
        Capabilities are per-store feature flags granted by the LetItRip team. They are not self-serve —
        they must be requested and approved. This gives LetItRip control over trust, quality, and platform safety
        as your store grows.
      </Text>
      <Text className="leading-relaxed">
        Two capabilities are enabled for every store at creation by default:
        <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded mx-1">suggest_brands</code> and
        <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded mx-1">create_coupons</code>.
        All others must be requested. Some require contractual agreements before they can be granted.
      </Text>
    </Div>
  );
}

// -- Section 2: Capability table ----------------------------------------------

const CAPABILITY_GROUPS = [
  {
    group: "Listing & Catalog",
    items: [
      { cap: "host_auctions", unlocks: "Create auction listings on your store.", defaultOn: false },
      { cap: "host_preorders", unlocks: "Create pre-order listings with deposit collection.", defaultOn: false },
      { cap: "create_categories", unlocks: "Request new product categories (goes to admin review).", defaultOn: false },
      { cap: "suggest_brands", unlocks: "Suggest new brands for the platform catalogue.", defaultOn: true },
      { cap: "create_coupons", unlocks: "Create store-level discount coupons.", defaultOn: true },
      { cap: "bulk_listing_import", unlocks: "Import products in bulk via CSV upload.", defaultOn: false },
      { cap: "extended_return_window", unlocks: "Offer buyers a 30-day return window (platform default: 7 days).", defaultOn: false },
    ],
  },
  {
    group: "Trust & Visibility",
    items: [
      { cap: "verified_seller", unlocks: "Shows a Verified badge on your store profile and listing cards.", defaultOn: false },
      { cap: "featured_placement", unlocks: "Your store is eligible to appear in featured store sections on the homepage.", defaultOn: false },
      { cap: "promotional_banner", unlocks: "Your store banner can be used in carousel and promotional homepage sections.", defaultOn: false },
      { cap: "priority_support", unlocks: "Your support tickets go to a dedicated queue with faster response SLA.", defaultOn: false },
    ],
  },
  {
    group: "Platform & Technical",
    items: [
      { cap: "multiple_stores", unlocks: "You (same owner) can create more than one store on LetItRip.", defaultOn: false },
      { cap: "custom_store_slug", unlocks: "Change your store URL slug after the 7-day post-creation lock period.", defaultOn: false },
      { cap: "api_access", unlocks: "Programmatic API credentials for advanced integrations (future).", defaultOn: false },
      { cap: "lower_commission_rate", unlocks: "Negotiated reduced platform fee. Requires a signed agreement and minimum volume.", defaultOn: false },
      { cap: "early_access_features", unlocks: "Access to beta features before they are publicly available.", defaultOn: false },
      { cap: "advanced_analytics", unlocks: "Cohort retention, basket analysis, and top-buyer breakdown (beyond summary stats).", defaultOn: false },
      { cap: "whatsapp_catalog_sync", unlocks: "Sync your store products to your WhatsApp Business Catalog automatically.", defaultOn: false },
    ],
  },
] as const;

function CapabilityTable() {
  return (
    <Div className="space-y-6">
      {CAPABILITY_GROUPS.map(({ group, items }) => (
        <Div key={group}>
          <Text className="tracking-wide text-[var(--appkit-color-text-muted)] mb-2" size="xs" weight="semibold" transform="uppercase">{group}</Text>
          <Div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--appkit-color-border)]">
                  <th className="px-6 py-2 text-left font-semibold text-[var(--appkit-color-text)]">Capability</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--appkit-color-text)]">What it unlocks</th>
                  <th className="px-6 py-2 text-left font-semibold text-[var(--appkit-color-text)] w-24">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--appkit-color-border)]">
                {items.map(({ cap, unlocks, defaultOn }) => (
                  <tr key={cap}>
                    <td className="px-6 py-2 font-mono text-xs text-[var(--appkit-color-text)] align-top whitespace-nowrap">{cap}</td>
                    <td className="px-6 py-2 text-[var(--appkit-color-text-muted)] align-top">{unlocks}</td>
                    <td className="px-6 py-2 align-top">
                      {defaultOn ? (
                        <span className="inline-block rounded-full bg-[var(--appkit-color-success)]/10 text-[var(--appkit-color-success)] text-xs px-2 py-0.5 font-medium">On</span>
                      ) : (
                        <span className="inline-block rounded-full bg-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] text-xs px-2 py-0.5 font-medium">Off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Div>
        </Div>
      ))}
    </Div>
  );
}

// -- Section 3: Locked feature guide ------------------------------------------

const LOCKED_FEATURES = [
  {
    cap: "host_auctions",
    missing: ["Create auction listings", "Set reserve prices and bid increments", "Auto-notify winner at auction end"],
    howToUnlock: "Contact support@letitrip.in with at least 10 delivered orders and 3 months of store activity. Our team reviews within 5 business days.",
    contractRequired: false,
  },
  {
    cap: "host_preorders",
    missing: ["Create pre-order listings with deposit", "Collect deposits at checkout", "Mark pre-order ready when stock arrives"],
    howToUnlock: "Contact support with proof of supplier relationship (purchase order or distributor invoice). Our team reviews within 5 business days.",
    contractRequired: false,
  },
  {
    cap: "lower_commission_rate",
    missing: ["Reduced platform fee (custom rate)", "Higher net margin per order"],
    howToUnlock: "Available to stores with ₹2L+ GMV per month. Contact your account manager or email partner@letitrip.in with your last 3 months' payout statements.",
    contractRequired: true,
  },
  {
    cap: "extended_return_window",
    missing: ["30-day return window shown to buyers", "Differentiated listing card badge"],
    howToUnlock: "Contact support with your store ID. Requires a minimum 4.5 average rating and 6+ months of store activity.",
    contractRequired: true,
  },
  {
    cap: "bulk_listing_import",
    missing: ["CSV batch upload for products", "Template download for bulk edits"],
    howToUnlock: "Contact support@letitrip.in — available to stores with verified status and 50+ published listings.",
    contractRequired: false,
  },
];

function LockedFeatureGuide() {
  return (
    <Div className="space-y-4">
      {LOCKED_FEATURES.map(({ cap, missing, howToUnlock, contractRequired }) => (
        <Div key={cap} className="border border-[var(--appkit-color-border)] space-y-2" rounded="lg" padding="md">
          <Div className="flex items-center gap-2">
            <Text className="font-mono text-[var(--appkit-color-text)]" size="sm" weight="semibold">{cap}</Text>
            {contractRequired && (
              <span className="inline-block rounded-full bg-[var(--appkit-color-warning)]/10 text-[var(--appkit-color-warning)] text-xs px-2 py-0.5 font-medium">Requires agreement</span>
            )}
          </Div>
          <Div>
            <Text className="text-[var(--appkit-color-text-muted)] mb-1" size="xs" weight="semibold">What you are missing:</Text>
            <ul className="pl-4 space-y-0.5">
              {missing.map((item) => (
                <li key={item} className={`text-sm text-[var(--appkit-color-text-muted)] ${LIST_DISC}`}>{item}</li>
              ))}
            </ul>
          </Div>
          <Div>
            <Text className="text-[var(--appkit-color-text-muted)] mb-1" size="xs" weight="semibold">How to unlock:</Text>
            <Text className="text-[var(--appkit-color-text-muted)] leading-relaxed" size="sm">{howToUnlock}</Text>
          </Div>
        </Div>
      ))}
    </Div>
  );
}

// -- Section 4: Verified seller badge -----------------------------------------

function VerifiedSellerSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>What it means for buyers</Text>
        <Text className="leading-relaxed">
          The Verified badge appears on your store profile page and on every listing card.
          It signals to buyers that LetItRip has reviewed your identity and track record.
          Verified sellers typically see higher conversion rates, especially on high-value items.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Requirements</Text>
        <ul className="space-y-1 pl-5">
          <li className={LIST_DISC}>Government-issued photo ID submitted to LetItRip support.</li>
          <li className={LIST_DISC}>Store active for at least 6 months.</li>
          <li className={LIST_DISC}>Average rating of 4.5 or above (across all reviews).</li>
          <li className={LIST_DISC}>At least 50 delivered orders with no outstanding fraud reports.</li>
          <li className={LIST_DISC}>No active hard ban or store suspension in the past 12 months.</li>
        </ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>How to apply</Text>
        <Text className="leading-relaxed">
          Open a support ticket from your store dashboard with category "Account" and subject
          "Verified Seller Application". Attach your government ID scan. Our team reviews within 10 business days.
        </Text>
      </Div>
    </Div>
  );
}

// -- Section 5: Multiple stores -----------------------------------------------

function MultipleStoresSection() {
  return (
    <Div className={SECTION_BODY}>
      <Text className="leading-relaxed">
        By default, each owner account can only create one store. The
        <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded mx-1">multiple_stores</code>
        capability allows the same owner to create and manage additional stores under the same account.
      </Text>
      <Alert variant="info" title="Each store is independent">
        Multiple stores share the same owner account (Firebase Auth UID) but are separate Firestore documents
        with their own listings, orders, payouts, and settings. Platform fees apply per-store.
        Admin grants this capability after reviewing your business justification.
      </Alert>
    </Div>
  );
}

// -- Main view -----------------------------------------------------------------

export type StoreCapabilitiesGuideViewProps = Record<string, never>;

export function StoreCapabilitiesGuideView(_props: StoreCapabilitiesGuideViewProps) {
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
        <Heading level={1} className="text-2xl text-[var(--appkit-color-text)]" weight="bold">
          Capabilities Guide
        </Heading>
        <Text className="mt-1 text-[var(--appkit-color-text-muted)]" size="sm">
          Per-store feature flags — what they unlock, defaults, and how to request access.
        </Text>
      </Div>

      {/* Sections */}
      <GuideSection title="1. What are capabilities?">
        <WhatAreCapabilitiesSection />
      </GuideSection>

      <GuideSection title="2. Capability table">
        <CapabilityTable />
      </GuideSection>

      <GuideSection title="3. How to unlock locked features">
        <LockedFeatureGuide />
      </GuideSection>

      <GuideSection title="4. Verified seller badge">
        <VerifiedSellerSection />
      </GuideSection>

      <GuideSection title="5. Multiple stores">
        <MultipleStoresSection />
      </GuideSection>
    </Div>
  );
}
