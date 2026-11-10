import Link from "next/link";
import { OwnerQuickActions } from "../../../features/admin/components/OwnerQuickActions";
import { orderRepository, productRepository } from "../../../repositories";
import { getFieldVisibility } from "../../../_internal/server/features/forms/field-visibility";
import { SectionVisibilityGate } from "../../shell/SectionVisibilityGate";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
  p4: "p-[var(--appkit-space-4)]",
} as const;

const CLS_PRIZE_BADGE = "inline-block rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 px-[var(--appkit-space-2-5)] py-[var(--appkit-space-0-5)] text-fuchsia-700 dark:text-fuchsia-300";
import { ROUTES } from "../../../next/routing/route-map";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { toDescriptionHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import { Container, Row, Stack } from "../../../ui/components/Layout";
import { Disclaimer } from "../../../ui/components/Disclaimer";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Main, Section } from "../../../ui/components/Semantic";
import { RichText } from "../../../ui/rich-text/RichText";
import { ListingDetailShell } from "../../../ui/components/ListingDetailShell";
import { ClearanceBottomActions } from "./ClearanceBottomActions";
import { ProductTabsShell } from "./ProductTabsShell";
import { ShareButton } from "./ShareButton";
import { ClearanceCollage } from "./ClearanceCollage";
import { ClearanceEntryActions } from "./ClearanceEntryActions";
import type {
  PrizeDrawItem,
  ProductDocument,
} from "../schemas/firestore";
import { HistoryTracker } from "../../history/components/HistoryTracker";
import type { FirestoreDocument } from "../../../schemas/types";
import { RelatedItemsSection } from "./RelatedItemsSection";
import { computeRelatedItems } from "../../../_internal/server/features/products/data";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { getGroupsWithItemsForProduct } from "../../../_internal/server/features/grouped/data";
import { PurchaseReviewAffordance } from "../../reviews/components/PurchaseReviewAffordance";
import { resolveSectionHref } from "../../../next/routing/section-routes";

export interface ClearanceDetailPageViewProps {
  id: string;
  /**
   * Pre-fetched product document from the page's server data layer.
   * When provided, the internal repository call is skipped — deduplicating
   * the fetch with generateMetadata() via React.cache().
   */
  initialClearance?: ProductDocument | null;
  /**
   * Authenticated buyer's uid. When set, the view server-fetches the
   * buyer's existing-entry count for this draw and renders the SB6-D
   * personalised "You have X/Y entries used" badge.
   */
  currentUserId?: string;
  /**
   * Admin-composed widget cards for this page's `AdminComposableRegion`
   * (`pageId="clearance-slug"`) — same mechanism as every other
   * listing-type detail page. Until 2026-11-04 this was the one PDP-shaped
   * page without it: the host page.tsx already fetched
   * `getPageRegion("clearance-slug")` for the giveaway-mode branch but
   * never passed it to this (classic-mode) branch at all.
   */
  pageRegionCards?: DashboardCard[];
}

function statusLabel(s: "pending" | "open" | "closed" | undefined): string {
  switch (s) {
    case "open":
      return "Reveal open";
    case "closed":
      return "Lot closed";
    case "pending":
    default:
      return "Reveal pending";
  }
}

function statusClass(s: "pending" | "open" | "closed" | undefined): string {
  switch (s) {
    case "open":
      return "bg-success-surface text-success";
    case "closed":
      return " bg-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)]";
    case "pending":
    default:
      return "bg-warning-surface text-warning";
  }
}

function stripIsWon(items: PrizeDrawItem[] | undefined): PrizeDrawItem[] {
  if (!items) return [];
  return items.map((it) => ({ ...it, isWon: false }));
}

/**
 * Public prize-draw detail page (SB4-G).
 *
 * Server-fetches the prize-draw product, strips `isWon` from each item before
 * passing it to `ClearanceCollage` so public buyers stay unspoiled, and
 * delegates the buy-bar to the client `ClearanceEntryActions` which surfaces
 * the `NonRefundableConsentModal` before any add-to-cart happens.
 *
 * Reuses the `PreOrderDetailView` (grid-2) shell for layout parity.
 */
export async function ClearanceDetailPageView({
  id,
  initialClearance,
  currentUserId,
  pageRegionCards = [],
}: ClearanceDetailPageViewProps) {
  const product =
    initialClearance !== undefined
      ? initialClearance ?? undefined
      // The prize draw IS this page's subject — a read failure must surface
      // rather than become the same `undefined` a removed listing produces,
      // which the "Not Found" branch below already handles.
      : await productRepository.findByIdOrSlug(id);

  if (!product) {
    return (
      <Main>
        <Section padding="y-5xl" >
          <Container size="md">
            <Stack align="start" gap="md" className="text-left">
              <Heading
                level={1} size="2xl" weight="semibold" color="primary">
                Clearance Not Found
              </Heading>
              <Text color="muted">
                The clearance you are looking for may have been removed.
              </Text>
              <Link
                href={resolveSectionHref(String(ROUTES.PUBLIC.CLEARANCE))}
                className="text-[length:var(--appkit-text-sm)] font-medium text-primary-600 hover:underline"
              >
                Browse Clearance
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as FirestoreDocument;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();
  const title = String(p.title ?? p.name ?? "Clearance");
  const slug = typeof p.slug === "string" ? p.slug : String(p.id ?? "");

  const items = stripIsWon(p.prizeDrawItems as PrizeDrawItem[] | undefined);
  const pricePerEntry =
    typeof p.pricePerEntry === "number"
      ? p.pricePerEntry
      : typeof p.price === "number"
        ? p.price
        : 0;
  const max =
    typeof p.prizeMaxEntries === "number" ? p.prizeMaxEntries : 0;
  const current =
    typeof p.prizeCurrentEntries === "number" ? p.prizeCurrentEntries : 0;
  const remaining = Math.max(0, max - current);
  const revealStatus =
    typeof p.prizeRevealStatus === "string"
      ? (p.prizeRevealStatus as "pending" | "open" | "closed")
      : undefined;
  const revealStart = p.prizeRevealWindowStart
    ? new Date(p.prizeRevealWindowStart as string)
    : null;
  const revealEnd = p.prizeRevealWindowEnd
    ? new Date(p.prizeRevealWindowEnd as string)
    : null;
  const githubUrl =
    typeof p.prizeGithubFileUrl === "string" ? p.prizeGithubFileUrl : undefined;
  const maxPerUser =
    typeof p.maxPerUser === "number" && p.maxPerUser > 0
      ? (p.maxPerUser as number)
      : null;

  // SB6-D post-auth — fetch this buyer's existing-entry count when we have
  // an authenticated uid. `orderRepository.countByUserAndProduct` already
  // filters by active statuses (pending/confirmed/processing/shipped/
  // delivered) so cancelled/refunded entries don't count.
  const userEntriesUsed =
    currentUserId && maxPerUser != null
      ? await orderRepository
          .countByUserAndProduct(currentUserId, String(product.id))
          .catch(() => 0)
      : null;

  const thumb = items[0]?.images?.[0];
  const storeName = typeof p.storeName === "string" ? p.storeName : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug =
    (typeof p.storeSlug === "string" ? p.storeSlug : null) ||
    (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug
    ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))
    : null;
  const descriptionHtml = toDescriptionHtml(p.description);
  const categoryName = Array.isArray(p.categoryNames) && p.categoryNames.length > 0 ? String(p.categoryNames[0]) : undefined;
  const brand = typeof p.brand === "string" ? p.brand : undefined;

  const [{ relatedItems, relatedByBrand, relatedByTags, relatedByStore }, groups, pdpSectionVisibility] = await Promise.all([
    computeRelatedItems(product),
    getGroupsWithItemsForProduct(product.id),
    // Same shared "pdp-sections" surface as every other listing type's
    // detail-page component — one admin decision applies across all of them.
    getFieldVisibility("pdp-sections"),
  ]);

  /*
   * `functionalSlot` (2026-11-05) — `ClearanceEntryActions` is rendered
   * directly by this page (no external render-prop parameterizing it,
   * unlike every other listing type) — same shape as Pre-order's
   * `PreOrderBuyBarPanel`/Collector Drop's `renderCollectorDropBidPanel`:
   * an internally-composed element, not a bare callback. No new page-level
   * prop was needed — contrary to this item's own earlier "needs new
   * infrastructure" framing, which (like Pre-order's) turned out to be
   * overstated once the actual JSX was read. `ClearanceBottomActions`
   * (the sticky mobile bar, registered separately via `useBottomActions()`)
   * is left untouched, same reasoning as every other extension.
   */
  const primaryActionsNode = (
    <ClearanceEntryActions
      productId={String(product.id)}
      productSlug={slug}
      title={title}
      pricePerEntry={pricePerEntry}
      currency={currency}
      remainingEntries={remaining}
      revealStatus={revealStatus}
      prizeGithubFileUrl={githubUrl}
    />
  );
  const hasPrimaryActionsSlotOverride = pageRegionCards.some((card) =>
    card.elements.some((el) => el.kind === "functionalSlot" && el.slotId === "pdp-primary-actions"),
  );

  return (
    <Main>
      <HistoryTracker
        productId={String(p.id ?? p.slug ?? "")}
        productType="clearance"
        snapshot={{
          title,
          thumb,
          price: pricePerEntry,
          storeId: typeof p.storeId === "string" ? p.storeId : undefined,
          storeName: storeName ?? undefined,
        }}
      />
      <Container size="xl" padding="y-lg">
        {/* Breadcrumb + share */}
        <Row className="mb-4" align="center" justify="between" gap="sm" wrap>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)] flex-wrap"
          >
            <Link href={resolveSectionHref(String(ROUTES.HOME))} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Home
            </Link>
            <Span aria-hidden>/</Span>
            <Link
              href={resolveSectionHref(String(ROUTES.PUBLIC.CLEARANCE))}
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Clearance
            </Link>
            <Span aria-hidden>/</Span>
            <Span className="truncate max-w-[200px]" color="muted">
              {title}
            </Span>
          </nav>
          <ShareButton title={title} />
        </Row>

        <ListingDetailShell
          layout="grid-2"
          renderGallery={() => (
            <SectionVisibilityGate surfaceId="pdp-sections" sectionKey="gallery" initialVisible={pdpSectionVisibility.gallery !== false}>
              <ClearanceCollage items={items} hideWonState />
            </SectionVisibilityGate>
          )}
          renderInfo={() => (
            <SectionVisibilityGate surfaceId="pdp-sections" sectionKey="info" initialVisible={pdpSectionVisibility.info !== false}>
            <Stack gap="md">
              {/*
                Owner quick-actions, rendered directly — the component self-gates on
                the session, so an async RSC can hand it the record. A prize draw is owned by its store.
              */}
              <OwnerQuickActions
                resource="PRODUCT"
                placement="detail"
                recordLabel={String(product.title ?? product.id)}
                storeId={product.storeId ? String(product.storeId) : undefined}
                editHref={String(ROUTES.STORE.PRODUCTS_EDIT(String(product.id)))}
              />
              <Div>
                <Row gap="xs" wrap className="mb-2">
                  <Span size="xs" weight="semibold" className={CLS_PRIZE_BADGE}>
                    Clearance
                  </Span>
                  <Span
                    size="xs"
                    weight="semibold"
                    className={`inline-block ${statusClass(revealStatus)}`} padding="pill-sm" rounded="full"
                  >
                    {statusLabel(revealStatus)}
                  </Span>
                  {maxPerUser !== null && (
                    <Span size="xs" weight="medium" className="inline-block" padding="pill-sm" rounded="full" surface="subtle" color="muted">
                      Limit: {maxPerUser} entries per customer
                    </Span>
                  )}
                  {maxPerUser !== null && userEntriesUsed !== null && (
                    <Span size="xs" weight="semibold" className={CLS_PRIZE_BADGE}>
                      You have used {userEntriesUsed}/{maxPerUser}
                    </Span>
                  )}
                </Row>
                <Heading
                  level={1}
                  className="leading-snug" smSize="2xl" color="primary" size="xl" weight="bold"
                >
                  {title}
                </Heading>
              </Div>

              <Div className={`${__P.p4}`} border="subtle" rounded="xl" surface="muted">
                <Stack gap="sm">
                  <Row justify="between" align="center">
                    <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                      Entries
                    </Text>
                    <Text size="sm" weight="semibold">
                      {current} / {max} ({remaining} left)
                    </Text>
                  </Row>
                  {revealStart && (
                    <Row justify="between" align="center">
                      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                        Reveal window opens
                      </Text>
                      <Text size="sm" weight="medium">
                        {revealStart.toLocaleString()}
                      </Text>
                    </Row>
                  )}
                  {revealEnd && (
                    <Row justify="between" align="center">
                      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                        Reveal window closes
                      </Text>
                      <Text size="sm" weight="medium">
                        {revealEnd.toLocaleString()}
                      </Text>
                    </Row>
                  )}
                </Stack>
              </Div>

              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-[length:var(--appkit-text-sm)] leading-relaxed text-[var(--appkit-color-text-muted)] line-clamp-4"
                />
              )}

              {safeSeller && (
                <Div className={`${__P.p3}`} border="subtle" rounded="xl" surface="muted">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] tracking-wide mb-0.5" color="faint" transform="uppercase">
                        Sold by
                      </Text>
                      <Text size="sm" weight="semibold" color="primary">
                        {safeSeller}
                      </Text>
                    </Div>
                    {storeHref && (
                      <Link
                        href={resolveSectionHref(storeHref)}
                        className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                      >
                        Visit Store →
                      </Link>
                    )}
                  </Row>
                </Div>
              )}

              {/*
                🛑 Phase 12 — gaming law in India is STATE-SPECIFIC, and this
                is the surface where a visitor decides to pay to enter a draw.
                The entry names the exclusions (void where prohibited, an
                entry from a restricted state is refunded rather than drawn,
                prizes are not exchangeable for cash) and states plainly that
                this is not a government giveaway — rather than asserting a
                skill-versus-chance position we cannot defend in every state.
                *
                * In the sidebar, beside the entry CTA, for rule 1: the
                * decision is made here, not on a terms page.
              */}
              <Disclaimer id="clearance" />
            </Stack>
            </SectionVisibilityGate>
          )}
          renderTabs={() => (
            <SectionVisibilityGate surfaceId="pdp-sections" sectionKey="tabs" initialVisible={pdpSectionVisibility.tabs !== false}>
            <ProductTabsShell
              descriptionContent={
                descriptionHtml ? (
                  <RichText
                    html={descriptionHtml}
                    proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
                    className="text-[var(--appkit-color-text-muted)]"
                  />
                ) : undefined
              }
            />
            </SectionVisibilityGate>
          )}
          renderAside={() => (
            <SectionVisibilityGate surfaceId="pdp-sections" sectionKey="actions" initialVisible={pdpSectionVisibility.actions !== false}>
            <Div padding="5"
              id="prize-draw-buy-bar" border="subtle" surface="muted" rounded="xl"
            >
              {!hasPrimaryActionsSlotOverride && primaryActionsNode}
            </Div>
            </SectionVisibilityGate>
          )}
          renderRelated={() => (
            <Stack gap="xl">
              {/*
                The buyer's own order and review for THIS item. Self-gating: renders
                nothing until auth resolves, because SessionProvider mounts
                initialUser={null} on a static page, so `loading` starts true even for
                someone signed in -- showing the empty state first would flash
                "no order" at a buyer who has one.
              */}
              <PurchaseReviewAffordance
                productId={String(product.id)}
                storeId={product.storeId ? String(product.storeId) : undefined}
              />
              <SectionVisibilityGate surfaceId="pdp-sections" sectionKey="grouped-listings" initialVisible={pdpSectionVisibility["grouped-listings"] !== false}>
                <GroupedListingsCarousel groups={groups} />
              </SectionVisibilityGate>
              <SectionVisibilityGate surfaceId="pdp-sections" sectionKey="related" initialVisible={pdpSectionVisibility.related !== false}>
                <RelatedItemsSection
                  relatedItems={relatedItems}
                  relatedByBrand={relatedByBrand}
                  relatedByTags={relatedByTags}
                  relatedByStore={relatedByStore}
                  categoryLabel={categoryName}
                  brandLabel={brand}
                  storeLabel={storeName ?? undefined}
                />
              </SectionVisibilityGate>
              <AdminComposableRegion
                pageId="clearance-slug"
                initialCards={pageRegionCards}
                functionalSlots={{ "pdp-primary-actions": primaryActionsNode }}
              />
            </Stack>
          )}
        />

        {/* Mobile actions registered via useBottomActions() */}
        <ClearanceBottomActions
          pricePerEntry={pricePerEntry}
          currency={currency}
          closed={revealStatus === "closed" || remaining === 0}
        />
      </Container>
    </Main>
  );
}
