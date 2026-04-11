"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AdminSiteViewProps {
  labels?: { title?: string };
  renderHeader?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderForm?: () => React.ReactNode;
  className?: string;
}

export function AdminSiteView({
  labels = {},
  renderHeader,
  renderTabs,
  renderForm,
  className = "",
}: AdminSiteViewProps) {
  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : labels.title ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      ) : null}
      {renderTabs?.()}
      {renderForm?.()}
    </Div>
  );
}
