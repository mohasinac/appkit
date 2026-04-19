import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface OrderDetailViewLabels {
  title?: string;
  backLabel?: string;
}

export interface OrderDetailViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: OrderDetailViewLabels;
  renderBack?: () => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderItems?: () => React.ReactNode;
  renderAddress?: () => React.ReactNode;
  renderPayment?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  isLoading?: boolean;
  isNotFound?: boolean;
}

export function OrderDetailView({
  labels = {},
  renderBack,
  renderHeader,
  renderItems,
  renderAddress,
  renderPayment,
  renderActions,
  ...rest
}: OrderDetailViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[
        renderBack?.(),
        renderHeader?.(),
        renderActions?.(),
        renderItems?.(),
        renderAddress?.(),
        renderPayment?.(),
      ]}
    />
  );
}
