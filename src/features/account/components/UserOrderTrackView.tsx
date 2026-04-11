"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserOrderTrackViewLabels {
  title?: string;
  backLabel?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
}

export interface UserOrderTrackViewProps {
  labels?: UserOrderTrackViewLabels;
  renderBack?: () => React.ReactNode;
  renderTracking?: () => React.ReactNode;
  renderNotFound?: () => React.ReactNode;
  isNotFound?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function UserOrderTrackView({
  labels = {},
  renderBack,
  renderTracking,
  renderNotFound,
  isNotFound = false,
  isLoading = false,
  className = "",
}: UserOrderTrackViewProps) {
  return (
    <Div className={className}>
      {renderBack?.()}
      {isNotFound ? renderNotFound?.() : renderTracking?.()}
    </Div>
  );
}
