import React from "react";
import { Div, Text } from "../../../ui";

interface SellerStatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: { value: number; positive: boolean };
  icon?: React.ReactNode;
  className?: string;
}

export function SellerStatCard({
  label,
  value,
  subLabel,
  trend,
  icon,
  className = "",
}: SellerStatCardProps) {
  return (
    <Div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <Div className="flex items-start justify-between gap-2">
        <Div className="flex-1 min-w-0">
          <Text className="text-sm text-gray-500 mb-1 truncate">{label}</Text>
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
          {subLabel && (
            <Text className="text-xs text-gray-400 mt-0.5">{subLabel}</Text>
          )}
          {trend && (
            <Text
              className={`text-xs mt-1 font-medium ${trend.positive ? "text-green-600" : "text-red-500"}`}
            >
              {trend.positive ? "▲" : "▼"} {Math.abs(trend.value)}%
            </Text>
          )}
        </Div>
        {icon && <Div className="shrink-0 text-gray-400 text-2xl">{icon}</Div>}
      </Div>
    </Div>
  );
}
