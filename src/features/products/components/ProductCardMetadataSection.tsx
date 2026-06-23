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
      <Heading level={3} className="tracking-wide" color="muted" size="sm" weight="semibold" transform="uppercase">
        Card details
      </Heading>
      <Div textSize="sm" className="grid grid-cols-2 gap-y-1 sm:grid-cols-[140px_1fr]">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <Text color="muted">{label}</Text>
            <Text weight="medium" color="primary">{value}</Text>
          </React.Fragment>
        ))}
      </Div>
    </Stack>
  );
}
