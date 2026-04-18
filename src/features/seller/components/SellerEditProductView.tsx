import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerEditProductViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; submitButton?: string };
  renderForm: (isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
}

export function SellerEditProductView({
  labels = {},
  renderForm,
  isLoading = false,
  ...rest
}: SellerEditProductViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[renderForm(isLoading)]}
    />
  );
}
