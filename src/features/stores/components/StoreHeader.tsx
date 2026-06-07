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

const CLS_AVATAR = "-mt-8 h-16 w-16 rounded-xl border-2 border-white dark:border-slate-800 bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-2xl shadow-sm";
const CLS_STARS = "inline-flex items-center gap-1 text-amber-500";
const CLS_FOLLOW_BTN = "rounded-lg border border-orange-500 px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors";
const CLS_WARN_BANNER = "mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300";

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
    <Section surface="default" className={`border-b border-gray-200 dark:border-slate-700 ${className}`}>
      {store.storeBannerURL && (
          <Div className={`h-40 md:h-56 ${__O.hidden} bg-gray-100 dark:bg-slate-800`}>
          <Div
            role="img"
            aria-label={`${store.storeName} banner`}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${store.storeBannerURL})` }}
          />
        </Div>
      )}
      <Div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Div className="flex items-end gap-4">
          {store.storeLogoURL ? (
            <Div
              role="img"
              aria-label={store.storeName}
              className="-mt-8 h-16 w-16 rounded-xl border-2 border-white dark:border-slate-800 bg-center bg-cover shadow-sm"
              style={{ backgroundImage: `url(${store.storeLogoURL})` }}
            />
          ) : (
            <Div className={CLS_AVATAR}>
              {store.storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Div className="flex-1 min-w-0">
            <Div className="flex flex-wrap items-center gap-2 mb-0.5">
              <Heading
                level={1}
                className="text-xl font-bold text-gray-900 dark:text-zinc-100"
              >
                {store.storeName}
              </Heading>
              {store.averageRating != null && store.averageRating > 0 && (
                <Span size="sm" weight="medium" className={CLS_STARS}>
                  ★ {store.averageRating.toFixed(1)}
                </Span>
              )}
            </Div>
            <Row className="gap-3 text-xs text-gray-500 dark:text-zinc-400 mb-0.5">
              {(store as any).category && <Span className="capitalize">{(store as any).category}</Span>}
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
        </Div>

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
