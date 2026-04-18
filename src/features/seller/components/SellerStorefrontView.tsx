import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerStorefrontViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; subtitle?: string };
  renderBanner?: () => React.ReactNode;
  renderProducts?: () => React.ReactNode;
  renderReviews?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
}

export function SellerStorefrontView({
  labels = {},
  renderBanner,
  renderProducts,
  renderReviews,
  renderFooter,
  ...rest
}: SellerStorefrontViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[
        renderBanner?.(),
        renderProducts?.(),
        renderReviews?.(),
        renderFooter?.(),
      ]}
    />
  );
}
