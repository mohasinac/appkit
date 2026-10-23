/**
 * The charts on an event page — whichever ones have real data.
 *
 * 🛑 THE WHOLE SECTION DISAPPEARS WHEN NOTHING QUALIFIES, and each chart
 * independently returns `null` from its own builder rather than rendering an
 * empty frame. A chart says "we measured this"; an axis pair with a flat line
 * says it too, and says something false. An absent chart says "not yet",
 * which is both true and the common case for a new event.
 *
 * `<Chart>` declares its own `"use client"` internally and loads recharts via
 * `dynamic(..., { ssr: false })`, so this file needs no client boundary and a
 * Server Component can mount it directly.
 *
 * @tag domain:events
 * @tag layer:component
 */

import React from "react";
import { Chart } from "../../../ui/components/Chart";
import type { ChartSpec } from "../../../ui/components/chart-spec";
import { Grid, Heading, Progress, Row, Stack, Text } from "../../../ui";
import { CountdownDisplay } from "../../../ui/components/CountdownDisplay";
import type { SaleProgress } from "../utils/event-charts";

export interface EventInsightsProps {
  pollChart?: ChartSpec | null;
  savingsChart?: ChartSpec | null;
  likeTrendChart?: ChartSpec | null;
  saleProgress?: SaleProgress | null;
  heading?: string;
}

export function EventInsights({
  pollChart,
  savingsChart,
  likeTrendChart,
  saleProgress,
  heading = "By the numbers",
}: EventInsightsProps) {
  const charts = [savingsChart, pollChart, likeTrendChart].filter(
    (c): c is ChartSpec => Boolean(c),
  );

  if (charts.length === 0 && !saleProgress) return null;

  return (
    <Stack gap="md">
      <Heading level={2} size="lg" weight="semibold" color="primary">
        {heading}
      </Heading>

      {saleProgress && (
        <Stack gap="sm" surface="card" padding="md" rounded="xl" border="default">
          <Row align="center" justify="between" gap="sm" wrap>
            <Text size="sm" weight="medium">
              {saleProgress.endsAt ? "Time remaining" : "This has ended"}
            </Text>
            {saleProgress.endsAt && (
              <Text size="sm" color="muted">
                {/* Live-ticking, and the one place a countdown belongs — the
                    card elsewhere recomputes "Nd remaining" as static text. */}
                <CountdownDisplay targetDate={saleProgress.endsAt} format="auto" />
              </Text>
            )}
          </Row>
          <Progress
            value={saleProgress.elapsedPercent}
            variant={saleProgress.elapsedPercent > 85 ? "warning" : "primary"}
            size="sm"
            label="Sale window elapsed"
          />

          {/*
            * Only when a real `usage.totalLimit` exists. An uncapped coupon
            * has no denominator, and a bar filling toward an invented 100
            * would imply a scarcity nobody set.
            */}
          {saleProgress.claimedPercent !== null && (
            <>
              <Row align="center" justify="between" gap="sm" wrap>
                <Text size="sm" weight="medium">Claimed</Text>
                <Text size="sm" color="muted">{saleProgress.claimedLabel}</Text>
              </Row>
              <Progress
                value={saleProgress.claimedPercent}
                variant={saleProgress.claimedPercent > 85 ? "error" : "success"}
                size="sm"
                label="Redemptions against the cap"
              />
            </>
          )}
        </Stack>
      )}

      {charts.length > 0 && (
        <Grid cols="cardsWide" gap="lg">
          {charts.map((spec) => (
            <Chart key={spec.title ?? spec.caption} spec={spec} height={260} />
          ))}
        </Grid>
      )}
    </Stack>
  );
}
