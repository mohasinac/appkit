import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface AdminFeatureFlagsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderFlags?: () => React.ReactNode;
}

export function AdminFeatureFlagsView({
  labels = {},
  renderFlags,
  ...rest
}: AdminFeatureFlagsViewProps) {
  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title}
      sections={[renderFlags?.()]}
    />
  );
}
