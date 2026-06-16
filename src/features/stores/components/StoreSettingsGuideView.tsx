import React from "react";
import { ArrowLeft } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Section, Span, Stack, Text, Ul } from "../../../ui";
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

// -- Section 1: Store profile -------------------------------------------------

function StoreProfileSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>Store name & description</Text>
        <Text className="leading-relaxed">
          Your store name appears in search results, listing cards, order emails, and the store profile page.
          Choose a name that clearly describes your niche — buyers search by seller name.
          The description appears on your profile page below your banner — include your niche,
          location, and turnaround time (e.g. "Graded Pokémon TCG from Mumbai · ships within 2 business days").
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Logo (storeLogoURL)</Text>
        <Ul className="space-y-1 pl-5">
          <Li className={LIST_DISC}>Minimum size: 200 × 200 px. Recommended: 400 × 400 px.</Li>
          <Li className={LIST_DISC}>Displayed as a circle avatar on your profile page and in order confirmation emails.</Li>
          <Li className={LIST_DISC}>Format: PNG with transparent background looks best.</Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Banner (storeBannerURL)</Text>
        <Ul className="space-y-1 pl-5">
          <Li className={LIST_DISC}>Minimum size: 1200 × 300 px. Recommended: 1600 × 400 px.</Li>
          <Li className={LIST_DISC}>Displayed at the top of your store profile page.</Li>
          <Li className={LIST_DISC}>Avoid putting critical text near the edges — it may be cropped on mobile.</Li>
        </Ul>
      </Div>
      <Alert variant="info" title="Profile completeness affects discoverability">
        Stores with a logo, banner, description, and at least one published listing appear higher in
        the Stores directory. The Getting Started checklist on your Guide Hub shows which steps remain.
      </Alert>
    </Div>
  );
}

// -- Section 2: Shipping configuration ----------------------------------------

function ShippingSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>Flat-rate shipping</Text>
        <Text className="leading-relaxed">
          Set a single shipping charge that applies to all orders from your store.
          This is the simplest option — buyers see one consistent shipping cost at checkout.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Free shipping threshold</Text>
        <Text className="leading-relaxed">
          Set a minimum order value above which shipping is free. For example, "Free shipping on orders above ₹500"
          appears on your store profile and listing cards — it is a strong conversion driver.
          Configure this in Settings → Shipping → Free Shipping Threshold.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Per-item overrides</Text>
        <Text className="leading-relaxed">
          Individual listings can override the store shipping charge using the Shipping tab in the product form.
          Use this for oversized or fragile items that cost more to ship.
        </Text>
      </Div>
    </Div>
  );
}

// -- Section 3: Return policy -------------------------------------------------

function ReturnPolicySection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>Store-level return window</Text>
        <Text className="leading-relaxed">
          The default return window is <Span weight="bold">7 days</Span> from the
          DELIVERED date. Stores with the
          <Code className="mx-1" size="xs" padding="xs" rounded="default" surface="subtle">extended_return_window</Code>
          capability can offer 30 days. The return window is displayed on every product detail page in the Returns tab.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Non-returnable categories</Text>
        <Ul className="space-y-1 pl-5">
          <Li className={LIST_DISC}>Opened card packs (boosters, elite trainer boxes).</Li>
          <Li className={LIST_DISC}>Cracked or opened graded slabs — unless the defect was documented before shipping.</Li>
          <Li className={LIST_DISC}>Items explicitly marked "Final Sale" in the listing.</Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>What buyers see</Text>
        <Text className="leading-relaxed">
          Buyers see the return window and non-returnable note in the product detail page Returns tab before purchasing.
          This cannot be suppressed — it is platform policy to always show return terms.
        </Text>
      </Div>
    </Div>
  );
}

// -- Section 4: Vacation mode -------------------------------------------------

function VacationModeSection() {
  return (
    <Div className={SECTION_BODY}>
      <Div>
        <Text className={SUBHEADING}>What vacation mode does</Text>
        <Ul className="space-y-1 pl-5">
          <Li className={LIST_DISC}>All your published listings are hidden from search results and browse pages.</Li>
          <Li className={LIST_DISC}>Your store profile page shows a "On Vacation" banner.</Li>
          <Li className={LIST_DISC}>Buyers cannot add your items to cart or checkout while on vacation.</Li>
          <Li className={LIST_DISC}>Existing orders that were placed before vacation mode must still be fulfilled.</Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>How to enable</Text>
        <Text className="leading-relaxed">
          Go to your Store Dashboard → Settings → Storefront tab. Toggle "Vacation mode" on.
          Your listings re-appear instantly when you toggle it off.
        </Text>
      </Div>
      <Alert variant="warning" title="Ongoing orders are not paused">
        Enabling vacation mode does not pause or cancel any existing orders.
        You are still responsible for fulfilling orders placed before vacation mode was enabled.
      </Alert>
    </Div>
  );
}

// -- Section 5: WhatsApp integration ------------------------------------------

function WhatsAppSection() {
  return (
    <Div className={SECTION_BODY}>
      <Text className="leading-relaxed">
        The WhatsApp integration allows your customers to contact you via WhatsApp from your store profile
        and lets you sync your product catalog to your WhatsApp Business Catalog (requires the
        <Code className="mx-1" size="xs" padding="xs" rounded="default" surface="subtle">whatsapp_catalog_sync</Code> capability).
      </Text>
      <Text className="leading-relaxed">
        Full settings and the catalog sync toggle are at{" "}
        <a
          href={String(ROUTES.STORE.WHATSAPP)}
          className="underline text-[var(--appkit-color-primary)] hover:opacity-80"
        >
          Settings → WhatsApp
        </a>.
        See the WhatsApp settings page for step-by-step setup instructions.
      </Text>
    </Div>
  );
}

// -- Section 6: Visibility states ---------------------------------------------

function VisibilityStatesSection() {
  const STATES = [
    {
      state: "Published",
      note: "Your store and listings are fully visible in search, browse, and featured sections.",
    },
    {
      state: "Vacation mode",
      note: "Listings hidden from search. Profile shows vacation banner. Managed by you in Settings.",
    },
    {
      state: "Hidden (per-listing)",
      note: "Individual listings set to DRAFT or ARCHIVED are not visible but your store profile remains accessible via direct link.",
    },
    {
      state: "Suspended",
      note: "Admin action. All listings hidden. Store profile shows 'Unavailable' banner. Contact support@letitrip.in to resolve.",
    },
  ];
  return (
    <Stack gap="3">
      {STATES.map(({ state, note }) => (
        <Div key={state} className="flex gap-3 text-sm">
          <Text className="shrink-0 w-32 text-[var(--appkit-color-text)]" weight="semibold">{state}</Text>
          <Text className="text-[var(--appkit-color-text-muted)] leading-relaxed">{note}</Text>
        </Div>
      ))}
    </Stack>
  );
}

// -- Main view -----------------------------------------------------------------

export type StoreSettingsGuideViewProps = Record<string, never>;

export function StoreSettingsGuideView(_props: StoreSettingsGuideViewProps) {
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
          Settings Guide
        </Heading>
        <Text className="mt-1 text-[var(--appkit-color-text-muted)]" size="sm">
          Store profile, shipping, returns, vacation mode, WhatsApp, and visibility.
        </Text>
      </Div>

      {/* Sections */}
      <GuideSection title="1. Store profile">
        <StoreProfileSection />
      </GuideSection>

      <GuideSection title="2. Shipping configuration">
        <ShippingSection />
      </GuideSection>

      <GuideSection title="3. Return policy">
        <ReturnPolicySection />
      </GuideSection>

      <GuideSection title="4. Vacation mode">
        <VacationModeSection />
      </GuideSection>

      <GuideSection title="5. WhatsApp integration">
        <WhatsAppSection />
      </GuideSection>

      <GuideSection title="6. Visibility states">
        <VisibilityStatesSection />
      </GuideSection>
    </Stack>
  );
}
