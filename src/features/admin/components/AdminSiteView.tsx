import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface AdminSiteViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderTabs?: () => React.ReactNode;
  renderForm?: () => React.ReactNode;
}

export function AdminSiteView({
  labels = {},
  renderTabs,
  renderForm,
  ...rest
}: AdminSiteViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[renderTabs?.(), renderForm?.()]}
    />
  );
}
