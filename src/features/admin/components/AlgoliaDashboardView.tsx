"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface AlgoliaDashboardViewProps {
  labels?: { title?: string; };
  renderStatus?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  renderLogs?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AlgoliaDashboardView({ labels = {}, renderStatus, renderActions, renderLogs, isLoading = false, className = "" }: AlgoliaDashboardViewProps) {
  return (
    <Div className={className}>
      {labels.title && <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>}
      {renderStatus?.()}
      {renderActions?.()}
      {renderLogs?.()}
    </Div>
  );
}