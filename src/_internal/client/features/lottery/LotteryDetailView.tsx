"use client";

import React, { useState } from "react";
import {
  Stack,
  Row,
  Text,
  Heading,
  Badge,
  Section,
  Container,
  Div,
  Anchor,
} from "../../../../ui";
import { MediaImage } from "../../../../features/media/MediaImage";
import { ROUTES } from "../../../../next/routing/route-map";
import { LotterySlotGrid } from "./LotterySlotGrid";
import { LotteryPullForm } from "./LotteryPullForm";
import { PrizeDrawCollage } from "../../../../features/products/components/PrizeDrawCollage";
import { slotsToCollageItems } from "./slot-collage-items";
import type { ClientLotteryConfig } from "../../../../features/lottery/types";

interface ClientLotteryEvent {
  id: string;
  title: string;
  description?: string;
  status: string;
  endsAt?: string | Date | null;
  /**
   * Two spellings exist on EventDocument and only `coverImage.url` is ever
   * populated — by seed data or the admin editor. Reading `coverImageUrl`
   * alone is why this page showed the 🎰 placeholder for every lottery.
   */
  coverImageUrl?: string;
  coverImage?: { url?: string } | null;
  lotteryConfig?: ClientLotteryConfig;
}

interface LotteryDetailViewProps {
  event: ClientLotteryEvent;
  user?: { uid: string; displayName?: string | null } | null;
  currentEntry?: { userLotteryNumber: number; assignedPrizeSlotNumber?: number; slotName?: string } | null;
}

/**
 * Full lottery detail page view.
 * Shows cover + description + slot grid + pull form (if active + logged in).
 */
export function LotteryDetailView({ event, user, currentEntry }: LotteryDetailViewProps) {
  const [pulledEntry, setPulledEntry] = useState<{
    userLotteryNumber: number;
    assignedPrizeSlotNumber: number;
    slotName: string;
  } | null>(currentEntry?.assignedPrizeSlotNumber != null ? currentEntry as { userLotteryNumber: number; assignedPrizeSlotNumber: number; slotName: string } : null);

  const config = event.lotteryConfig;
  const prizeItems = slotsToCollageItems(config?.slots ?? []);
  const isActive = event.status === "active";
  const isEnded = event.status === "ended" || event.status === "cancelled";

  return (
    <Container>
      <Section>
        <Stack gap="xl">
          {/* Hero */}
          {event.coverImageUrl || event.coverImage?.url ? (
            <Div rounded="2xl" className="relative overflow-hidden" style={{ aspectRatio: "16/9", maxHeight: "16rem" }}>
              <MediaImage
                src={event.coverImageUrl || event.coverImage?.url || ""}
                alt={event.title}
                size="hero"
              />
            </Div>
          ) : (
            <Div rounded="2xl" surface="subtle" padding="xl" align="center" justify="center">
              <Text size="5xl">🎰</Text>
            </Div>
          )}

          {/* Header */}
          <Stack gap="sm">
            <Row gap="xs" align="center" wrap>
              <Badge
                variant={
                  isActive ? "success" : isEnded ? "danger" : "warning"
                }
              >
                {event.status}
              </Badge>
              {config && (
                <Badge variant="info">
                  {config.slots.filter((s) => s.isBooked).length}/{config.totalSlots} slots claimed
                </Badge>
              )}
            </Row>
            <Heading level={1} size="3xl" weight="bold">
              {event.title}
            </Heading>
            {event.description ? (
              <Text color="muted" size="sm">{event.description.replace(/<[^>]+>/g, "").slice(0, 200)}</Text>
            ) : null}
            {event.endsAt ? (
              <Text size="sm" color="muted">
                Ends: {new Date(event.endsAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
              </Text>
            ) : null}
          </Stack>

          {/* Prize previews — only the slots that actually have a photo. The
              numbered grid below stays the complete slot map. */}
          {prizeItems.length > 0 ? (
            <Stack gap="sm">
              <Heading level={2} size="xl" weight="semibold">
                Prizes
              </Heading>
              <PrizeDrawCollage items={prizeItems} wonLabel="Claimed" />
            </Stack>
          ) : null}

          {/* Slot Grid */}
          {config && config.slots.length > 0 ? (
            <Stack gap="sm">
              <Heading level={2} size="xl" weight="semibold">
                Slots
              </Heading>
              <LotterySlotGrid slots={config.slots} totalSlots={config.totalSlots} />
            </Stack>
          ) : null}

          {/* Pull Form or Result */}
          {isActive && config && (
            <Div padding="md" rounded="2xl" surface="card" className="border border-[var(--appkit-color-border)]">
              {!user ? (
                <Stack gap="md" className="text-center">
                  <Heading level={2} size="xl" weight="semibold">
                    Want to Participate?
                  </Heading>
                  <Text color="muted">
                    Log in to submit your lottery entry.
                  </Text>
                  <Anchor
                    href={String(ROUTES.AUTH.LOGIN)}
                    tone="brand"
                  >
                    Log In to Enter
                  </Anchor>
                </Stack>
              ) : pulledEntry ? (
                <Stack gap="sm" surface="success-surface" padding="md" rounded="xl" className="border border-success/20">
                  <Heading level={2} size="lg" weight="bold" className="text-success">
                    You&apos;re Lottery #{pulledEntry.userLotteryNumber}!
                  </Heading>
                  <Text className="text-success" size="sm">
                    Assigned to Slot #{pulledEntry.assignedPrizeSlotNumber}
                    {pulledEntry.slotName ? ` — ${pulledEntry.slotName}` : ""}.
                  </Text>
                </Stack>
              ) : (
                <LotteryPullForm
                  sourceType="event"
                  eventId={event.id}
                  totalSlots={config.totalSlots}
                  maxPullsPerUser={config.maxPullsPerUser}
                  onSuccess={(res) => setPulledEntry(res)}
                />
              )}
            </Div>
          )}

          {isEnded && !pulledEntry && (
            <Stack gap="sm" surface="muted" padding="md" rounded="xl">
              <Text color="muted" weight="semibold">
                This lottery has ended.
              </Text>
            </Stack>
          )}
        </Stack>
      </Section>
    </Container>
  );
}
