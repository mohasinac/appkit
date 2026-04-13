"use client";

import type { ReactNode } from "react";
import { Div } from "../../../ui";

export interface UserOrderTrackViewLabels {
  title?: string;
  backLabel?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
}

export interface UserOrderTrackViewProps {
  labels?: UserOrderTrackViewLabels;
  renderBack?: () => ReactNode;
  renderTracking?: () => ReactNode;
  renderNotFound?: () => ReactNode;
  isNotFound?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function UserOrderTrackView({
  renderBack,
  renderTracking,
  renderNotFound,
  isNotFound = false,
  className = "",
}: UserOrderTrackViewProps) {
  return (
    <Div className={className}>
      {renderBack?.()}
      {isNotFound ? renderNotFound?.() : renderTracking?.()}
    </Div>
  );
}
