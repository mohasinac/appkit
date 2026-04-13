"use client";

import React from "react";
import { Div } from "../../../ui";

export interface ProfileViewProps {
  renderHeader?: () => React.ReactNode;
  renderStats?: () => React.ReactNode;
  renderInfoForm?: (isLoading: boolean) => React.ReactNode;
  renderSidebar?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function ProfileView({
  renderHeader,
  renderStats,
  renderInfoForm,
  renderSidebar,
  isLoading = false,
  className = "",
}: ProfileViewProps) {
  return (
    <Div className={className}>
      {renderHeader?.()}
      {renderStats?.()}
      <Div className="flex gap-6">
        <Div className="flex-1">{renderInfoForm?.(isLoading)}</Div>
        {renderSidebar && <Div className="w-64">{renderSidebar()}</Div>}
      </Div>
    </Div>
  );
}
