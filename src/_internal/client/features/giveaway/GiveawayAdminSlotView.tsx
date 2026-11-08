"use client";

import React from "react";
import { Stack, Container } from "../../../../ui/components/Layout";
import { Text, Heading } from "../../../../ui/components/Typography";
import { Badge } from "../../../../ui/components/Badge";
import { Section } from "../../../../ui/components/Semantic";
import { DataTable } from "../../../../ui/DataTable";
import type { DataTableColumn } from "../../../../ui/DataTable";
import type { ClientGiveawaySlot } from "../../../../features/giveaway/types";
import { formatMoney } from "../../../../utils/number.formatter";
import { AdminComposableRegion } from "../../../../features/dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../shared/features/dashboard/recent-entry";

interface AdminGiveawaySlot extends ClientGiveawaySlot {
  price: number;
  weight: number;
}

interface GiveawayAdminSlotViewProps {
  slots: AdminGiveawaySlot[];
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

/**
 * Admin-only view showing slots with price + weight + % chance.
 * Separate from GiveawaySlotGrid (public) which never shows price/weight.
 */
export function GiveawayAdminSlotView({ slots, pageRegionCards = [] }: GiveawayAdminSlotViewProps) {
  const totalWeight = slots.reduce((s, sl) => s + sl.weight, 0);

  const columns: DataTableColumn<AdminGiveawaySlot>[] = [
    {
      key: "slotNumber",
      header: "Slot #",
      render: (s) => <Text size="sm" weight="semibold" family="mono">#{s.slotNumber}</Text>,
    },
    {
      key: "name",
      header: "Name",
      render: (s) => <Text size="sm">{s.name}</Text>,
    },
    {
      key: "price",
      header: "Price (₹)",
      render: (s) => (
        <Text size="sm" family="mono">{formatMoney(s.price)}</Text>
      ),
    },
    {
      key: "weight",
      header: "Weight",
      render: (s) => <Text size="sm" family="mono">{s.weight}</Text>,
    },
    {
      key: "status",
      header: "% Chance",
      render: (s) => {
        const chance = totalWeight > 0 ? ((s.weight / totalWeight) * 100).toFixed(1) : "0.0";
        return <Text size="sm" family="mono">{chance}%</Text>;
      },
    },
    {
      key: "isBooked",
      header: "Status",
      render: (s) => (
        <Badge variant={s.isBooked ? "success" : "secondary"} size="sm">
          {s.isBooked ? "Claimed" : "Available"}
        </Badge>
      ),
    },
  ];

  return (
    <Container>
      <Section>
        <Stack gap="md">
          <Heading level={2} size="xl" weight="bold">Slot Analysis (Admin Only)</Heading>
          <Text size="sm" color="muted">
            Price and weight data is never exposed to store owners or users.
          </Text>
          <AdminComposableRegion pageId="admin-giveaways-id-edit" initialCards={pageRegionCards} />
          <DataTable
            data={slots}
            columns={columns}
            keyExtractor={(s) => String(s.slotNumber)}
            emptyMessage="No slots defined."
          />
        </Stack>
      </Section>
    </Container>
  );
}
