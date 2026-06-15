import React from "react";
import { Store, GitBranch, Edit, Shield, MapPin, Ban } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminStoresGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Store className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl text-[var(--appkit-color-text)] mb-2" weight="bold">Stores &amp; Sellers</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Store lifecycle, identity architecture, capabilities, and suspension on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: Store, title: "Store Lifecycle",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">Creation</Span>: Seller registers → completes onboarding wizard → admin reviews → store goes <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">active</code>.</li>
              <li><Span weight="bold">Status values</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">active</code> (visible and selling), <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">suspended</code> (hidden, not selling), <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">pending_review</code> (awaiting admin approval).</li>
              <li><Span weight="bold">isVerified badge</Span>: Awarded when the store has a consistent track record (≥20 delivered orders, ≥4.0 rating, 3+ months active). Click the toggle in AdminStoreEditorView after reviewing the store&apos;s history.</li>
            </ul>
          ),
        },
        {
          Icon: GitBranch, title: "Store Identity Architecture",
          content: (
            <>
              <Alert variant="info" title="Critical rule — read before editing any store or order.">
                <code className="text-xs">storeId = storeSlug</code> (public-facing, used in all product and order references).<br />
                <code className="text-xs">ownerId = Firebase Auth UID</code> (internal only — never exposed in API responses).
              </Alert>
              <ul className="space-y-2 text-sm text-[var(--appkit-color-text-muted)] mt-4">
                <li><Span weight="bold">Why separate?</Span> Allows future store ownership transfer without rewriting all product/order documents.</li>
                <li><Span weight="bold">Two-step lookup</Span>: To find a store by owner, query <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">stores where ownerId == uid</code>. Never join products by ownerId directly.</li>
                <li><Span weight="bold">Anti-patterns to reject</Span>: PRs that filter <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">products where ownerId ==</code> — the correct field is <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">storeId</code>.</li>
              </ul>
            </>
          ),
        },
        {
          Icon: Edit, title: "Store Editor Walkthrough",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">storeName / storeDescription</Span>: Public-facing. Shown on the store profile page.</li>
              <li><Span weight="bold">ownerId</Span>: Read-only after store creation. Changing ownership requires engineering involvement.</li>
              <li><Span weight="bold">status Select</Span>: Suspend a store with <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">suspended</code>; this hides all listings and shows a banner on the store profile.</li>
              <li><Span weight="bold">payoutDetails</Span>: UPI VPA and bank account details. Treated as PII — masked in the UI and encrypted in Firestore. Always verify details with the seller before issuing payouts.</li>
            </ul>
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
            <ul className={GC.listMuted}>
              <li>Stored in the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">storeAddresses</code> collection. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">storeId</code> must exactly match the store&apos;s slug (e.g. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">store-pokemon-palace</code>).</li>
              <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isPickupLocation: true</code> flags this address as a buyer pickup option during checkout.</li>
              <li>Convention: no more than 3 active pickup locations per store.</li>
            </ul>
          ),
        },
        {
          Icon: Ban, title: "Suspending a Store",
          content: (
            <ul className={GC.listMuted}>
              <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">status: "suspended"</code> — hides all the store&apos;s products from search; the store profile shows "Currently Unavailable"; the seller receives an in-app notification.</li>
              <li>Suspension does NOT cancel pending orders — those must be handled separately.</li>
              <li><Span weight="bold">Hard-banning the owner</Span> is a separate, more severe action — see the Trust &amp; Safety guide. A hard ban cascades to suspend the store automatically.</li>
            </ul>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="rounded-2xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden">
          <Div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Div>
          <Div className="px-6 py-5">{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
