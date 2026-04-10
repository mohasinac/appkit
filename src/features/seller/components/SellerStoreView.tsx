"use client";

import React from "react";
import { Div } from "@mohasinac/ui";

export interface SellerStoreViewProps {
  renderHeader?: () => React.ReactNode;
  renderNavTabs?: (activeTab: string, onChange: (t: string) => void) => React.ReactNode;
  renderContent: (activeTab: string) => React.ReactNode;
  className?: string;
}

export function SellerStoreView({
  renderHeader,
  renderNavTabs,
  renderContent,
  className = "",
}: SellerStoreViewProps) {
  const [tab, setTab] = React.useState("products");
  return (
    <Div className={className}>
      {renderHeader?.()}
      {renderNavTabs?.(tab, setTab)}
      {renderContent(tab)}
    </Div>
  );
}
