"use client";

import React from "react";
import {
  Stack,
  Row,
  Text,
  Heading,
  Badge,
  Card,
  Section,
  Container,
  Anchor,
  Div,
  Grid,
} from "../../../../ui";
import type { ClientLotteryConfig } from "../../../../features/lottery/types";

interface ClientLotteryEvent {
  id: string;
  title: string;
  description?: string;
  status: string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  coverImageUrl?: string;
  lotteryConfig?: ClientLotteryConfig;
}

interface LotteryListViewProps {
  items: ClientLotteryEvent[];
  adminMode?: boolean;
}

/**
 * Card grid of lotteries.
 * Admin sees all statuses; public sees active only.
 */
export function LotteryListView({ items, adminMode = false }: LotteryListViewProps) {
  const visible = adminMode
    ? items
    : items.filter((e) => e.status === "active");

  if (visible.length === 0) {
    return (
      <Container>
        <Section>
          <Stack className="text-center" gap="md" padding="xl">
            <Heading level={2} size="2xl" weight="bold">
              No Active Lotteries
            </Heading>
            <Text color="muted">
              Check back soon for upcoming lottery events!
            </Text>
          </Stack>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <Stack gap="lg">
          <Heading level={1} size="3xl" weight="bold">
            {adminMode ? "All Lotteries" : "Active Lotteries"}
          </Heading>
          <Grid cols={3} gap="md">
            {visible.map((event) => {
              const claimed =
                event.lotteryConfig?.slots.filter((s) => s.isBooked).length ?? 0;
              const total = event.lotteryConfig?.totalSlots ?? 0;
              const slotsLeft = total - claimed;

              return (
              <Anchor
                key={event.id}
                href={`/lottery/${event.id}`}
                tone="brand"
                rounded="2xl"
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`${event.title} lottery`}
              >
                  <Card
                    variant="default"
                    padding="none"
                    animate="hoverLift"
                    className="overflow-hidden"
                  >
                    {event.coverImageUrl ? (
                      <Div className="aspect-video overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={event.coverImageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </Div>
                    ) : (
                      <Div className="aspect-video" surface="muted" align="center" justify="center">
                        <Text size="3xl">🎰</Text>
                      </Div>
                    )}
                    <Stack gap="xs" padding="md">
                      <Row gap="xs" align="center" wrap>
                        <Badge
                          variant={
                            event.status === "active"
                              ? "success"
                              : event.status === "ended"
                                ? "danger"
                                : "warning"
                          }
                          size="sm"
                        >
                          {event.status}
                        </Badge>
                        {slotsLeft > 0 && event.status === "active" && (
                          <Badge variant="info" size="sm">
                            {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} left
                          </Badge>
                        )}
                        {slotsLeft === 0 && total > 0 && (
                          <Badge variant="secondary" size="sm">Full</Badge>
                        )}
                      </Row>
                      <Heading level={3} size="lg" weight="semibold" className="truncate">
                        {event.title}
                      </Heading>
                      {event.description ? (
                        <Text size="sm" color="muted" className="truncate">
                          {event.description.replace(/<[^>]+>/g, "").slice(0, 100)}
                        </Text>
                      ) : null}
                      {total > 0 && (
                        <Text size="xs" color="muted">
                          {claimed}/{total} slots claimed
                        </Text>
                      )}
                    </Stack>
                  </Card>
              </Anchor>
              );
            })}
          </Grid>
        </Stack>
      </Section>
    </Container>
  );
}
