"use client";

import React from "react";
import { Stack, Text, Heading, Badge, Section, Container, DataTable, type DataTableColumn } from "../../../../ui";
import type { ClientLotterySlot } from "../../../../features/lottery/types";

interface AdminLotterySlot extends ClientLotterySlot {
  price: number;
  weight: number;
}

interface LotteryAdminSlotViewProps {
  slots: AdminLotterySlot[];
}

/**
 * Admin-only view showing slots with price + weight + % chance.
 * Separate from LotterySlotGrid (public) which never shows price/weight.
 */
export function LotteryAdminSlotView({ slots }: LotteryAdminSlotViewProps) {
  const totalWeight = slots.reduce((s, sl) => s + sl.weight, 0);

  const columns: DataTableColumn<AdminLotterySlot>[] = [
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
        <Text size="sm" family="mono">₹{s.price.toLocaleString("en-IN")}</Text>
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
