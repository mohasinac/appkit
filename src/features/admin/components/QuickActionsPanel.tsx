"use client";

import React from "react";
import { Div, Heading } from "../../../ui";

export interface QuickActionItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface QuickActionsPanelProps {
  title?: string;
  actions: QuickActionItem[];
  renderAction?: (action: QuickActionItem) => React.ReactNode;
  className?: string;
}

export function QuickActionsPanel({
  title,
  actions,
  renderAction,
  className = "",
}: QuickActionsPanelProps) {
  return (
    <Div className={className}>
      {title && (
        <Heading level={3} className="mb-4">
          {title}
        </Heading>
      )}
      <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Div key={action.id}>
            {renderAction ? (
              renderAction(action)
            ) : action.onClick ? (
              <button
                type="button"
                onClick={action.onClick}
                className="w-full inline-flex items-center justify-start gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                {action.icon}
                {action.label}
              </button>
            ) : (
              <a
                href={action.href ?? "#"}
                className="w-full inline-flex items-center justify-start gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                {action.icon}
                {action.label}
              </a>
            )}
          </Div>
        ))}
      </Div>
    </Div>
  );
}
