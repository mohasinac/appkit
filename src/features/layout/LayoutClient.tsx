"use client";

import React from "react";

export type LayoutProvider = React.ComponentType<{ children: React.ReactNode }>;

export interface LayoutClientProps {
  children: React.ReactNode;
  providers?: LayoutProvider[];
  renderShell?: (children: React.ReactNode) => React.ReactNode;
}

export function LayoutClient({
  children,
  providers = [],
  renderShell,
}: LayoutClientProps) {
  const withProviders = providers.reduceRight<React.ReactNode>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children,
  );

  return <>{renderShell ? renderShell(withProviders) : withProviders}</>;
}

export default LayoutClient;
