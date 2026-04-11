"use client";

import React from "react";
import { Div, Heading, Text } from "@mohasinac/ui";

export interface SellerStorefrontViewProps {
  labels?: {
    title?: string;
    subtitle?: string;
  };
  renderBanner?: () => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderProducts?: () => React.ReactNode;
  renderReviews?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  className?: string;
}

export function SellerStorefrontView({
  labels = {},
  renderBanner,
  renderHeader,
  renderProducts,
  renderReviews,
  renderFooter,
  className = "",
}: SellerStorefrontViewProps) {
  return (
    <Div className={className}>
      {renderBanner?.()}
      {!renderHeader && (labels.title || labels.subtitle) ? (
        <Div className="mb-6">
          {labels.title ? (
            <Heading level={1} className="text-2xl font-bold">
              {labels.title}
            </Heading>
          ) : null}
          {labels.subtitle ? (
            <Text className="text-sm opacity-80 mt-1">{labels.subtitle}</Text>
          ) : null}
        </Div>
      ) : null}
      {renderHeader?.()}
      {renderProducts?.()}
      {renderReviews?.()}
      {renderFooter?.()}
    </Div>
  );
}
