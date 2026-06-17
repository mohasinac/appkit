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
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { ShareButton } from "../../products/components/ShareButton";
import { StoreScopedSearch } from "./StoreScopedSearch";
import type { StoreDetail } from "../types";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_AVATAR = "-mt-8 h-16 w-16 rounded-xl border-2 border-white dark:border-slate-800 bg-warning-surface dark:bg-warning-surface flex items-center justify-center text-warning dark:text-warning font-bold text-2xl shadow-sm";
const CLS_STARS = "inline-flex items-center gap-1 text-warning";
const CLS_FOLLOW_BTN = "rounded-lg border border-warning px-4 py-2 text-sm font-medium text-warning hover:bg-warning-surface transition-colors";
const CLS_WARN_BANNER = "mt-3 rounded-lg bg-warning-surface dark:bg-warning-surface border border-warning dark:border-warning px-3 py-2 text-sm text-warning dark:text-warning";

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
}

export function StoreHeader({
  store,
  labels = {},
  onFollow,
  className = "",
}: StoreHeaderProps) {
  return (
    <Section surface="default" border="bottom" className={className}>
      {store.storeBannerURL && (
          // audit-variant-ok: banner Div — h-40/md:h-56 responsive height ladder + bg-gray-100 placeholder while banner loads
          <Div className={`h-40 md:h-56 ${__O.hidden} bg-gray-100 dark:bg-slate-800`}>
          <Div
            role="img"
            aria-label={`${store.storeName} banner`}
            className="h-full w-full bg-center bg-cover"
            // audit-inline-style-ok: dynamic image URL
            style={{ backgroundImage: `url(${store.storeBannerURL})` }}
          />
        </Div>
      )}
      <Div paddingX="x-page" className="max-w-7xl mx-auto" padding="y-md">
        <Row align="end" gap="md">
          {store.storeLogoURL ? (
            <Div
              role="img"
              aria-label={store.storeName}
              className="-mt-8 h-16 w-16 border-2 border-white bg-center bg-cover" rounded="xl" shadow="sm"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${store.storeLogoURL})` }}
            />
          ) : (
            <Div className={CLS_AVATAR}>
              {store.storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Div className="flex-1 min-w-0">
            <Row className="mb-0.5" align="center" gap="sm" wrap>
              <Heading
                level={1}
                className="text-gray-900" size="xl" weight="bold"
              >
                {store.storeName}
              </Heading>
              {store.averageRating != null && store.averageRating > 0 && (
                <Span size="sm" weight="medium" className={CLS_STARS}>
                  ★ {store.averageRating.toFixed(1)}
                </Span>
              )}
            </Row>
            <Row textSize="xs" className="text-gray-500 mb-0.5" gap="3">
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
