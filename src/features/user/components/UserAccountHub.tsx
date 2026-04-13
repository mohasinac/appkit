"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface UserAccountHubProps {
  labels?: { title?: string };
  renderCards?: () => React.ReactNode;
  renderSidebar?: () => React.ReactNode;
  className?: string;
}

export function UserAccountHub({
  labels = {},
  renderCards,
  renderSidebar,
  className = "",
}: UserAccountHubProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      <Div className="flex gap-6">
        <Div className="flex-1">{renderCards?.()}</Div>
        {renderSidebar && <Div className="w-64">{renderSidebar()}</Div>}
      </Div>
    </Div>
  );
}
