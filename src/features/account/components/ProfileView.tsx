import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface ProfileViewLabels {
  title?: string;
  editProfile?: string;
}

export interface ProfileViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: ProfileViewLabels;
  renderStats?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
}

export function ProfileView({
  labels = {},
  renderStats,
  renderActions,
  ...rest
}: ProfileViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[renderActions?.(), renderStats?.()]}
    />
  );
}
