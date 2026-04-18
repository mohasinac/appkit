import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerCreateProductViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; submitButton?: string };
  renderForm: (isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
}

export function SellerCreateProductView({
  labels = {},
  renderForm,
  isLoading = false,
  ...rest
}: SellerCreateProductViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[renderForm(isLoading)]}
    />
  );
}
