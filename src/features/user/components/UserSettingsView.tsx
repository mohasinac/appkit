"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserSettingsViewProps {
  labels?: { title?: string };
  renderTabs?: (activeTab: string, onChange: (t: string) => void) => React.ReactNode;
  renderContent: (tab: string, isLoading: boolean) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function UserSettingsView({
  labels = {},
  renderTabs,
  renderContent,
  isLoading = false,
  className = "",
}: UserSettingsViewProps) {
  const [tab, setTab] = React.useState("account");
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderTabs?.(tab, setTab)}
      {renderContent(tab, isLoading)}
    </Div>
  );
}
