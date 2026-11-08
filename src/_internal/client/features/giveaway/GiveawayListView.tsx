"use client";

import React from "react";
import { Stack, Row, Container, Grid } from "../../../../ui/components/Layout";
import { Text, Heading } from "../../../../ui/components/Typography";
import { Badge } from "../../../../ui/components/Badge";
import { Card } from "../../../../ui/components/Card";
import { Section } from "../../../../ui/components/Semantic";
import { Anchor } from "../../../../ui/components/Anchor";
import { Div } from "../../../../ui/components/Div";
import { MediaImage } from "../../../../ui/components/MediaImage";
import { ROUTES } from "../../../../next/routing/route-map";
import type { ClientGiveawayConfig } from "../../../../features/giveaway/types";
import { AdminComposableRegion } from "../../../../features/dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../shared/features/dashboard/recent-entry";

interface ClientGiveawayEvent {
  id: string;
  title: string;
  description?: string;
  status: string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  /**
   * Only `coverImage.url` is ever populated on EventDocument — reading
   * `coverImageUrl` alone showed the 🎰 placeholder on every card.
   */
  coverImageUrl?: string;
  coverImage?: { url?: string } | null;
  giveawayConfig?: ClientGiveawayConfig;
}

interface GiveawayListViewProps {
  items: ClientGiveawayEvent[];
  adminMode?: boolean;
  /**
   * Stable, hand-chosen page-region id (Phase 12) — this one view is shared
   * by `/admin/giveaways` and the public `/giveaway`, so every caller
   * computes its own route-template-derived id rather than this component
   * guessing one.
   */
  pageId: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

/**
 * Card grid of giveaways.
 * Admin sees all statuses; public sees active only.
 */
export function GiveawayListView({ items, adminMode = false, pageId, pageRegionCards = [] }: GiveawayListViewProps) {
  const visible = adminMode
    ? items
    : items.filter((e) => e.status === "active");

  if (visible.length === 0) {
    return (
      <Container>
        <Section>
          <Stack className="text-center" gap="md" padding="xl">
            <Heading level={2} size="2xl" weight="bold">
              No Active Giveaways
            </Heading>
            <Text color="muted">
              Check back soon for upcoming giveaway events!
            </Text>
            <AdminComposableRegion pageId={pageId} initialCards={pageRegionCards} />
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
            {adminMode ? "All Giveaways" : "Active Giveaways"}
          </Heading>
          <AdminComposableRegion pageId={pageId} initialCards={pageRegionCards} />
          <Grid cols={3} gap="md">
            {visible.map((event) => {
              const claimed =
                event.giveawayConfig?.slots.filter((s) => s.isBooked).length ?? 0;
              const total = event.giveawayConfig?.totalSlots ?? 0;
              const slotsLeft = total - claimed;

              return (
              <Anchor
                key={event.id}
                /*
                 * In adminMode this used to link to the PUBLIC giveaway page,
                 * so an admin on the admin list had no route to slot
                 * configuration at all — which went unnoticed because the
                 * editor was orphaned and there was nowhere to link TO.
                 * Nested anchors are invalid, so the card itself changes
                 * target rather than gaining a second link.
                 */
                href={
                  adminMode
                    ? String(ROUTES.ADMIN.GIVEAWAY_CONFIG(event.id))
                    : `/giveaway/${event.id}`
                }
                tone="brand"
                rounded="2xl"
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`${event.title} giveaway`}
              >
                  <Card
                    variant="default"
                    padding="none"
                    animate="hoverLift"
                    className="overflow-hidden"
                  >
                    {event.coverImageUrl || event.coverImage?.url ? (
                      <Div className="relative aspect-video overflow-hidden">
                        <MediaImage
                          src={event.coverImageUrl || event.coverImage?.url || ""}
                          alt={event.title}
                          size="card"
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
