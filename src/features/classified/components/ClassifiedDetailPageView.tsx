import Link from "next/link";
import type { FirestoreDocument } from "@mohasinac/appkit";
import { getClassifiedForDetail } from "../../../_internal/server/features/classified/data";
import { startClassifiedConversationAction } from "../../../_internal/server/features/classified/actions";

const CLS_BREADCRUMB_LINK = "hover:text-primary-600 transition-colors";
const CLS_CLASSIFIED_BADGE = "inline-block rounded-full bg-cyan-100 dark:bg-cyan-900/30 px-[var(--appkit-space-2-5)] py-[var(--appkit-space-0-5)] text-cyan-700 dark:text-cyan-300";

import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import {
  Container,
  Div,
  Heading,
  Main,
  Nav,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
  Dl,
  Dt,
  Dd,
} from "../../../ui";
import { PreOrderDetailView } from "../../products/components/PreOrderDetailView";
import { ProductGalleryClient } from "../../products/components/ProductGalleryClient";
import { ProductTabsShell } from "../../products/components/ProductTabsShell";
import { CustomSectionTabContent } from "../../products/components/CustomSectionTabContent";
import { ShareButton } from "../../products/components/ShareButton";
import { HistoryTracker } from "../../history/components/HistoryTracker";
import { RelatedItemsSection } from "../../products/components/RelatedItemsSection";
import { computeRelatedItems } from "../../../_internal/server/features/products/data";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { getGroupsWithItemsForProduct } from "../../../_internal/server/features/grouped/data";
import { ClassifiedContactSellerPanel } from "./ClassifiedContactSellerPanel";
import type { CustomSection, ProductDocument } from "../../products/schemas/firestore";

export interface ClassifiedDetailPageViewProps {
  slug: string;
  /** Pre-fetched product document — dedupes with generateMetadata() via React.cache(). */
  initialProduct?: ProductDocument | null;
}

function toDescriptionHtml(raw: unknown): string {
  if (!raw) return "";
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  return normalizeRichTextHtml(s);
}

export async function ClassifiedDetailPageView({ slug, initialProduct }: ClassifiedDetailPageViewProps) {
  const product = initialProduct !== undefined
    ? (initialProduct ?? undefined)
    : await getClassifiedForDetail(slug).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section padding="y-5xl">
          <Container size="md">
            <Stack align="start" gap="md" className="text-left">
              <Heading level={1} size="2xl" weight="semibold" color="primary">
                Classified Listing Not Found
              </Heading>
              <Text color="muted">The classified listing you are looking for may have been removed.</Text>
              <Link href={String(ROUTES.PUBLIC.CLASSIFIED)} className="text-[length:var(--appkit-text-sm)] font-medium text-primary-600 hover:underline">
                Browse Classifieds
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as FirestoreDocument;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();
  const title = String(p.title ?? p.name ?? "Classified Listing");
  const price = typeof p.price === "number" ? p.price : null;
  const images: string[] = Array.isArray(p.images) ? (p.images as string[]) : typeof p.mainImage === "string" ? [p.mainImage] : [];
  const meta = product.classified;
  const location = meta?.meetupArea ? [meta.meetupArea.locality, meta.meetupArea.city].filter(Boolean).join(", ") : null;
  const category = Array.isArray(p.categorySlugs) && p.categorySlugs.length > 0 ? String(p.categorySlugs[0]) : (typeof p.category === "string" ? p.category : null);
  const categoryName = Array.isArray(p.categoryNames) && p.categoryNames.length > 0 ? String(p.categoryNames[0]) : (typeof p.categoryName === "string" ? p.categoryName : null);
  const brand = typeof p.brand === "string" ? p.brand : undefined;
  const storeName = typeof p.storeName === "string" ? p.storeName : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug = (typeof p.storeSlug === "string" ? p.storeSlug : null) || (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug)) : null;
  const specs: { name: string; value: string; unit?: string }[] = Array.isArray(p.specifications) ? (p.specifications as { name: string; value: string; unit?: string }[]) : [];
  const customSections: CustomSection[] = Array.isArray(p.customSections) ? (p.customSections as CustomSection[]) : [];
  const descriptionHtml = toDescriptionHtml(p.description);

  const [{ relatedItems, relatedByBrand, relatedByTags, relatedByStore }, groups] = await Promise.all([
    computeRelatedItems(product),
    getGroupsWithItemsForProduct(product.id),
  ]);

  return (
    <Main>
      <HistoryTracker
        productId={String(p.id ?? p.slug ?? "")}
        productType="product"
        snapshot={{
          title,
          thumb: images[0],
          price: price ?? undefined,
          storeId: typeof p.storeId === "string" ? p.storeId : undefined,
          storeName: storeName ?? undefined,
        }}
      />
      <Container size="xl" padding="y-lg">
        <Row className="mb-4" align="center" justify="between" gap="sm" wrap>
          <Nav aria-label="Breadcrumb" layout="flex-wrap" gap="2xs" textSize="xs" color="muted">
            <Link href={String(ROUTES.HOME)} className={CLS_BREADCRUMB_LINK}>Home</Link>
            <Span aria-hidden>/</Span>
            <Link href={String(ROUTES.PUBLIC.CLASSIFIED)} className={CLS_BREADCRUMB_LINK}>Classifieds</Link>
            {category && (
              <>
                <Span aria-hidden>/</Span>
                <Link href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))} className={CLS_BREADCRUMB_LINK}>
                  {categoryName || category}
                </Link>
              </>
            )}
            <Span aria-hidden>/</Span>
            <Span className="truncate max-w-[200px]" color="muted">{title}</Span>
          </Nav>
          <ShareButton title={title} />
        </Row>

        <PreOrderDetailView
          renderGallery={() => <ProductGalleryClient images={images} productName={title} />}
          renderInfo={() => (
            <Stack gap="md">
              <Div>
                <Row gap="xs" wrap className="mb-2">
                  <Span size="xs" weight="semibold" className={CLS_CLASSIFIED_BADGE}>Classified</Span>
                  {meta?.negotiable && (
                    <Span size="xs" weight="medium" className="inline-block" padding="pill-sm" rounded="full" surface="subtle" color="muted">Negotiable</Span>
                  )}
                  {meta?.acceptsShipping && (
                    <Span size="xs" weight="medium" className="inline-block" padding="pill-sm" rounded="full" surface="subtle" color="muted">Shipping available</Span>
                  )}
                </Row>
                <Heading level={1} className="leading-snug" smSize="2xl" color="primary" size="xl" weight="bold">
                  {title}
                </Heading>
              </Div>

              {price !== null && (
                <Text size="2xl" weight="bold" color="primary">{formatCurrency(price, currency)}</Text>
              )}

              {location && (
                <Row color="muted" textSize="sm" align="center" gap="xs">
                  <Span>📍</Span>
                  <Span>{location}</Span>
                  {meta?.meetupArea?.pincode && <Span>· {meta.meetupArea.pincode}</Span>}
                </Row>
              )}

              {meta?.contactMethod && (
                <Text size="xs" color="muted">
                  Contact via: {meta.contactMethod === "both" ? "chat or phone" : meta.contactMethod}
                </Text>
              )}

              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-[length:var(--appkit-text-sm)] leading-relaxed text-[var(--appkit-color-text-muted)] line-clamp-4"
                />
              )}

              {safeSeller && (
                <Div border="subtle" rounded="xl" surface="muted" padding="md">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] tracking-wide mb-0.5" color="faint" transform="uppercase">Sold by</Text>
                      <Text size="sm" weight="semibold" color="primary">{safeSeller}</Text>
                    </Div>
                    {storeHref && (
                      <Link
                        href={storeHref}
                        className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                      >
                        Visit Store →
                      </Link>
                    )}
                  </Row>
                </Div>
              )}
            </Stack>
          )}
          renderTabs={() => (
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
              specsContent={
                specs.length > 0 ? (
                  <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden">
                    {specs.map((s, i) => (
                      <Row gap="md" oddEven="zebra" key={i} surface="default" padding="inline">
                        <Dt className="w-36 flex-shrink-0" color="primary" weight="medium">{s.name}</Dt>
                        <Dd className="flex-1" color="muted">{s.value}{s.unit ? ` ${s.unit}` : ""}</Dd>
                      </Row>
                    ))}
                  </Dl>
                ) : undefined
              }
              customTabs={customSections.map((s) => ({
                id: s.id,
                label: s.title,
                content: <CustomSectionTabContent section={s} />,
              }))}
            />
          )}
          renderBuyBar={() => (
            <Stack id="classified-contact-bar" className="p-[var(--appkit-space-5)]" border="subtle" gap="md" rounded="xl" surface="muted">
              <ClassifiedContactSellerPanel productId={String(product.id)} onContactSeller={startClassifiedConversationAction} />
            </Stack>
          )}
          renderRelated={() => (
            <Stack gap="xl">
              <GroupedListingsCarousel groups={groups} />
              <RelatedItemsSection
                relatedItems={relatedItems}
                relatedByBrand={relatedByBrand}
                relatedByTags={relatedByTags}
                relatedByStore={relatedByStore}
                categoryLabel={categoryName || category || undefined}
                brandLabel={brand}
                storeLabel={storeName ?? undefined}
              />
            </Stack>
          )}
        />
      </Container>
    </Main>
  );
}
