import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerShippingViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; saveButton?: string };
  renderZones?: (isLoading: boolean) => React.ReactNode;
  renderForm?: () => React.ReactNode;
  isLoading?: boolean;
}

export function SellerShippingView({
  labels = {},
  renderZones,
  renderForm,
  isLoading = false,
  ...rest
}: SellerShippingViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[renderZones?.(isLoading), renderForm?.()]}
    />
  );
}
