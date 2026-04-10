"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface DemoSeedViewProps {
  labels?: { title?: string; };
  renderActions?: (isLoading: boolean) => React.ReactNode;
  renderLog?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function DemoSeedView({ labels = {}, renderActions, renderLog, isLoading = false, className = "" }: DemoSeedViewProps) {
  return (
    <Div className={className}>
      {labels.title && <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>}
      {renderActions?.(isLoading)}
      {renderLog?.()}
    </Div>
  );
}