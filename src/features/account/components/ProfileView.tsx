"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface ProfileViewLabels {
  title?: string;
  editProfile?: string;
}

export interface ProfileViewProps {
  labels?: ProfileViewLabels;
  renderHeader?: () => React.ReactNode;
  renderStats?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function ProfileView({
  labels = {},
  renderHeader,
  renderStats,
  renderActions,
  isLoading = false,
  className = "",
}: ProfileViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-4">
          {labels.title}
        </Heading>
      )}
      {renderActions?.()}
      {renderHeader?.()}
      {renderStats?.()}
    </Div>
  );
}
