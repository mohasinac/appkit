import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerAddressesViewProps extends Omit<
  StackedViewShellProps,
  "sections" | "renderHeader"
> {
  labels?: { title?: string; addButton?: string };
  renderHeader?: (onAdd: () => void) => React.ReactNode;
  renderAddressList?: (isLoading: boolean) => React.ReactNode;
  renderModal?: () => React.ReactNode;
  isLoading?: boolean;
}

export function SellerAddressesView({
  labels = {},
  renderHeader,
  renderAddressList,
  renderModal,
  isLoading = false,
  ...rest
}: SellerAddressesViewProps) {
  return (
    <StackedViewShell
      portal="seller"
      {...rest}
      title={labels.title}
      renderHeader={renderHeader ? () => renderHeader(() => {}) : undefined}
      sections={[renderAddressList?.(isLoading)]}
      overlays={renderModal?.()}
    />
  );
}
