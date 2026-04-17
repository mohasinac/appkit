"use client";

import React from "react";
import { Div, Heading, Text } from "../../../ui";
import type { StoreDetail } from "../types";
import { getDefaultLocale } from "../../../core/baseline-resolver";

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
    <Div className={`space-y-6 py-6 ${className}`}>
      {/* Bio */}
      {store.bio && (
        <Div>
          <Heading level={2} className="text-lg font-semibold mb-2">
            {labels.aboutTitle ?? "About"}
          </Heading>
          <Text className="text-neutral-600 whitespace-pre-line">
            {store.bio}
          </Text>
        </Div>
      )}

      {/* Stats */}
      {renderStats?.(store)}

      {/* Details list */}
      <Div className="space-y-3 text-sm">
        {store.location && (
          <Div className="flex gap-2">
            <Text className="font-medium text-neutral-700 min-w-[120px]">
              {labels.locationLabel ?? "Location"}
            </Text>
            <Text className="text-neutral-600">{store.location}</Text>
          </Div>
        )}
        {joinDate && (
          <Div className="flex gap-2">
            <Text className="font-medium text-neutral-700 min-w-[120px]">
              {labels.memberSinceLabel ?? "Member since"}
            </Text>
            <Text className="text-neutral-600">{joinDate}</Text>
          </Div>
        )}
        {store.website && (
          <Div className="flex gap-2">
            <Text className="font-medium text-neutral-700 min-w-[120px]">
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
      </Div>

      {/* Social links */}
      {store.socialLinks && renderSocialLinks?.(store.socialLinks)}

      {/* Return policy */}
      {store.returnPolicy && (
        <Div>
          <Heading level={3} className="text-base font-semibold mb-2">
            {labels.returnPolicyLabel ?? "Return Policy"}
          </Heading>
          <Text className="text-neutral-600 whitespace-pre-line">
            {store.returnPolicy}
          </Text>
        </Div>
      )}

      {/* Shipping policy */}
      {store.shippingPolicy && (
        <Div>
          <Heading level={3} className="text-base font-semibold mb-2">
            {labels.shippingPolicyLabel ?? "Shipping Policy"}
          </Heading>
          <Text className="text-neutral-600 whitespace-pre-line">
            {store.shippingPolicy}
          </Text>
        </Div>
      )}

      {/* Vacation mode notice */}
      {store.isVacationMode && (
        <Div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <Text className="text-yellow-800 font-medium">
            {labels.vacationModeLabel ?? "This store is on vacation mode"}
          </Text>
          {store.vacationMessage && (
            <Text className="text-yellow-700 mt-1">
              {store.vacationMessage}
            </Text>
          )}
        </Div>
      )}
    </Div>
  );
}
