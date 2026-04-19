import type { ReactNode } from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface UserOrderTrackViewLabels {
  title?: string;
  backLabel?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
}

export interface UserOrderTrackViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserOrderTrackViewLabels;
  renderBack?: () => ReactNode;
  renderTracking?: () => ReactNode;
  renderNotFound?: () => ReactNode;
  isNotFound?: boolean;
}

export function UserOrderTrackView({
  renderBack,
  renderTracking,
  renderNotFound,
  isNotFound = false,
  ...rest
}: UserOrderTrackViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      sections={[
        renderBack?.(),
        isNotFound ? renderNotFound?.() : renderTracking?.(),
      ]}
    />
  );
}
