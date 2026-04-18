import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface DemoSeedViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderActions?: (isLoading: boolean) => React.ReactNode;
  renderLog?: () => React.ReactNode;
  isLoading?: boolean;
}

export function DemoSeedView({
  labels = {},
  renderActions,
  renderLog,
  isLoading = false,
  ...rest
}: DemoSeedViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[renderActions?.(isLoading), renderLog?.()]}
    />
  );
}
