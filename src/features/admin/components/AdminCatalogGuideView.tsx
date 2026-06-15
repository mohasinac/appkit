import React from "react";
import { Package, FolderTree, Tag, Star, AlertTriangle } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";
import { GC } from "../../_guide-cls";

const CLS_CODE = "text-xs bg-amber-100 dark:bg-amber-900/30 px-1 rounded";

export function AdminCatalogGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Package className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl text-[var(--appkit-color-text)] mb-2" weight="bold">Catalog</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Products, categories, brands, and reviews — how the LetItRip catalog is structured and managed.</Text>
      </Section>

      {[
        {
          Icon: Package, title: "Product Management",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">Listing types</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">standard</code> (prefix <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">product-</code>), <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">auction</code> (prefix <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">auction-</code>), <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">pre-order</code> (prefix <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">preorder-</code>).</li>
              <li><Span weight="bold">Admin vs store creation</Span>: Admins can create products on behalf of any store via the store picker in AdminProductEditorView.</li>
              <li><Span weight="bold">Status lifecycle</Span>: DRAFT → PUBLISHED → ARCHIVED. Published products appear in search. Archived products are hidden but not deleted.</li>
              <li><Span weight="bold">J13 rule</Span>: Always use <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">listingType</code> field — the legacy <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isAuction</code>/<code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isPreOrder</code> booleans have been removed. All queries use <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">where(&quot;listingType&quot;, &quot;==&quot;, x)</code>.</li>
              <li><Span weight="bold">Media URLs</Span>: Never write raw Firebase Storage URLs to Firestore. All product image URLs must use the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">/api/media/[slug]</code> proxy format.</li>
            </ul>
          ),
        },
        {
          Icon: FolderTree, title: "Category Taxonomy",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">3-tier system</Span>: Root (tier 1) → Subcategory (tier 2) → Leaf (tier 3). Only leaf categories can be assigned to products.</li>
              <li><Span weight="bold">Key fields</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">parentId</code> points to the direct parent; <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">rootId</code> always points to the tier-1 root; <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">path</code> stores the full hierarchy path.</li>
              <li><Span weight="bold">isLeaf</Span>: Must be <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">true</code> on any category that can be selected in the product form. Tier-1 and tier-2 categories must have <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isLeaf: false</code>.</li>
              <li><Span weight="bold">Slug prefix</Span>: All category slugs start with <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">category-</code>.</li>
              <li><Span weight="bold">Adding a new root</Span>: Rare. Requires: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">display.icon</code>, decision on <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">showOnHomepage</code>, and a senior admin sign-off.</li>
            </ul>
          ),
        },
        {
          Icon: Tag, title: "Brands",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">Slug prefix</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">brand-</code>. Slugs are immutable after products reference them.</li>
              <li><Span weight="bold">displayOrder</Span>: Controls the sort order on public brand pages. Lower numbers appear first.</li>
              <li><Span weight="bold">isActive: false</Span>: Hides the brand from public discovery but preserves historical product links. Use this instead of deleting a brand.</li>
              <li><Span weight="bold">logoURL / bannerURL</Span>: Must use the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">/api/media/</code> proxy — never raw Storage URLs.</li>
            </ul>
          ),
        },
        {
          Icon: Star, title: "Reviews",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">isVerifiedPurchase</Span>: Set automatically by the system after order DELIVERED. Never manually toggle this field.</li>
              <li><Span weight="bold">sellerResponse</Span>: Written by the seller via their store dashboard. Admins should not edit seller responses — only remove clearly violating ones.</li>
              <li><Span weight="bold">When to delete vs hide</Span>: Delete for violations (PII, slurs, spam). Hide (move to unlisted) if a dispute is pending resolution.</li>
              <li><Span weight="bold">helpfulCount</Span>: Read-only — incremented by buyer votes. Do not manually edit this field.</li>
            </ul>
          ),
        },
        {
          Icon: AlertTriangle, title: "Common Admin Mistakes",
          content: (
            <Alert variant="warning">
              <ul className="space-y-1 text-sm">
                <li>✗ Publishing a product with no images — buyers cannot evaluate it.</li>
                <li>✗ Creating a subcategory without setting <code className={CLS_CODE}>rootId</code> — category tree breaks.</li>
                <li>✗ Setting <code className={CLS_CODE}>parentId</code> of a root category to anything other than <code className={CLS_CODE}>null</code> — creates circular hierarchy.</li>
                <li>✗ Duplicating brand slugs — Firestore document ID collision, second write silently overwrites the first.</li>
                <li>✗ Writing raw Firebase Storage URLs to Firestore — breaks the media watermark proxy and CDN caching.</li>
              </ul>
            </Alert>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
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
