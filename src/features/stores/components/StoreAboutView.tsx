import React from "react";
import { Div, Heading, RichText, Stack, Text } from "../../../ui";
const CLS_LABEL = "font-medium text-neutral-700 min-w-[120px]";
const CLS_WARN_BOX = "bg-warning-surface border border-warning rounded-lg p-4";
const CLS_WARN_TITLE = "text-warning font-medium";
const CLS_WARN_BODY = "text-warning mt-1";
import type { StoreDetail } from "../types";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";

export interface StoreAboutViewProps {
  store: StoreDetail;
  labels?: {
    aboutTitle?: string;
    locationLabel?: string;
    websiteLabel?: string;
    returnPolicyLabel?: string;
    shippingPolicyLabel?: string;
    memberSinceLabel?: string;
    socialLinksLabel?: string;
    vacationModeLabel?: string;
  };
  /** Render-prop for social links */
  renderSocialLinks?: (links: StoreDetail["socialLinks"]) => React.ReactNode;
  /** Render-prop for stats (products sold, reviews, rating) */
  renderStats?: (store: StoreDetail) => React.ReactNode;
  className?: string;
}

export function StoreAboutView({
  store,
  labels = {},
  renderSocialLinks,
  renderStats,
  className = "",
}: StoreAboutViewProps) {
  const joinDate = store.createdAt
    ? new Date(store.createdAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <Div className={`space-y-6 ${className}`} padding="y-lg">
      {/* Bio */}
      {store.bio && (
        <Div>
          <Heading level={2} className="mb-2" size="lg" weight="semibold">
            {labels.aboutTitle ?? "About"}
          </Heading>
          <RichText html={normalizeRichTextHtml(store.bio)} />
        </Div>
      )}

      {/* Stats */}
      {renderStats?.(store)}

      {/* Details list */}
      <Stack className="text-sm" gap="3">
        {store.location && (
          <Div className="flex gap-2">
            <Text className={CLS_LABEL}>
              {labels.locationLabel ?? "Location"}
            </Text>
            <Text className="">{store.location}</Text>
          </Div>
        )}
        {joinDate && (
          <Div className="flex gap-2">
            <Text className={CLS_LABEL}>
              {labels.memberSinceLabel ?? "Member since"}
            </Text>
            <Text className="">{joinDate}</Text>
          </Div>
        )}
        {store.website && (
          <Div className="flex gap-2">
            <Text className={CLS_LABEL}>
              {labels.websiteLabel ?? "Website"}
            </Text>
            <a
              href={store.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {store.website}
            </a>
          </Div>
        )}
      </Stack>

      {/* Social links */}
      {store.socialLinks && renderSocialLinks?.(store.socialLinks)}

      {/* Return policy */}
      {store.returnPolicy && (
        <Div>
          <Heading level={3} className="mb-2" size="base" weight="semibold">
            {labels.returnPolicyLabel ?? "Return Policy"}
          </Heading>
          <RichText html={normalizeRichTextHtml(store.returnPolicy)} />
        </Div>
      )}

      {/* Shipping policy */}
      {store.shippingPolicy && (
        <Div>
          <Heading level={3} className="mb-2" size="base" weight="semibold">
            {labels.shippingPolicyLabel ?? "Shipping Policy"}
          </Heading>
          <RichText html={normalizeRichTextHtml(store.shippingPolicy)} />
        </Div>
      )}

      {/* Vacation mode notice */}
      {store.isVacationMode && (
        <Div className={CLS_WARN_BOX}>
          <Text className={CLS_WARN_TITLE}>
            {labels.vacationModeLabel ?? "This store is on vacation mode"}
          </Text>
          {store.vacationMessage && (
            <Text className={CLS_WARN_BODY}>
              {store.vacationMessage}
            </Text>
          )}
        </Div>
      )}
    </Div>
  );
}
