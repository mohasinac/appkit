import React from "react";
import { Store, GitBranch, Edit, Shield, MapPin, Ban } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminStoresGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10 [background:linear-gradient(135deg,var(--appkit-color-primary-700)_0%,var(--appkit-color-cobalt)_100%)]" align="center" justify="center" rounded="xl">
            <Store className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">Stores &amp; Sellers</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Store lifecycle, identity architecture, capabilities, and suspension on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: Store, title: "Store Lifecycle",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Creation</Span>: Seller registers → completes onboarding wizard → admin reviews → store goes <Code size="xs" padding="xs" rounded="default" surface="subtle">active</Code>.</Li>
              <Li><Span weight="bold">Status values</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">active</Code> (visible and selling), <Code size="xs" padding="xs" rounded="default" surface="subtle">suspended</Code> (hidden, not selling), <Code size="xs" padding="xs" rounded="default" surface="subtle">pending_review</Code> (awaiting admin approval).</Li>
              <Li><Span weight="bold">isVerified badge</Span>: Awarded when the store has a consistent track record (≥20 delivered orders, ≥4.0 rating, 3+ months active). Click the toggle in AdminStoreEditorView after reviewing the store&apos;s history.</Li>
            </Ul>
          ),
        },
        {
          Icon: GitBranch, title: "Store Identity Architecture",
          content: (
            <>
              <Alert variant="info" title="Critical rule — read before editing any store or order.">
                <Code size="xs">storeId = storeSlug</Code> (public-facing, used in all product and order references).<br />
                <Code size="xs">ownerId = Firebase Auth UID</Code> (internal only — never exposed in API responses).
              </Alert>
              <Ul className="text-[var(--appkit-color-text-muted)] mt-4" spacing="comfortable" size="sm">
                <Li><Span weight="bold">Why separate?</Span> Allows future store ownership transfer without rewriting all product/order documents.</Li>
                <Li><Span weight="bold">Two-step lookup</Span>: To find a store by owner, query <Code size="xs" padding="xs" rounded="default" surface="subtle">stores where ownerId == uid</Code>. Never join products by ownerId directly.</Li>
                <Li><Span weight="bold">Anti-patterns to reject</Span>: PRs that filter <Code size="xs" padding="xs" rounded="default" surface="subtle">products where ownerId ==</Code> — the correct field is <Code size="xs" padding="xs" rounded="default" surface="subtle">storeId</Code>.</Li>
              </Ul>
            </>
          ),
        },
        {
          Icon: Edit, title: "Store Editor Walkthrough",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">storeName / storeDescription</Span>: Public-facing. Shown on the store profile page.</Li>
              <Li><Span weight="bold">ownerId</Span>: Read-only after store creation. Changing ownership requires engineering involvement.</Li>
              <Li><Span weight="bold">status Select</Span>: Suspend a store with <Code size="xs" padding="xs" rounded="default" surface="subtle">suspended</Code>; this hides all listings and shows a banner on the store profile.</Li>
              <Li><Span weight="bold">payoutDetails</Span>: UPI VPA and bank account details. Treated as PII — masked in the UI and encrypted in Firestore. Always verify details with the seller before issuing payouts.</Li>
            </Ul>
          ),
        },
        {
          Icon: Shield, title: "Capabilities Management",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Capabilities are admin-granted feature flags on a store. The Capabilities section in AdminStoreEditorView shows all 18 flags with toggles.</Text>
              <Alert variant="warning">
                These capabilities require documented contractual approval before granting: <Span weight="bold">lower_commission_rate</Span> (commission rate change agreement), <Span weight="bold">extended_return_window</Span> (operational review), <Span weight="bold">api_access</Span> (technical integration agreement). Do not toggle these without a senior admin sign-off on file.
              </Alert>
            </>
          ),
        },
        {
          Icon: MapPin, title: "Store Addresses (Pickup Locations)",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Stored in the <Code size="xs" padding="xs" rounded="default" surface="subtle">storeAddresses</Code> collection. <Code size="xs" padding="xs" rounded="default" surface="subtle">storeId</Code> must exactly match the store&apos;s slug (e.g. <Code size="xs" padding="xs" rounded="default" surface="subtle">store-pokemon-palace</Code>).</Li>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">isPickupLocation: true</Code> flags this address as a buyer pickup option during checkout.</Li>
              <Li>Convention: no more than 3 active pickup locations per store.</Li>
            </Ul>
          ),
        },
        {
          Icon: Ban, title: "Suspending a Store",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">status: "suspended"</Code> — hides all the store&apos;s products from search; the store profile shows "Currently Unavailable"; the seller receives an in-app notification.</Li>
              <Li>Suspension does NOT cancel pending orders — those must be handled separately.</Li>
              <Li><Span weight="bold">Hard-banning the owner</Span> is a separate, more severe action — see the Trust &amp; Safety guide. A hard ban cascades to suspend the store automatically.</Li>
            </Ul>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} overflow="hidden" className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="2xl">
          <Row className="border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="inlineLg" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div paddingY="y-md-lg" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
