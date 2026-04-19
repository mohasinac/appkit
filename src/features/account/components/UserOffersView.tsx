import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface UserOffersViewLabels {
  title?: string;
}

export interface UserOffersViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserOffersViewLabels;
  renderTable?: () => React.ReactNode;
}

export function UserOffersView({
  labels = {},
  renderTable,
  ...rest
}: UserOffersViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[renderTable?.()]}
    />
  );
}
