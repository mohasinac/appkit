import {
  Button,
  Div,
  Heading,
  RichText,
  Row,
  Section,
  Span,
  Text,
} from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { ShareButton } from "../../products/components/ShareButton";
import { StoreScopedSearch } from "./StoreScopedSearch";
import { SellerTrustBadge } from "../../scams/components/SellerTrustBadge";
import type { SellerTrustResult } from "../../scams/actions/scam-actions";
import type { StoreDetail } from "../types";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_AVATAR = "-mt-8 h-16 w-16 rounded-xl border-2 border-[var(--appkit-color-border-subtle)] bg-warning-surface dark:bg-warning-surface flex items-center justify-center text-warning dark:text-warning font-bold text-[length:var(--appkit-text-2xl)] shadow-sm";
const CLS_STARS = "inline-flex items-center gap-[var(--appkit-space-1)] text-warning";
const CLS_FOLLOW_BTN = "rounded-lg border border-warning px-[var(--appkit-space-4)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-medium text-warning hover:bg-warning-surface transition-colors";
const CLS_WARN_BANNER = "mt-3 rounded-lg bg-warning-surface dark:bg-warning-surface border border-warning dark:border-warning px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-warning dark:text-warning";

interface StoreHeaderProps {
  store: StoreDetail;
  labels?: {
    products?: string;
    reviews?: string;
    sold?: string;
    vacationMode?: string;
    follow?: string;
  };
  onFollow?: (storeSlug: string) => void;
  className?: string;
  /** P-12 — omitted (undefined) when the scam registry feature is off; no badge renders. */
  trust?: SellerTrustResult;
}

export function StoreHeader({
  store,
  labels = {},
  onFollow,
  className = "",
  trust,
}: StoreHeaderProps) {
  return (
    <Section surface="default" border="bottom" className={className}>
      {store.storeBannerURL && (
          <Div className={`relative h-40 md:h-56 ${__O.hidden} bg-[var(--appkit-color-surface)] bg-[var(--appkit-color-surface-elevated)]`}>
          <MediaImage src={store.storeBannerURL} alt={`${store.storeName} banner`} size="banner" />
        </Div>
      )}
      <Div paddingX="x-page" className="max-w-7xl mx-auto" padding="y-md">
        <Row align="end" gap="md">
          {store.storeLogoURL ? (
            <Div className="relative -mt-8 h-16 w-16 border-2 border-white" rounded="xl" shadow="sm" overflow="hidden">
              <MediaImage src={store.storeLogoURL} alt={store.storeName} size="avatar" />
            </Div>
          ) : (
            <Div className={CLS_AVATAR}>
              {store.storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Div className="flex-1 min-w-0">
            <Row className="mb-0.5" align="center" gap="sm" wrap>
              <Heading
                level={1}
                className="text-[var(--appkit-color-text)]" size="xl" weight="bold"
              >
                {store.storeName}
              </Heading>
              {store.averageRating != null && store.averageRating > 0 && (
                <Span size="sm" weight="medium" className={CLS_STARS}>
                  ★ {store.averageRating.toFixed(1)}
                </Span>
              )}
              {trust && <SellerTrustBadge trust={trust} />}
            </Row>
            <Row textSize="xs" className="text-[var(--appkit-color-text-muted)] mb-0.5" gap="3">
              {(store as any).category && <Span transform="capitalize">{(store as any).category}</Span>}
              {store.totalProducts != null && store.totalProducts > 0 && (
                <Span>{store.totalProducts} {labels.products ?? "products"}</Span>
              )}
              {store.totalReviews != null && store.totalReviews > 0 && (
                <Span>{store.totalReviews} {labels.reviews ?? "reviews"}</Span>
              )}
              {store.itemsSold != null && store.itemsSold > 0 && (
                <Span>{store.itemsSold} {labels.sold ?? "sold"}</Span>
              )}
            </Row>
            {store.storeDescription && (
              <RichText
                html={normalizeRichTextHtml(store.storeDescription)}
                copyableCode
                className="mt-0.5"
              />
            )}
          </Div>
          <Row gap="sm" align="center" className="shrink-0">
            <ShareButton title={store.storeName} />
            {onFollow && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onFollow(store.storeSlug)}
                className={CLS_FOLLOW_BTN}
              >
                {labels.follow ?? "Follow"}
              </Button>
            )}
          </Row>
        </Row>

        {store.isVacationMode && (
          <Text className={CLS_WARN_BANNER}>
            {store.vacationMessage ??
              labels.vacationMode ??
              "Store is on vacation mode"}
          </Text>
        )}

        {/* W1-19 — store-scoped search; routes to /products?storeId=…&q=… */}
        <Div className="mt-3">
          <StoreScopedSearch
            storeId={store.storeSlug}
            storeName={store.storeName}
          />
        </Div>

      </Div>
    </Section>
  );
}
