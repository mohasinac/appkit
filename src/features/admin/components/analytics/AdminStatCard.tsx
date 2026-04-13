"use client";

import React from "react";
import { Div, Text, Heading } from "../../../../ui";

export interface AdminStatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode | string;
  className?: string;
}

export function AdminStatCard({
  label,
  value,
  icon,
  className = "",
}: AdminStatCardProps) {
  return (
    <Div
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 ${className}`}
    >
      <Div className="flex items-start justify-between">
        <Div>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            {label}
          </Text>
          <Heading level={3} className="text-2xl font-bold">
            {value}
          </Heading>
        </Div>
        {icon && <Div className="text-2xl">{icon}</Div>}
      </Div>
    </Div>
  );
}
