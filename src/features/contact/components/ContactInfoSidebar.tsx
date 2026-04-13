"use client";

import React from "react";
import { Aside, Div, Heading, Span, Text } from "../../../ui";

export interface ContactInfoItem {
  icon: string;
  label: string;
  value: string;
  href?: string;
}

export interface ContactInfoSidebarProps {
  infoItems: ContactInfoItem[];
  labels?: {
    title?: string;
    businessHoursLabel?: string;
    businessHoursValue?: string;
    responseTimeLabel?: string;
    responseTimeValue?: string;
  };
  /** Render extra action links (e.g. WhatsApp, Chat) */
  renderActions?: () => React.ReactNode;
}

export function ContactInfoSidebar({
  infoItems,
  labels = {},
  renderActions,
}: ContactInfoSidebarProps) {
  return (
    <Aside className="space-y-6">
      <Div>
        <Heading level={3} className="mb-4">
          {labels.title ?? "Contact Information"}
        </Heading>
        <Div className="space-y-4">
          {infoItems.map((item) => (
            <Div key={item.label} className="flex items-start gap-3">
              <Span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</Span>
              <Div>
                <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-0.5">
                  {item.label}
                </Text>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-sm text-primary hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <Text className="text-sm">{item.value}</Text>
                )}
              </Div>
            </Div>
          ))}
        </Div>
      </Div>

      {(labels.businessHoursLabel || labels.responseTimeLabel) && (
        <Div className="rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/60 p-4 space-y-2">
          {labels.businessHoursLabel && labels.businessHoursValue && (
            <Div>
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {labels.businessHoursLabel}
              </Text>
              <Text className="text-sm mt-0.5">{labels.businessHoursValue}</Text>
            </Div>
          )}
          {labels.responseTimeLabel && labels.responseTimeValue && (
            <Div>
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {labels.responseTimeLabel}
              </Text>
              <Text className="text-sm mt-0.5">{labels.responseTimeValue}</Text>
            </Div>
          )}
        </Div>
      )}

      {renderActions?.()}
    </Aside>
  );
}
