import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface UserAddressesViewLabels {
  title?: string;
  addAddress?: string;
}

export interface UserAddressesViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserAddressesViewLabels;
  renderToolbar?: () => React.ReactNode;
  renderAddresses?: () => React.ReactNode;
  renderDeleteModal?: () => React.ReactNode;
}

export function UserAddressesView({
  labels = {},
  renderToolbar,
  renderAddresses,
  renderDeleteModal,
  ...rest
}: UserAddressesViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[renderToolbar?.(), renderAddresses?.()]}
      overlays={renderDeleteModal?.()}
    />
  );
}
