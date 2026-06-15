import Link from "next/link";
import { productRepository } from "../../../repositories";

const __P = {
  p3: "p-3",
  p5: "p-5",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_BREADCRUMB_LINK = "hover:text-primary-600 transition-colors";
const CLS_PREORDER_BADGE = "inline-block rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-indigo-700 dark:text-indigo-300";
const CLS_STATUS_BADGE = "inline-block rounded-full bg-warning-surface dark:bg-warning-surface px-2.5 py-0.5 text-warning dark:text-warning";
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
  Nav,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
  Ul,
  Li,
  Dl,
  Dt,
  Dd,
} from "../../../ui";
import { PreOrderDetailView } from "../../products/components/PreOrderDetailView";
import { PreOrderBottomActions } from "./PreOrderBottomActions";
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

interface PreOrderInfoSectionProps {
  title: string;
  productionStatus: string | null;
  maxPerUser: number | null;
  deliveryDate: Date | null;
  featured: boolean;
  freeShipping: boolean;
  condition: string | null;
  isCancellable: boolean;
  category: string | null;
  categoryName: string | null;
  brand: string | null;
  brandSlug: string | null;
  productFeatures?: import("../../products/schemas/product-features").ProductFeatureDocument[];
  features: string[];
  descriptionHtml: string;
  safeSeller: string | null;
  storeHref: string | null;
}

function PreOrderInfoSection({
  title,
  productionStatus,
  maxPerUser,
  deliveryDate,
  featured,
  freeShipping,
  condition,
  isCancellable,
  category,
  categoryName,
  brand,
  brandSlug,
  productFeatures,
  features,
  descriptionHtml,
  safeSeller,
  storeHref,
}: PreOrderInfoSectionProps) {
  return (
    <Stack gap="md">
      {/* Pre-order badge + production status + title */}
      <Div>
        <Row gap="xs" wrap className="mb-2">
          <Span size="xs" weight="semibold" className={CLS_PREORDER_BADGE}>
            Pre-Order
          </Span>
          {productionStatus && (
            <Span size="xs" weight="medium" className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5" color="muted">
              {PRODUCTION_STATUS_LABELS[productionStatus] ?? productionStatus}
            </Span>
          )}
          {maxPerUser !== null && (
            <Span size="xs" weight="medium" className={CLS_STATUS_BADGE}>
              Limit: {maxPerUser} per customer
            </Span>
          )}
        </Row>
        <Heading level={1} className="leading-snug sm:text-2xl" color="primary" size="xl" weight="bold">
          {title}
        </Heading>
      </Div>

      {deliveryDate && (
        <Row align="center" gap="xs" className="text-sm text-zinc-600 dark:text-zinc-400">
          <Span>📅</Span>
          <Span>Estimated delivery:</Span>
          <Span weight="medium">
            {deliveryDate.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
          </Span>
        </Row>
      )}

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
            <Span size="xs" weight="medium" className="inline-flex items-center rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1" color="muted">
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
            <Span size="xs" weight="medium" className="inline-flex items-center rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1" color="muted">
              {brand}
            </Span>
          )}
        </Row>
      )}

      {productFeatures && features.length > 0 && (
        <FeatureBadgeList productFeatureIds={features} features={productFeatures} />
      )}

      {!productFeatures && features.length > 0 && (
        <Div className="dark:bg-zinc-900/60 px-4" border="subtle" surface="muted" padding="y-sm" rounded="xl">
          <Text className="mb-2 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
            About this product
          </Text>
          <Ul className="space-y-1.5">
            {features.map((f, i) => (
              <Li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>
                {f}
              </Li>
            ))}
          </Ul>
        </Div>
      )}

      {descriptionHtml && (
        <RichText
          html={descriptionHtml}
          proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
          className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-4"
        />
      )}

      {safeSeller && (
        <Div className={`dark:bg-zinc-900/60 ${__P.p3}`} border="subtle" rounded="xl" surface="muted">
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
  );
}

interface PreOrderBuyBarPanelProps {
  reserveTarget: number;
  reservedCount: number;
  progressPct: number;
  productId: string;
  price: number | null;
  currency: string;
  depositAmount: number | null;
  depositPercent: number | null;
  isCancellable: boolean;
  tags: string[];
  onReserveNow?: (productId: string) => Promise<void>;
}

function PreOrderBuyBarPanel({
  reserveTarget,
  reservedCount,
  progressPct,
  productId,
  price,
  currency,
  depositAmount,
  depositPercent,
  isCancellable,
  tags,
  onReserveNow,
}: PreOrderBuyBarPanelProps) {
  return (
    <Stack id="pre-order-buy-bar" className={`dark:bg-zinc-900/60 ${__P.p5}`} border="subtle" gap="md" rounded="xl" surface="muted">
      {reserveTarget > 0 && (
        <Stack gap="sm">
          <Row justify="between" align="center">
            <Text size="xs" color="muted">
              {reservedCount} of {reserveTarget} reserved
            </Text>
            <Span size="xs" weight="semibold" className="text-primary-600 dark:text-primary-400">
              {progressPct}%
            </Span>
          </Row>
          <Div className={`h-2 w-full ${__O.hidden} dark:bg-zinc-700`} rounded="full" surface="subtle">
            <Div
              className="h-full bg-primary transition-all" rounded="full"
              // audit-inline-style-ok: computed percentage
              style={{ width: `${progressPct}%` }}
            />
          </Div>
        </Stack>
      )}

      {onReserveNow ? (
        <PreOrderActionsClient
          productId={productId}
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
              <Text size="2xl" weight="bold" color="primary">
                {formatCurrency(price, currency)}
              </Text>
              {depositAmount !== null && (
                <Text className="mt-0.5" color="muted" size="xs">
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
              <Text size="xs" align="center" color="muted">
                ✓ Free cancellation before production
              </Text>
            )}
          </Stack>
          {tags.length > 0 && (
            <Div className="border-t border-zinc-200 dark:border-zinc-700" padding="t-md">
              <Row wrap gap="xs">
                {tags.map((tag) => (
                  <Span key={tag} size="xs" className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1" color="muted">
                    {tag}
                  </Span>
                ))}
              </Row>
            </Div>
          )}
          <Div className="border-t border-zinc-200 dark:border-zinc-700" padding="t-md">
            <Row wrap gap="sm" justify="center" className="text-center">
              {[
                { icon: "🔒", label: "Secure\nPayment" },
                { icon: "📅", label: "Guaranteed\nDelivery" },
                { icon: "↩", label: "Free\nCancellation" },
              ].map(({ icon, label }) => (
                <Stack key={label} className="text-xs text-zinc-500 dark:text-zinc-400 min-w-[60px]" align="center" gap="xs">
                  <Span size="base">{icon}</Span>
                  <Span className="whitespace-pre-line leading-tight">{label}</Span>
                </Stack>
              ))}
            </Row>
          </Div>
        </>
      )}
    </Stack>
  );
}

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
              <Heading level={1} size="2xl" weight="semibold" color="primary">
                Pre-Order Not Found
              </Heading>
              <Text color="muted">
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

  const maxPerUser =
    typeof p.maxPerUser === "number" && p.maxPerUser > 0
      ? (p.maxPerUser as number)
      : null;
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
  const category = Array.isArray(p.categorySlugs) && p.categorySlugs.length > 0 ? p.categorySlugs[0] : (typeof p.category === "string" ? (p.category as string) : null);
  const categoryName = Array.isArray(p.categoryNames) && p.categoryNames.length > 0 ? p.categoryNames[0] : (typeof p.categoryName === "string" ? (p.categoryName as string) : null);
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
      <Container size="xl" className="px-4" padding="y-lg">
        {/* Breadcrumb + share */}
        <Row className="mb-4" align="center" justify="between" gap="sm" wrap>
          <Nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
            <Link href={String(ROUTES.HOME)} className={CLS_BREADCRUMB_LINK}>Home</Link>
            <Span aria-hidden>/</Span>
            <Link href={String(ROUTES.PUBLIC.PRE_ORDERS)} className={CLS_BREADCRUMB_LINK}>Pre-Orders</Link>
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
          renderGallery={() => (
            <ProductGalleryClient images={images} productName={title} />
          )}
          renderInfo={() => (
            <PreOrderInfoSection
              title={title}
              productionStatus={productionStatus}
              maxPerUser={maxPerUser}
              deliveryDate={deliveryDate}
              featured={featured}
              freeShipping={freeShipping}
              condition={condition}
              isCancellable={isCancellable}
              category={category}
              categoryName={categoryName}
              brand={brand}
              brandSlug={brandSlug}
              productFeatures={productFeatures}
              features={features}
              descriptionHtml={descriptionHtml}
              safeSeller={safeSeller}
              storeHref={storeHref}
            />
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
                  <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden">
                    {specs.map((s, i) => (
                      <Div
                        key={i}
                        className="flex gap-4 px-4 even:bg-zinc-50 dark:even:bg-zinc-800/50" surface="default" padding="y-sm"
                      >
                        <Dt className="w-36 flex-shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                          {s.name}
                        </Dt>
                        <Dd className="flex-1 text-zinc-600 dark:text-zinc-400">
                          {s.value}{s.unit ? ` ${s.unit}` : ""}
                        </Dd>
                      </Div>
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
            <PreOrderBuyBarPanel
              reserveTarget={reserveTarget}
              reservedCount={reservedCount}
              progressPct={progressPct}
              productId={String(product.id)}
              price={price}
              currency={currency}
              depositAmount={depositAmount}
              depositPercent={depositPercent}
              isCancellable={isCancellable}
              tags={tags}
              onReserveNow={onReserveNow}
            />
          )}
        />

        {/* Mobile actions registered via useBottomActions() */}
        <PreOrderBottomActions price={price} currency={currency} />
      </Container>
    </Main>
  );
}
