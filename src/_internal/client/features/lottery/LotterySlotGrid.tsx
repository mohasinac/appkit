"use client";

import React from "react";
import { Stack, Row, Text, Span, Div } from "../../../../ui";
import type { ClientLotterySlot } from "../../../../features/lottery/types";

interface LotterySlotGridProps {
  slots: ClientLotterySlot[];
  totalSlots: number;
}

/**
 * Visual grid of lottery slots.
 * Booked slots show buyer display name + user lottery number in green.
 * Available slots show slot number + name in white.
 * Never shows price or weight.
 */
export function LotterySlotGrid({ slots, totalSlots }: LotterySlotGridProps) {
  const cols =
    totalSlots <= 10 ? 5 : totalSlots <= 25 ? 5 : totalSlots <= 50 ? 10 : totalSlots <= 100 ? 10 : 20;

  return (
    <Stack gap="sm">
      <Row gap="sm" align="center">
        <Row gap="xs" align="center">
          <Span layout="inline-block" className="w-3 h-3" rounded="sm" surface="success-surface" />
          <Text size="xs" color="muted">Claimed</Text>
        </Row>
        <Row gap="xs" align="center">
          <Span layout="inline-block" className="w-3 h-3 border border-[var(--appkit-color-border)]" rounded="sm" surface="muted" />
          <Text size="xs" color="muted">Available</Text>
        </Row>
      </Row>
      {/* Outer grid: column count is runtime-computed from totalSlots — gridTemplateColumns passed via style, not className */}
      <Div
        style={{ display: "grid", gap: "4px", gridTemplateColumns: `repeat(${Math.min(cols, totalSlots)}, minmax(0, 1fr))` }}
        aria-label="Lottery slot grid"
      >
        {slots.map((slot) => (
          <Div
            key={slot.slotNumber}
            title={
              slot.isBooked
                ? `Slot #${slot.slotNumber}: ${slot.name} — claimed by ${slot.bookedByDisplayName ?? "a participant"} (#${slot.bookedByUserLotteryNumber ?? "?"})`
                : `Slot #${slot.slotNumber}: ${slot.name} — available`
            }
            aria-label={`Slot ${slot.slotNumber}: ${slot.isBooked ? "claimed" : "available"}`}
            className={[
              "aspect-square rounded-sm flex items-center justify-center text-[10px] font-mono font-semibold transition-colors",
              slot.isBooked
                ? "text-success border border-success/30"
                : "text-zinc-400 border border-[var(--appkit-color-border-subtle)] hover:border-primary/40",
            ].join(" ")}
            surface={slot.isBooked ? "success-surface" : "subtle"}
          >
            {slot.slotNumber}
          </Div>
        ))}
        {slots.length < totalSlots &&
          Array.from({ length: totalSlots - slots.length }, (_, i) => (
            <Div
              key={`empty-${i}`}
              rounded="sm"
            surface="subtle"
            className="aspect-square border border-[var(--appkit-color-border-subtle)]"
              aria-hidden="true"
            />
          ))}
      </Div>
      <Text size="xs" color="muted">
        {slots.filter((s) => s.isBooked).length} / {totalSlots} slots claimed
      </Text>
    </Stack>
  );
}
