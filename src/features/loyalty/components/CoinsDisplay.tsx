"use client";

import React from "react";
import { Div, Span, Text } from "@mohasinac/ui";

interface CoinsBadgeProps {
  coins: number;
  className?: string;
}

export function CoinsBadge({ coins, className }: CoinsBadgeProps) {
  return (
    <Span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ${className ?? ""}`}
    >
      <Span aria-hidden="true">🪙</Span>
      {coins.toLocaleString()}
    </Span>
  );
}

interface CoinsDisplayProps {
  coins: number;
  label?: string;
}

export function CoinsDisplay({ coins, label = "HC Coins" }: CoinsDisplayProps) {
  return (
    <Div className="flex flex-col items-center gap-1">
      <Text className="text-3xl font-bold text-amber-600">
        {coins.toLocaleString()}
      </Text>
      <Text className="text-sm text-gray-500">{label}</Text>
    </Div>
  );
}
