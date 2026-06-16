import React from "react";
import { Package, FolderTree, Tag, Star, AlertTriangle } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

const CLS_CODE = "text-xs bg-amber-100 dark:bg-amber-900/30 px-1 rounded";

export function AdminCatalogGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Package className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">Catalog</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Products, categories, brands, and reviews — how the LetItRip catalog is structured and managed.</Text>
      </Section>

      {[
        {
          Icon: Package, title: "Product Management",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Listing types</Span>: <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">standard</Code> (prefix <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">product-</Code>), <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">auction</Code> (prefix <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">auction-</Code>), <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">pre-order</Code> (prefix <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">preorder-</Code>).</Li>
              <Li><Span weight="bold">Admin vs store creation</Span>: Admins can create products on behalf of any store via the store picker in AdminProductEditorView.</Li>
              <Li><Span weight="bold">Status lifecycle</Span>: DRAFT → PUBLISHED → ARCHIVED. Published products appear in search. Archived products are hidden but not deleted.</Li>
              <Li><Span weight="bold">J13 rule</Span>: Always use <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">listingType</Code> field — the legacy <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isAuction</Code>/<Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isPreOrder</Code> booleans have been removed. All queries use <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">where(&quot;listingType&quot;, &quot;==&quot;, x)</Code>.</Li>
              <Li><Span weight="bold">Media URLs</Span>: Never write raw Firebase Storage URLs to Firestore. All product image URLs must use the <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">/api/media/[slug]</Code> proxy format.</Li>
            </Ul>
          ),
        },
        {
          Icon: FolderTree, title: "Category Taxonomy",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">3-tier system</Span>: Root (tier 1) → Subcategory (tier 2) → Leaf (tier 3). Only leaf categories can be assigned to products.</Li>
              <Li><Span weight="bold">Key fields</Span>: <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">parentId</Code> points to the direct parent; <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">rootId</Code> always points to the tier-1 root; <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">path</Code> stores the full hierarchy path.</Li>
              <Li><Span weight="bold">isLeaf</Span>: Must be <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">true</Code> on any category that can be selected in the product form. Tier-1 and tier-2 categories must have <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isLeaf: false</Code>.</Li>
              <Li><Span weight="bold">Slug prefix</Span>: All category slugs start with <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">category-</Code>.</Li>
              <Li><Span weight="bold">Adding a new root</Span>: Rare. Requires: <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">display.icon</Code>, decision on <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">showOnHomepage</Code>, and a senior admin sign-off.</Li>
            </Ul>
          ),
        },
        {
          Icon: Tag, title: "Brands",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Slug prefix</Span>: <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">brand-</Code>. Slugs are immutable after products reference them.</Li>
              <Li><Span weight="bold">displayOrder</Span>: Controls the sort order on public brand pages. Lower numbers appear first.</Li>
              <Li><Span weight="bold">isActive: false</Span>: Hides the brand from public discovery but preserves historical product links. Use this instead of deleting a brand.</Li>
              <Li><Span weight="bold">logoURL / bannerURL</Span>: Must use the <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">/api/media/</Code> proxy — never raw Storage URLs.</Li>
            </Ul>
          ),
        },
        {
          Icon: Star, title: "Reviews",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">isVerifiedPurchase</Span>: Set automatically by the system after order DELIVERED. Never manually toggle this field.</Li>
              <Li><Span weight="bold">sellerResponse</Span>: Written by the seller via their store dashboard. Admins should not edit seller responses — only remove clearly violating ones.</Li>
              <Li><Span weight="bold">When to delete vs hide</Span>: Delete for violations (PII, slurs, spam). Hide (move to unlisted) if a dispute is pending resolution.</Li>
              <Li><Span weight="bold">helpfulCount</Span>: Read-only — incremented by buyer votes. Do not manually edit this field.</Li>
            </Ul>
          ),
        },
        {
          Icon: AlertTriangle, title: "Common Admin Mistakes",
          content: (
            <Alert variant="warning">
              <Ul className="space-y-1 text-sm">
                <Li>✗ Publishing a product with no images — buyers cannot evaluate it.</Li>
                <Li>✗ Creating a subcategory without setting <Code className={CLS_CODE}>rootId</Code> — category tree breaks.</Li>
                <Li>✗ Setting <Code className={CLS_CODE}>parentId</Code> of a root category to anything other than <Code className={CLS_CODE}>null</Code> — creates circular hierarchy.</Li>
                <Li>✗ Duplicating brand slugs — Firestore document ID collision, second write silently overwrites the first.</Li>
                <Li>✗ Writing raw Firebase Storage URLs to Firestore — breaks the media watermark proxy and CDN caching.</Li>
              </Ul>
            </Alert>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
          <Row className="px-6 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="y-md" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div className="py-5" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
