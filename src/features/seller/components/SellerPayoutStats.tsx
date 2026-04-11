"use client";

import React from "react";
import { Div } from "@mohasinac/ui";

export interface SellerPayoutStatsProps {
  isLoading?: boolean;
  renderLoading?: () => React.ReactNode;
  renderStats: () => React.ReactNode;
  className?: string;
}

export function SellerPayoutStats({
  isLoading = false,
  renderLoading,
  renderStats,
  className = "",
}: SellerPayoutStatsProps) {
  if (isLoading) {
    return <Div className={className}>{renderLoading?.() ?? null}</Div>;
  }

  return <Div className={className}>{renderStats()}</Div>;
}
