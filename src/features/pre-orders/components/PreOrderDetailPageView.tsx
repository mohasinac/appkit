import Link from "next/link";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import {
  Button,
  Container,
  Div,
  Heading,
  Main,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { PreOrderDetailView } from "../../products/components/PreOrderDetailView";
import { BuyBar } from "../../products/components/BuyBar";
import { ProductTabsShell } from "../../products/components/ProductTabsShell";
import { CustomSectionTabContent } from "../../products/components/CustomSectionTabContent";
import { PreOrderActionsClient } from "./PreOrderActionsClient";
import { ProductGalleryClient } from "../../products/components/ProductGalleryClient";
import { ProductFeatureBadges } from "../../products/components/ProductFeatureBadges";
import { FeatureBadgeList } from "../../products/components/FeatureBadge";
import type { ProductFeatureDocument } from "../../products/schemas/product-features";
import { ShareButton } from "../../products/components/ShareButton";
import { SublistingCarouselSection } from "../../products/components/SublistingCarouselSection";
import { HistoryTracker } from "../../history/components/HistoryTracker";
import { ShowGroupSection } from "../../products/components/ShowGroupSection";
import type { CustomSection } from "../../products/schemas/firestore";

export interface PreOrderDetailPageViewProps {
  id: string;
  /**
   * Pre-fetched product document from the page's server data layer.
   * When provided, the internal repository call is skipped — deduplicating
   * the fetch with generateMetadata() via React.cache().
   * When absent, falls back to fetching by slug/id (backward compat).
   */
  initialPreOrder?: import("../../products/schemas/firestore").ProductDocument | null;
  onReserveNow?: (productId: string) => Promise<void>;
  /** SSR-loaded productFeatures (platform + store-scope). See ProductDetailPageView for semantics. */
  productFeatures?: ProductFeatureDocument[];
}

function toDescriptionHtml(raw: unknown): string {
  if (!raw) return "";
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  return normalizeRichTextHtml(s);
}

const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  upcoming: "Coming Soon",
  in_production: "In Production",
  ready_to_ship: "Ready to Ship",
};

export async function PreOrderDetailPageView({ id, initialPreOrder, onReserveNow, productFeatures }: PreOrderDetailPageViewProps) {
  const product = initialPreOrder !== undefined
    ? (initialPreOrder ?? undefined)
    : await productRepository.findByIdOrSlug(id).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading level={1} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Pre-Order Not Found
              </Heading>
              <Text className="text-zinc-500">
                The pre-order item you are looking for may have been removed.
              </Text>
              <Link href={String(ROUTES.PUBLIC.PRE_ORDERS)} className="text-sm font-medium text-primary-600 hover:underline">
                Browse Pre-Orders
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as Record<string, unknown>;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();

  const title = String(p.title ?? p.name ?? "Pre-Order Item");
  const price = typeof p.price === "number" ? p.price : null;

  const images: string[] = Array.isArray(p.images)
    ? (p.images as string[])
    : typeof p.mainImage === "string"
      ? [p.mainImage]
      : [];

  const reservedCount =
    typeof p.preOrderCurrentCount === "number"
      ? p.preOrderCurrentCount
      : typeof p.reservedCount === "number"
        ? p.reservedCount
        : 0;
  const reserveTarget =
    typeof p.preOrderMaxQuantity === "number"
      ? p.preOrderMaxQuantity
      : typeof p.preOrderTarget === "number"
        ? p.preOrderTarget
        : typeof p.reserveTarget === "number"
          ? p.reserveTarget
          : 0;
  const progressPct =
    reserveTarget > 0
      ? Math.min(100, Math.round((reservedCount / reserveTarget) * 100))
      : 0;

  const depositPercent =
    typeof p.preOrderDepositPercent === "number" ? p.preOrderDepositPercent : null;
  const depositAmount =
    typeof p.preOrderDepositAmount === "number"
      ? p.preOrderDepositAmount
      : price !== null && depositPercent !== null
        ? Math.round((price * depositPercent) / 100)
        : null;

  const deliveryDate = p.preOrderDeliveryDate
    ? new Date(p.preOrderDeliveryDate as string)
    : null;
  const productionStatus =
    typeof p.preOrderProductionStatus === "string"
      ? (p.preOrderProductionStatus as string)
      : null;
  const isCancellable = p.preOrderCancellable === true;

  const condition = typeof p.condition === "string" ? p.condition : null;
  const featured = p.featured === true;
  const shippingPaidBy = p.shippingPaidBy as "seller" | "buyer" | undefined;
  const freeShipping = shippingPaidBy === "seller";
  const storeName = typeof p.storeName === "string" ? p.storeName : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug = (typeof p.storeSlug === "string" ? p.storeSlug : null) || (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug
    ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))
    : null;
  const category = typeof p.category === "string" ? (p.category as string) : null;
  const categoryName = typeof p.categoryName === "string" ? (p.categoryName as string) : null;
  const brand = typeof p.brand === "string" ? (p.brand as string) : null;
  const brandSlug = typeof p.brandSlug === "string" ? (p.brandSlug as string) : null;
  const features: string[] = Array.isArray(p.features) ? (p.features as string[]) : [];
  const tags: string[] = Array.isArray(p.tags) ? (p.tags as string[]) : [];
  const specs: { name: string; value: string; unit?: string }[] = Array.isArray(p.specifications)
    ? (p.specifications as { name: string; value: string; unit?: string }[])
    : [];
  const customSections: CustomSection[] = Array.isArray(p.customSections)
    ? (p.customSections as CustomSection[])
    : [];
  const descriptionHtml = toDescriptionHtml(p.description);
  const sublistingCategoryId = typeof p.sublistingCategoryId === "string" ? p.sublistingCategoryId : null;
  const groupId = typeof p.groupId === "string" ? p.groupId : null;
  const isGroupParent = p.isGroupParent === true;
  const groupTitle = typeof p.groupTitle === "string" ? p.groupTitle : undefined;

  return (
    <Main>
      <HistoryTracker
        productId={String(p.id ?? p.slug ?? "")}
        productType="preorder"
        snapshot={{
          title: typeof p.title === "string" ? p.title : undefined,
          thumb:
            typeof p.mainImage === "string"
              ? p.mainImage
              : Array.isArray(p.images) && typeof p.images[0] === "string"
                ? p.images[0]
                : undefined,
          price: typeof p.price === "number" ? p.price : undefined,
          storeId: typeof p.storeId === "string" ? p.storeId : undefined,
          storeName: typeof p.storeName === "string" ? p.storeName : undefined,
        }}
      />
      <Container size="xl" className="px-4 py-6">
        {/* Breadcrumb + share */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
            <Link href={String(ROUTES.HOME)} className="hover:text-primary-600 transition-colors">Home</Link>
            <Span aria-hidden>/</Span>
            <Link href={String(ROUTES.PUBLIC.PRE_ORDERS)} className="hover:text-primary-600 transition-colors">Pre-Orders</Link>
            {category && (
              <>
                <Span aria-hidden>/</Span>
                <Link href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))} className="hover:text-primary-600 transition-colors">
                  {categoryName || category}
                </Link>
              </>
            )}
            <Span aria-hidden>/</Span>
            <Span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{title}</Span>
          </nav>
          <ShareButton title={title} />
        </div>

        <PreOrderDetailView
          renderGallery={() => (
            <ProductGalleryClient images={images} productName={title} />
          )}
          renderInfo={() => (
            <Stack gap="md">
              {/* Pre-order badge + production status + title */}
              <Div>
                <Row gap="xs" className="mb-2 flex-wrap">
                  <Span className="inline-block rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Pre-Order
                  </Span>
                  {productionStatus && (
                    <Span className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {PRODUCTION_STATUS_LABELS[productionStatus] ?? productionStatus}
                    </Span>
                  )}
                </Row>
                <Heading level={1} className="text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                  {title}
                </Heading>
              </Div>

              {/* Delivery date — price lives in the buy-bar panel on the right */}
              {deliveryDate && (
                <Row align="center" gap="xs" className="text-sm text-zinc-600 dark:text-zinc-400">
                  <Span>📅</Span>
                  <Span>Estimated delivery:</Span>
                  <Span className="font-medium">
                    {deliveryDate.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                  </Span>
                </Row>
              )}

              {/* Feature badges */}
              <ProductFeatureBadges
                featured={featured}
                freeShipping={freeShipping}
                condition={condition ?? undefined}
                returnable={isCancellable}
                labels={{
                  featured: "Featured",
                  fasterDelivery: "Faster Delivery",
                  ratedSeller: "Rated Seller",
                  condition: "Condition",
                  conditionNew: "New",
                  conditionUsed: "Used",
                  conditionBroken: "For Parts",
                  conditionRefurbished: "Refurbished",
                  returnable: "Cancellable",
                  freeShipping: "Free Shipping",
                  codAvailable: "Cash on Delivery",
                  wishlistCount: (n) => `${n} wishlisted`,
                  categoryProductCount: (n, cat) => `${n} in ${cat}`,
                }}
              />

              {/* Category / brand pills */}
              {(categoryName || category || brand) && (
                <Row gap="sm" wrap>
                  {category && (
                    <Link
                      href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category))}
                      className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                    >
                      {categoryName || category}
                    </Link>
                  )}
                  {!category && categoryName && (
                    <Span className="inline-flex items-center rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {categoryName}
                    </Span>
                  )}
                  {brand && brandSlug && (
                    <Link
                      href={String(ROUTES.PUBLIC.BRAND_DETAIL(brandSlug))}
                      className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-700/60 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                    >
                      {brand}
                    </Link>
                  )}
                  {brand && !brandSlug && (
                    <Span className="inline-flex items-center rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {brand}
                    </Span>
                  )}
                </Row>
              )}

              {/* Feature badges (FI6) — when productFeatures prop is passed */}
              {productFeatures && features.length > 0 && (
                <FeatureBadgeList
                  productFeatureIds={features}
                  features={productFeatures}
                />
              )}

              {/* Highlights (legacy text fallback) — suppressed when productFeatures is provided */}
              {!productFeatures && features.length > 0 && (
                <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    About this product
                  </Text>
                  <ul className="space-y-1.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </Div>
              )}

              {/* Description preview */}
              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-4"
                />
              )}

              {/* Store card */}
              {safeSeller && (
                <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-0.5">
                        Sold by
                      </Text>
                      <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {safeSeller}
                      </Text>
                    </Div>
                    {storeHref && (
                      <Link
                        href={storeHref}
                        className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                      >
                        Visit Store →
                      </Link>
                    )}
                  </Row>
                </Div>
              )}
            </Stack>
          )}
          renderSublistingSection={
            sublistingCategoryId
              ? () => (
                  <SublistingCarouselSection
                    sublistingCategoryId={sublistingCategoryId}
                    currentListingId={String(product.id)}
                  />
                )
              : undefined
          }
          renderGroupSection={
            groupId
              ? () => (
                  <ShowGroupSection
                    groupId={groupId}
                    currentSlug={String(p.slug ?? product.id)}
                    isParent={isGroupParent}
                    groupTitle={groupTitle}
                  />
                )
              : undefined
          }
          renderTabs={() => (
            <ProductTabsShell
              descriptionContent={
                descriptionHtml ? (
                  <RichText
                    html={descriptionHtml}
                    proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
                    className="text-zinc-700 dark:text-zinc-300"
                  />
                ) : undefined
              }
              specsContent={
                specs.length > 0 ? (
                  <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden text-sm">
                    {specs.map((s, i) => (
                      <div
                        key={i}
                        className="flex gap-4 px-4 py-3 bg-white dark:bg-zinc-900 even:bg-zinc-50 dark:even:bg-zinc-800/50"
                      >
                        <dt className="w-36 flex-shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                          {s.name}
                        </dt>
                        <dd className="flex-1 text-zinc-600 dark:text-zinc-400">
                          {s.value}{s.unit ? ` ${s.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
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
            <Div id="pre-order-buy-bar" className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 space-y-4">
              {/* Progress bar */}
              {reserveTarget > 0 && (
                <Div className="space-y-2">
                  <Row justify="between" align="center">
                    <Text className="text-xs text-zinc-500">
                      {reservedCount} of {reserveTarget} reserved
                    </Text>
                    <Span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                      {progressPct}%
                    </Span>
                  </Row>
                  <Div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <Div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </Div>
                </Div>
              )}

              {onReserveNow ? (
                <PreOrderActionsClient
                  productId={String(product.id)}
                  price={price}
                  currency={currency}
                  depositAmount={depositAmount}
                  depositPercent={depositPercent}
                  isCancellable={isCancellable}
                  tags={tags}
                  onReserveNow={onReserveNow}
                />
              ) : (
                <>
                  {price !== null && (
                    <Div>
                      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(price, currency)}
                      </Text>
                      {depositAmount !== null && (
                        <Text className="mt-0.5 text-xs text-zinc-500">
                          Reserve with {formatCurrency(depositAmount, currency)}{depositPercent !== null ? ` (${depositPercent}% deposit)` : ""}
                        </Text>
                      )}
                    </Div>
                  )}
                  <Stack gap="sm">
                    <Button variant="primary" size="md" className="w-full">
                      Reserve Now
                    </Button>
                    {isCancellable && (
                      <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                        ✓ Free cancellation before production
                      </Text>
                    )}
                  </Stack>
                  {tags.length > 0 && (
                    <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <Row wrap gap="xs">
                        {tags.map((tag) => (
                          <Span key={tag} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300">
                            {tag}
                          </Span>
                        ))}
                      </Row>
                    </Div>
                  )}
                  <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                    <Row wrap gap="sm" className="justify-center text-center">
                      {[
                        { icon: "🔒", label: "Secure\nPayment" },
                        { icon: "📅", label: "Guaranteed\nDelivery" },
                        { icon: "↩", label: "Free\nCancellation" },
                      ].map(({ icon, label }) => (
                        <Div key={label} className="flex flex-col items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 min-w-[60px]">
                          <Span className="text-base">{icon}</Span>
                          <Span className="whitespace-pre-line leading-tight">{label}</Span>
                        </Div>
                      ))}
                    </Row>
                  </Div>
                </>
              )}
            </Div>
          )}
        />

        {/* Mobile sticky buy bar */}
        <BuyBar>
          {price !== null && (
            <Span className="mr-auto text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(price, currency)}
            </Span>
          )}
          <a
            href="#pre-order-buy-bar"
            className="appkit-button appkit-button--primary appkit-button--sm flex-1"
          >
            <span className="appkit-button__content">Reserve Now</span>
          </a>
        </BuyBar>
      </Container>
    </Main>
  );
}
