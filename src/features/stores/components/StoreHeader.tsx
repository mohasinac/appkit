import {
  Button,
  Div,
  Heading,
  RichText,
  Section,
  Span,
  Text,
} from "../../../ui";
import { proseMirrorToHtml } from "../../../utils/string.formatter";
import type { StoreDetail } from "../types";

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
    <Section className={`bg-white border-b border-gray-200 ${className}`}>
      {store.storeBannerURL && (
        <Div className="h-40 md:h-56 overflow-hidden bg-gray-100">
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
              className="-mt-8 h-16 w-16 rounded-xl border-2 border-white bg-center bg-cover shadow-sm"
              style={{ backgroundImage: `url(${store.storeLogoURL})` }}
            />
          ) : (
            <Div className="-mt-8 h-16 w-16 rounded-xl border-2 border-white bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-2xl shadow-sm">
              {store.storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Div className="flex-1 min-w-0">
            <Heading
              level={1}
              className="text-xl font-bold text-gray-900 truncate"
            >
              {store.storeName}
            </Heading>
            {store.storeDescription && (
              <RichText
                html={proseMirrorToHtml(store.storeDescription)}
                copyableCode
                className="text-sm text-gray-500 mt-0.5"
              />
            )}
          </Div>
          {onFollow && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFollow(store.storeSlug)}
              className="shrink-0 rounded-lg border border-orange-500 px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors"
            >
              {labels.follow ?? "Follow"}
            </Button>
          )}
        </Div>

        {store.isVacationMode && (
          <Text className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-700">
            {store.vacationMessage ??
              labels.vacationMode ??
              "Store is on vacation mode"}
          </Text>
        )}

        <Div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          {store.totalProducts != null && (
            <Span>
              {store.totalProducts} {labels.products ?? "products"}
            </Span>
          )}
          {store.itemsSold != null && (
            <Span>
              {store.itemsSold} {labels.sold ?? "sold"}
            </Span>
          )}
          {store.averageRating != null && (
            <Span>
              ★ {store.averageRating.toFixed(1)} ({store.totalReviews}{" "}
              {labels.reviews ?? "reviews"})
            </Span>
          )}
        </Div>
      </Div>
    </Section>
  );
}
