"use client";
import React from "react";
import { Div, Heading, Stack, Text } from "../../../ui";
import type { ProductCardMetadata } from "../schemas/firestore";

export interface ProductCardMetadataSectionProps {
  card: ProductCardMetadata;
}

/**
 * `ProductCardMetadataSection` — W1-34 — renders single-card aftermarket
 * metadata (set name / year / card number / rarity / language). Designed to
 * be embedded inside the "Specifications" tab content; rendered as a key/value
 * table for predictable line-up on PDPs.
 */
export function ProductCardMetadataSection({ card }: ProductCardMetadataSectionProps) {
  const rows: Array<[string, string]> = [];
  rows.push(["Set", card.setName]);
  if (card.setYear) rows.push(["Year", String(card.setYear)]);
  if (card.cardNumber) rows.push(["Card #", card.cardNumber]);
  if (card.rarity) rows.push(["Rarity", card.rarity]);
  if (card.language) rows.push(["Language", card.language.toUpperCase()]);

  if (rows.length === 0) return null;

  return (
    <Stack gap="sm">
      <Heading level={3} className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Card details
      </Heading>
      <Div className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-[140px_1fr]">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <Text color="muted">{label}</Text>
            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{value}</Text>
          </React.Fragment>
        ))}
      </Div>
    </Stack>
  );
}
