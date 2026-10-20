import { Row, SIEVE_OP, sieveAnd, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import Link from "next/link";
import {
  categoriesRepository,
  productRepository,
} from "../../../repositories";
import { ROUTES } from "../../../next/routing/route-map";
import { Anchor, Container, Div, Dl, Dt, Dd, Heading, Main, Nav, Section, Span, Stack, Text } from "../../../ui";
import { OwnerQuickActions } from "../../admin/components/OwnerQuickActions";
import { DynamicBgDiv } from "../../../ui/components/DynamicBgDiv";
import { MediaImage } from "../../media/MediaImage";
import { RichTextRenderer } from "../../../ui/rich-text/RichTextRenderer";
import { BrandDetailTabs } from "./BrandDetailTabs";
import { CategoryGrid } from "./CategoryGrid";
import { CategoryHighlightsAndFaqSection } from "./CategoryHighlightsAndFaqSection";
import { categoryCrumbs, withTrailHead } from "../utils/breadcrumb-chain";
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  faqJsonLd,
} from "../../../seo/json-ld";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { getGroupsForBrand } from "../../../_internal/server/features/grouped/data";
import {
  listingTabCounts,
  type ListingTabCounts,
  type ListingTabCountResult,
} from "../../../_internal/server/features/products/listing-tab-counts";
import { CATEGORY_PAGE_TABS } from "../../products/constants/listing-tabs";
import { enabledCategoryTypes, enabledListingTypes } from "../../../_internal/shared/listing-types/feature-flags";
import { siteSettingsRepository } from "../../../repositories";
import { safeRead } from "../../../errors/safe-read";
import type { CategoryItem } from "../types";
import type { CategoryDocument } from "../schemas/firestore";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface BrandDetailPageViewProps {
  slug: string;
  initialBrand?: CategoryDocument | null;
}

export async function BrandDetailPageView({ slug, initialBrand }: BrandDetailPageViewProps) {
  // The brand IS this page's subject — a read failure must surface rather than
  // render an anonymous, empty brand page. `undefined` still means "no such
  // brand slug".
  const brandDoc = initialBrand ?? (await categoriesRepository.getCategoryBySlug(slug)) ?? undefined;
  const brand = (brandDoc ?? undefined) as CategoryItem | undefined;
  /*
   * 🛑 Read from the DOCUMENT, not from the `CategoryItem` cast — the same rule
   * `CategoryDetailPageView` states for this exact field.
   *
   * `contentBody` is deliberately PRIVATE on the list projection: it is 400-900
   * chars of HTML per row and `CategoryInlineSelect` fetches 200 rows on every
   * seller-form open, so publishing it there would be the Fast-Origin-Transfer
   * shape of Root Cause #104. Widening `CategoryItem` to satisfy one render site
   * is exactly the invitation that comment warns about — and it is what the
   * first attempt at this did, which `tsc` caught.
   *
   * No extra read: this page already holds the whole document (`initialBrand`,
   * or the fetch above). Only the local cast hid it.
   */
  const brandContentBody =
    typeof brandDoc?.contentBody === "string" ? brandDoc.contentBody : null;

  const brandName = brand?.name;

  const [productsResult, tabCounts, allBundles, activeBrands, groupedListings, settings] = await Promise.all([
    brandName
      ? safeRead<Awaited<ReturnType<typeof productRepository.list>> | null>(
          () =>
            productRepository.list({
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("brand", SIEVE_OP.EQ, brandName), sieveFilter("listingType", SIEVE_OP.EQ, "standard")),
              sorts: sortBy("createdAt", "DESC"),
              page: 1,
              pageSize: 24,
            }),
          { route: "/brands/[slug]", key: "brand.products", fallback: null },
        )
      : Promise.resolve(null),
    // One count per tab, derived from CATEGORY_PAGE_TABS. Four of the nine tabs
    // (classifieds, digital codes, live, art) had no count at all and could
    // therefore never hide, however empty the brand was.
    brandName
      ? listingTabCounts(CATEGORY_PAGE_TABS, { brandName })
      : Promise.resolve({ available: {}, total: {} } as ListingTabCountResult),
    // SB-UNI-D — bundles are categoryType:"bundle" rows on the categories
    // collection, tagged to a brand via the real brandSlug field (added
    // 2026-08-21 — previously a fragile seo.keywords string-match heuristic).
    // We pull all bundle categories and filter client-side by brandSlug —
    // no dedicated repository query needed at this catalog's bundle volume.
    brand?.slug
      ? safeRead(
          () =>
            categoriesRepository
              .listByType("bundle", { activeOnly: true, limit: 50 })
              .then(hidePublicTestData),
          { route: "/brands/[slug]", key: "brand.bundles", fallback: [] },
        )
      : Promise.resolve([]),
    // Related brands — every other active brand row, excluding this one.
    // `as unknown` is load-bearing only because CategoryDocument.createdAt is a
    // Date while CategoryItem.createdAt is a string — a pre-existing mismatch
    // the old `.catch(() => [])` union happened to paper over.
    safeRead(() => categoriesRepository.findActiveBrands().then(hidePublicTestData), {
      route: "/brands/[slug]",
      key: "brand.relatedBrands",
      fallback: [],
    }) as unknown as Promise<CategoryItem[]>,
    brand?.slug
      ? safeRead(() => getGroupsForBrand(brand.slug!), {
          route: "/brands/[slug]",
          key: "brand.groupedListings",
          fallback: [] as Awaited<ReturnType<typeof getGroupsForBrand>>,
        })
      : Promise.resolve([]),
    // Feature flags — accepted by BrandDetailTabs all along but never passed,
    // so a disabled listing type still showed its tab here.
    safeRead(() => siteSettingsRepository.findById("global"), {
      route: "/brands/[slug]",
      key: "brand.siteSettings",
      fallback: null,
    }),
  ]);

  const brandBundles = brand?.slug
    ? (allBundles as CategoryDocument[]).filter((b) => b.brandSlug === brand.slug)
    : [];

  const relatedBrands = activeBrands.filter((b) => b.id !== brand?.id);

  const coverImage = brand?.display?.coverImage;
  const hasCover = Boolean(coverImage);
  // Brand accent — falls back to the primary theme token when the brand hasn't
  // configured one. The value is consumed as `style={{ backgroundColor }}` so it
  // accepts both CSS vars and raw hex written by an admin.
  const brandColor = brand?.display?.color || "var(--appkit-color-primary)";

  // Keyed by tabSlug. `bundles` is overridden with the brand-scoped figure —
  // `listingTabCounts` cannot narrow bundles by brand (a bundle's brand lives on
  // `brandSlug`, which this page already filters on locally).
  // Badge = available scope; hiding + the header pill = total. See the same
  // split in `CategoryDetailPageView` and `ListingTabCountResult`.
  const counts: ListingTabCounts = {
    ...tabCounts.available,
    products: tabCounts.available.products ?? brand?.metrics?.productCount ?? 0,
    auctions: tabCounts.available.auctions ?? brand?.metrics?.auctionCount ?? 0,
    bundles: brandBundles.length,
  };
  const totals: ListingTabCounts = {
    ...tabCounts.total,
    products: tabCounts.total.products ?? brand?.metrics?.productCount ?? 0,
    auctions: tabCounts.total.auctions ?? brand?.metrics?.auctionCount ?? 0,
    bundles: brandBundles.length,
  };

  // Header total — `?? 0` is right here (a pill just doesn't render), unlike the
  // tab bar where an unknown count must keep its tab visible.
  const totalItems = Object.values(totals).reduce<number>(
    (sum, n) => sum + (n ?? 0),
    0,
  );

  /*
   * ── D4: structured data on the brand page ───────────────────────────────
   *
   * Same gap as the category page and the same fix — verified: zero `JsonLd`
   * references in this file before this change. §5 item 4 asks for exactly
   * this trio here, and notes the `revalidate` half was already banked by
   * `7d9dcf7c7` (this route is 3600 now), so the JSON-LD was all that remained.
   *
   * 🛑 `CollectionPage`, NOT `Brand`. A `Brand` node describes the brand as an
   * entity; this page is a LISTING of that brand's items, and the markup should
   * say what the page IS. The brand's own identity facts (website, country,
   * founded) are rendered in the About panel for a human — turning them into a
   * `Brand` node is a separate decision with its own rich-result implications,
   * and claiming one without being the brand's own site invites a wrong one.
   *
   * Costs no extra read: `brand`, `counts` and `faqs` are already in hand.
   */
  const brandPath = String(ROUTES.PUBLIC.BRAND_DETAIL(slug));

  /*
   * A brand is FLAT — tier 0, no ancestors, so the chain is genuinely three
   * crumbs and `categoryCrumbs` returns just the brand itself. Routed through
   * the shared builder anyway, so the last-crumb rule (no self-link) is applied
   * once for every surface rather than remembered three times.
   */
  const ldBreadcrumb = breadcrumbJsonLd(
    withTrailHead(
      categoryCrumbs({
        name: brand?.name ?? "Brand",
        url: brandPath,
        ancestors: brand?.ancestors,
        hrefFor: (id) => String(ROUTES.PUBLIC.BRAND_DETAIL(id)),
      }),
      [
        { name: "Home", url: "/" },
        { name: "Brands", url: String(ROUTES.PUBLIC.BRANDS) },
      ],
    ),
  );

  /*
   * 🛑 No `items`, deliberately. A brand page's contents are the brand's
   * PRODUCTS, and an `ItemList` of products without prices is the weaker half
   * of a node whose useful form is blocked here (`audit-guest-price-leak` R3,
   * because the page shows a signed-out crawler no prices at all). The
   * category page lists child CATEGORIES because taxonomy routing is its real
   * contribution; a brand has no sub-brands, so there is nothing equivalent to
   * list. `totalItems` still states the scale, which is the part worth saying.
   */
  const ldCollection = collectionPageJsonLd({
    name: brand?.name ?? "Brand",
    url: brandPath,
    ...(brand?.description ? { description: brand.description } : {}),
    totalItems,
  });

  const ldFaq =
    brand?.faqs && brand.faqs.length > 0
      ? faqJsonLd(brand.faqs.map((f) => ({ question: f.question, answer: f.answer })))
      : null;

  return (
    <Main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCollection) }}
      />
      {ldFaq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }}
        />
      )}
      {/* ── Brand Hero ──────────────────────────────────────────────────── */}
      <Section className={`relative ${__O.hidden} ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-[var(--appkit-color-bg)]"}`}>
        {hasCover && (
          <>
            <Div className="absolute inset-0">
              <MediaImage src={coverImage} alt="" size="banner" />
            </Div>
            <Div surface="overlay-md" className="absolute inset-0" />
          </>
        )}
        {!hasCover && (
          <DynamicBgDiv color={brandColor} className="absolute inset-0 opacity-10" />
        )}

        <Div className="relative z-10 max-w-7xl mx-auto" paddingY={hasCover ? "y-3xl" : "y-xl"} padding="x-md">
          {/* Breadcrumb */}
          <Nav layout="flex" gap="2xs" textSize="sm" className="mb-4" aria-label="Breadcrumb">
            <Link
              href={String(ROUTES.HOME)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-[var(--appkit-color-text-muted)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"}
            >
              Home
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Link
              href={String(ROUTES.PUBLIC.BRANDS)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-[var(--appkit-color-text-muted)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"}
            >
              Brands
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Span weight="medium" className={hasCover ? "text-white" : "text-[var(--appkit-color-text)]"}>
              {brand?.name ?? slug}
            </Span>
          </Nav>

          {/* Brand logo + name */}
          <Row className="mb-3" align="center" gap="md">
            {brand?.display?.icon && (
              <Span className="leading-none" size="5xl">
                {brand.display.icon}
              </Span>
            )}
            <>
              {/* See CategoryDetailPageView for why this is rendered directly
                  rather than threaded through a slot prop. Brands have no
                  owner either, so this is admin-only, and they carry the same
                  derived tree fields — hence no clone. */}
              {brand?.id && (
                <OwnerQuickActions
                  resource="BRAND"
                  placement="detail"
                  className="mb-2"
                  recordLabel={brand.name ?? slug}
                  editHref={String(ROUTES.ADMIN.BRANDS_EDIT(brand.id))}
                />
              )}
              <Heading color="inverse" level={1} className={`${hasCover ? "" : "text-[var(--appkit-color-text)]"}`} size="3xl" mdSize="4xl" weight="bold">
                {brand?.name ?? slug}
              </Heading>
              {brand?.description && typeof brand.description === "string" && !brand.description.startsWith("{") && (
                <Text color={hasCover ? "inverse" : "muted"} className={`max-w-2xl mt-1 ${hasCover ? "/80" : ""}`} size="base">
                  {brand.description}
                </Text>
              )}
            </>
          </Row>

          {/* Item count chips */}
          <Row gap="sm" wrap className="mt-3">
            {(counts.products ?? 0) > 0 && (
              <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="medium" className={`${ hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400" }`} rounded="full" padding="pill-sm-tall">
                {counts.products!.toLocaleString()} {counts.products === 1 ? "product" : "products"}
              </Span>
            )}
            {(counts.auctions ?? 0) > 0 && (
              <Span layout="inline-flex" gap="xs" color={hasCover ? "inverse" : "warning"} surface={hasCover ? undefined : "warning-surface"} size="xs" weight="medium" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : ""} rounded="full" padding="pill-sm-tall">
                {counts.auctions!.toLocaleString()} {counts.auctions === 1 ? "auction" : "auctions"}
              </Span>
            )}
            {(counts["pre-orders"] ?? 0) > 0 && (
              <Span layout="inline-flex" gap="xs" color={hasCover ? "inverse" : "info"} surface={hasCover ? undefined : "info-surface"} size="xs" weight="medium" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : ""} rounded="full" padding="pill-sm-tall">
                {counts["pre-orders"]!.toLocaleString()} {counts["pre-orders"] === 1 ? "pre-order" : "pre-orders"}
              </Span>
            )}
            {totalItems === 0 && (
              <Span size="sm" className={hasCover ? "text-white/60" : "text-zinc-400"}>
                No items listed yet
              </Span>
            )}
          </Row>
        </Div>
      </Section>

      {/* ── About this brand ────────────────────────────────────────────── */}
      {(brand?.brandWebsite || brand?.brandCountry || brand?.brandFounded) && (
        <Section border="subtle" surface="default" className="border-b" padding="y-md">
          <Container size="xl">
            <Stack gap="sm">
              <Heading level={2} size="sm" weight="semibold" color="muted" transform="uppercase">
                About this brand
              </Heading>
              <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden max-w-lg">
                {brand?.brandWebsite && (
                  <Row gap="md" oddEven="zebra" surface="default" padding="inline">
                    <Dt className="w-32 flex-shrink-0" color="primary" weight="medium">Website</Dt>
                    <Dd className="flex-1">
                      <Anchor href={brand.brandWebsite} tone="brand" underline="hover">
                        {brand.brandWebsite}
                      </Anchor>
                    </Dd>
                  </Row>
                )}
                {brand?.brandCountry && (
                  <Row gap="md" oddEven="zebra" surface="default" padding="inline">
                    <Dt className="w-32 flex-shrink-0" color="primary" weight="medium">Country</Dt>
                    <Dd className="flex-1" color="muted">{brand.brandCountry}</Dd>
                  </Row>
                )}
                {brand?.brandFounded && (
                  <Row gap="md" oddEven="zebra" surface="default" padding="inline">
                    <Dt className="w-32 flex-shrink-0" color="primary" weight="medium">Founded</Dt>
                    <Dd className="flex-1" color="muted">{brand.brandFounded}</Dd>
                  </Row>
                )}
              </Dl>
            </Stack>
          </Container>
        </Section>
      )}

      {/* ── The brand's OWN content ──────────────────────────────────────────
          🛑 A brand IS a `CategoryDocument` (discriminated by
          `categoryType: "brand"`), so it can carry `contentBody`, an admin can
          author one through the brand editor, and the public projection already
          lists the field. It had no render site on THIS page — only
          `CategoryDetailPageView` grew one. So brand body copy was authorable,
          storable and invisible, which is the same defect that page's own
          comment records fixing for categories, left half-done one document
          type over. Root Cause #52: the data was already fetched and the UI was
          never wired to it.

          Mirrors `CategoryDetailPageView` exactly — `RichTextRenderer` (what
          the field's docstring specifies, SSR-safe because `RichTextEditor`
          sanitises at save time), inside the same `Section`/`Container`, and
          omitted entirely when absent rather than rendering an empty prose
          block that reads as a broken page. */}
      {brandContentBody && brandContentBody.trim().length > 0 && (
        <Section padding="y-lg">
          <Container size="xl">
            <RichTextRenderer html={brandContentBody} />
          </Container>
        </Section>
      )}

      <CategoryHighlightsAndFaqSection highlights={brand?.highlights} faqs={brand?.faqs} />

      {/* ── Tabs: Products / Auctions / Pre-Orders ──────────────────────── */}
      <Section padding="y-lg">
        <Container size="xl">
          {brandName ? (
            <BrandDetailTabs
              brandName={brandName}
              initialProductsData={productsResult ?? undefined}
              initialBundles={brandBundles as any}
              counts={counts}
              totals={totals}
              enabledListingTypes={enabledListingTypes(settings)}
              enabledCategoryTypes={enabledCategoryTypes(settings)}
            />
          ) : (
            <Text paddingY="3xl" color="muted" size="sm" align="start">
              Brand not found.
            </Text>
          )}
        </Container>
      </Section>

      {groupedListings.length > 0 && (
        <Section padding="y-lg">
          <Container size="xl">
            <GroupedListingsCarousel groups={groupedListings} />
          </Container>
        </Section>
      )}

      {/* ── Related brands ───────────────────────────────────────────────── */}
      {relatedBrands.length > 0 && (
        <Section border="subtle" surface="default" className="border-t" padding="y-lg">
          <Container size="xl">
            <Heading level={2} className="mb-4" size="xl" weight="semibold">
              Related Brands
            </Heading>
            <CategoryGrid
              categories={relatedBrands}
              getHref={(b) => String(ROUTES.PUBLIC.BRAND_DETAIL(b.slug))}
            />
          </Container>
        </Section>
      )}
    </Main>
  );
}
