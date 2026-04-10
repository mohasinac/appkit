"use client";

import React from "react";
import { Div, Heading, Text } from "@mohasinac/ui";

export interface SellerGuideViewProps {
  labels?: { title?: string };
  renderSections?: () => React.ReactNode;
  renderCTA?: () => React.ReactNode;
  className?: string;
}

export function SellerGuideView({
  labels = {},
  renderSections,
  renderCTA,
  className = "",
}: SellerGuideViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderSections?.()}
      {renderCTA?.()}
    </Div>
  );
}
