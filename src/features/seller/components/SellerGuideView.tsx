import type { ReactNode } from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface SellerGuideViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  sections?: ReactNode;
  cta?: ReactNode;
  renderSections?: () => ReactNode;
  renderCTA?: () => ReactNode;
}

export function SellerGuideView({
  labels = {},
  sections,
  cta,
  renderSections,
  renderCTA,
  ...rest
}: SellerGuideViewProps) {
  return (
    <StackedViewShell
      {...rest}
      title={labels.title}
      sections={[sections ?? renderSections?.(), cta ?? renderCTA?.()]}
    />
  );
}
