import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface CheckoutSuccessViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string; continueButton?: string };
  renderHero?: () => React.ReactNode;
  renderOrderCard?: () => React.ReactNode;
  renderActions?: (onContinue: () => void) => React.ReactNode;
}

export function CheckoutSuccessView({
  labels = {},
  renderHero,
  renderOrderCard,
  renderActions,
  ...rest
}: CheckoutSuccessViewProps) {
  return (
    <StackedViewShell
      portal="public"
      {...rest}
      title={labels.title}
      sections={[
        renderHero?.(),
        renderOrderCard?.(),
        renderActions?.(() => {}),
      ]}
    />
  );
}
