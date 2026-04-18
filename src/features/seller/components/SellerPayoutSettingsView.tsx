import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerPayoutSettingsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; saveButton?: string };
  renderForm?: (isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
}

export function SellerPayoutSettingsView({
  labels = {},
  renderForm,
  isLoading = false,
  ...rest
}: SellerPayoutSettingsViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[renderForm?.(isLoading)]}
    />
  );
}
