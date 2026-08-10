import React from "react";
import { Span, Stack, Text } from "../../../ui";
const CLS_COIN_PILL = "inline-flex items-center gap-[var(--appkit-space-1)] rounded-full bg-warning-surface px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-semibold text-warning";
const CLS_COIN_TOTAL = "text-[length:var(--appkit-text-3xl)] font-bold text-warning";

interface CoinsBadgeProps {
  coins: number;
  className?: string;
}

export function CoinsBadge({ coins, className }: CoinsBadgeProps) {
  return (
    <Span
      className={`${CLS_COIN_PILL} ${className ?? ""}`}
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
    <Stack align="center" gap="xs">
      <Text className={CLS_COIN_TOTAL}>
        {coins.toLocaleString()}
      </Text>
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">{label}</Text>
    </Stack>
  );
}
