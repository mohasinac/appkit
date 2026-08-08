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
import type { ClientLotteryConfig } from "../../../../features/lottery/types";

interface ClientProduct {
  id: string;
  title: string;
  description?: string;
  status: string;
  mainImage?: string;
  prizeDrawMode?: "reveal" | "lottery";
  lotteryConfig?: ClientLotteryConfig;
}

interface PrizeDrawLotteryDetailViewProps {
  product: ClientProduct;
  user?: { uid: string; displayName?: string | null } | null;
  currentEntry?: { userLotteryNumber: number; assignedPrizeSlotNumber?: number; slotName?: string } | null;
}

/**
 * Prize-draw product detail view for lottery mode.
 * Same flow as LotteryDetailView but sourced from a product.
 */
export function PrizeDrawLotteryDetailView({
  product,
  user,
  currentEntry,
}: PrizeDrawLotteryDetailViewProps) {
  const [pulledEntry, setPulledEntry] = useState<{
    userLotteryNumber: number;
    assignedPrizeSlotNumber: number;
    slotName: string;
  } | null>(
    currentEntry?.assignedPrizeSlotNumber != null
      ? (currentEntry as { userLotteryNumber: number; assignedPrizeSlotNumber: number; slotName: string })
      : null,
  );

  const config = product.lotteryConfig;
  const isActive = product.status === "published";

  return (
    <Container>
      <Section>
        <Stack gap="xl">
          {/* Image */}
          {product.mainImage ? (
            <Div rounded="2xl" className="relative overflow-hidden" style={{ aspectRatio: "16/9", maxHeight: "16rem" }}>
              <MediaImage
                src={product.mainImage}
                alt={product.title}
                size="hero"
              />
            </Div>
          ) : (
            <Div rounded="2xl" surface="muted" padding="xl" align="center" justify="center">
              <Text size="5xl">🎁</Text>
            </Div>
          )}

          <Stack gap="sm">
            <Row gap="xs" align="center" wrap>
              <Badge variant="info">Lottery Prize Draw</Badge>
              {config && (
                <Badge variant={isActive ? "success" : "secondary"}>
                  {config.slots.filter((s) => s.isBooked).length}/{config.totalSlots} claimed
                </Badge>
              )}
            </Row>
            <Heading level={1} size="3xl" weight="bold">
              {product.title}
            </Heading>
            {product.description ? (
              <Text color="muted">{product.description}</Text>
            ) : null}
          </Stack>

          {config && config.slots.length > 0 ? (
            <Stack gap="sm">
              <Heading level={2} size="xl" weight="semibold">Slots</Heading>
              <LotterySlotGrid slots={config.slots} totalSlots={config.totalSlots} />
            </Stack>
          ) : null}

          {isActive && config && (
            <Div padding="md" rounded="2xl" surface="card" className="border border-[var(--appkit-color-border)]">
              {!user ? (
                <Stack gap="md" className="text-center">
                  <Heading level={2} size="xl" weight="semibold">Want to Enter?</Heading>
                  <Text color="muted">Log in to submit your entry.</Text>
                  <Anchor href={String(ROUTES.AUTH.LOGIN)} tone="brand">
                    Log In to Enter
                  </Anchor>
                </Stack>
              ) : pulledEntry ? (
                <Stack gap="sm" surface="success-surface" padding="md" rounded="xl" className="border border-success/20">
                  <Heading level={2} size="lg" weight="bold" className="text-success">
                    You&apos;re Entry #{pulledEntry.userLotteryNumber}!
                  </Heading>
                  <Text className="text-success" size="sm">
                    Assigned to Slot #{pulledEntry.assignedPrizeSlotNumber}
                    {pulledEntry.slotName ? ` — ${pulledEntry.slotName}` : ""}.
                  </Text>
                </Stack>
              ) : (
                <LotteryPullForm
                  sourceType="product"
                  productId={product.id}
                  totalSlots={config.totalSlots}
                  maxPullsPerUser={config.maxPullsPerUser}
                  onSuccess={(res) => setPulledEntry(res)}
                />
              )}
            </Div>
          )}
        </Stack>
      </Section>
    </Container>
  );
}
