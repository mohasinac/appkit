import React from "react";
import { ArrowLeft } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Section, Span, Stack, Text, TextLink, Ul } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";

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

const LIST_DISC = "list-disc leading-relaxed";
const TEXT_MUTED = "leading-relaxed text-[var(--appkit-color-text-muted)]";

export type StoreWhatsAppGuideViewProps = Record<string, never>;

export function StoreWhatsAppGuideView(_props: StoreWhatsAppGuideViewProps) {
  return (
    <Stack gap="lg" padding="b-2xl">
      {/* Back nav */}
      <TextLink
        variant="bare"
        href={String(ROUTES.STORE.GUIDE)}
        size="sm"
        layout="inline-flex"
        align="center"
        gap="sm"
        className="text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Seller Guide
      </TextLink>

      {/* Page title */}
      <Div>
        <Heading level={1} className="text-[var(--appkit-color-text)]" size="2xl" weight="bold">
          WhatsApp Catalog Sync
        </Heading>
        <Text className="mt-1 text-[var(--appkit-color-text-muted)]" size="sm">
          Push your product catalog to Meta&apos;s Commerce Manager for WhatsApp catalog messages and Facebook/Instagram Shops — and import products back the other way.
        </Text>
      </Div>

      <GuideSection title="1. Create a Commerce Manager catalog">
        <Ul spacing="tight" indent="lg">
          <Li className={LIST_DISC} textSize="sm" color="muted">
            At <Span weight="bold">business.facebook.com/commerce</Span>, create a new catalog for the store (or use an existing one).
          </Li>
          <Li className={LIST_DISC} textSize="sm" color="muted">
            Note the <Span weight="bold">Catalog ID</Span> shown in the catalog&apos;s settings.
          </Li>
        </Ul>
      </GuideSection>

      <GuideSection title="2. Generate a catalog-scoped access token">
        <Text className={TEXT_MUTED} size="sm">
          You need a Meta access token with <Code size="xs" padding="xs" rounded="default" surface="subtle">catalog_management</Code> permission, scoped to that catalog. This is generated the same way as the platform-level WhatsApp System User token (ask your admin — Admin Guide → WhatsApp Integration, step 3) but assigned to the <Span weight="bold">catalog</Span> asset instead of the WhatsApp Business Account asset.
        </Text>
      </GuideSection>

      <GuideSection title="3. Enter credentials in the seller dashboard">
        <Text className="mb-2 leading-relaxed text-[var(--appkit-color-text-muted)]" size="sm">
          <Span weight="bold">Store → WhatsApp</Span> settings page:
        </Text>
        <Ul spacing="tight" indent="lg">
          <Li className={LIST_DISC} textSize="sm" color="muted">Catalog ID</Li>
          <Li className={LIST_DISC} textSize="sm" color="muted">Access Token</Li>
        </Ul>
        <Text className="mt-3 leading-relaxed text-[var(--appkit-color-text-muted)]" size="sm">
          This is a store capability — it must be enabled for the store (<Code size="xs" padding="xs" rounded="default" surface="subtle">whatsapp_catalog_sync</Code> capability) before the settings page and sync actions are available.
        </Text>
      </GuideSection>

      <GuideSection title="4. Push products to the catalog">
        <Text className={TEXT_MUTED} size="sm">
          Once connected, trigger a sync that batches published <Code size="xs" padding="xs" rounded="default" surface="subtle">standard</Code>-listing products (up to 50 per API call) to the Meta catalog via the Commerce API <Code size="xs" padding="xs" rounded="default" surface="subtle">items_batch</Code> endpoint — title, description, price, image, availability, and condition.
        </Text>
      </GuideSection>

      <GuideSection title="5. Import products from the catalog">
        <Text className={TEXT_MUTED} size="sm">
          The reverse flow fetches products already in the Meta catalog and creates them as local <Span weight="bold">draft</Span> listings, deduplicating against existing products by slug/retailer-id matching.
        </Text>
      </GuideSection>

      <Alert variant="info">
        This is unrelated to the platform-level WhatsApp order-notification credentials — those are for sending order-status messages to buyers, not catalog sync. Only published <Span weight="bold">standard</Span> listings sync — auctions, pre-orders, and other listing types are not included.
      </Alert>
    </Stack>
  );
}
