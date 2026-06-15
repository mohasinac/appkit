import React from "react";
import { Settings } from "lucide-react";
import { Alert, Div, Heading, Row, Section, Stack, Text } from "../../../ui";
import { GC } from "../../_guide-cls";

const CLS_HEADER_ICON = "w-5 h-5 text-amber-500";

export function AdminSiteConfigGuideView() {
  const SETTING_GROUPS = [
    { name: "branding", desc: "Site name, tagline, logo URL, favicon. These values override the default SVG wordmark." },
    { name: "appearance", desc: "Theme colour tokens, dark mode default, custom CSS overrides." },
    { name: "announcementBanner", desc: "Sitewide banner — message, type (info/warning/promo), start/end dates, dismissible toggle." },
    { name: "seoDefaults", desc: "Default meta title suffix, meta description, og:image, and robots directives for pages without explicit metadata." },
    { name: "contactSocial", desc: "Email, phone, social media URLs, WhatsApp business number." },
    { name: "watermark", desc: "Watermark text and opacity applied to all product images via the /api/media proxy." },
    { name: "fees", desc: "platformFee (%), Razorpay gateway fee pass-through toggle, GST rate on platform fees." },
    { name: "integrations", desc: "API keys: Razorpay (live/test), Shiprocket, Resend, WhatsApp Cloud API. Keys are encrypted at rest — never log or export." },
    { name: "shipping", desc: "Default shipping carriers, free shipping threshold (paise), COD availability toggle." },
    { name: "auctionConfig", desc: "Global bid increment default, auto-extend window (minutes), minimum auction duration." },
    { name: "platformLimits", desc: "Cart item cap (50), wishlist cap (20), history cap (50), support ticket limits (2 general + 1 per order)." },
    { name: "legalPages", desc: "Body HTML for Terms of Service, Privacy Policy, Refund Policy, and Shipping Policy. Rendered on their respective static pages." },
  ];

  return (
    <Stack className="pb-10 max-w-3xl mx-auto" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Settings className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">Site Configuration</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">All site settings are stored in a single Firestore document at <code className="text-xs">site_settings/global</code>. Changes take effect on the next page render (ISR or cache revalidation).</Text>
      </Section>

      <Section className={GC.sectionWrap}>
        <Div className={GC.sectionHeader}>
          <Settings className="w-5 h-5 text-[var(--appkit-color-primary)]" />
          <Heading level={2} className={GC.sectionTitle}>Settings Groups</Heading>
        </Div>
        <Stack className="py-5" padding="x-lg" gap="md">
          {SETTING_GROUPS.map(({ name, desc }) => (
            <Div key={name} className="flex gap-3 text-sm">
              <Text className="flex-shrink-0 font-mono text-[var(--appkit-color-primary)] w-40" size="xs" weight="semibold">{name}</Text>
              <Text className="text-[var(--appkit-color-text-muted)]">{desc}</Text>
            </Div>
          ))}
        </Stack>
      </Section>

      <Section className={GC.sectionWrap}>
        <Div className={GC.sectionHeader}>
          <Settings className={CLS_HEADER_ICON} />
          <Heading level={2} className={GC.sectionTitle}>API Keys &amp; Integrations</Heading>
        </Div>
        <Div className="py-5" padding="x-lg">
          <Alert variant="warning">
            API keys in <code className="text-xs">integrations</code> are stored encrypted. They are masked in the admin UI — you see <code className="text-xs">••••••••</code> by design. To rotate a key: paste the new value into the field and save. The old key is immediately invalidated on your payment/shipping provider&apos;s side — test in staging first. Never paste API keys into Slack, email, or any external service.
          </Alert>
        </Div>
      </Section>

      <Section className={GC.sectionWrap}>
        <Div className={GC.sectionHeader}>
          <Settings className="w-5 h-5 text-[var(--appkit-color-primary)]" />
          <Heading level={2} className={GC.sectionTitle}>Feature Flags</Heading>
        </Div>
        <Stack className="py-5" padding="x-lg" gap="3">
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">Feature flags are boolean toggles under <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">siteSettings</code>. They control platform-wide features without a code deploy:</Text>
          <ul className="list-disc list-inside space-y-1 text-sm text-[var(--appkit-color-text-muted)]">
            <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">enableAuctions</code> — globally enable/disable all auction listings.</li>
            <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">enablePreOrders</code> — globally enable/disable pre-order creation.</li>
            <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">maintenanceMode</code> — shows a maintenance banner and blocks non-admin access.</li>
          </ul>
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">Flags are evaluated per-request via ISR cache — a change may take up to the revalidation interval (3600s default) to propagate to all pages.</Text>
        </Stack>
      </Section>
    </Stack>
  );
}
