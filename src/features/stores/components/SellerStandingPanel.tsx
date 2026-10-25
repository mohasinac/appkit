/**
 * The Trusted Seller criteria, rendered once for three audiences.
 *
 * - the seller's dashboard panel (their real figures against each target)
 * - the public `/seller-guide` (targets only — no seller to measure)
 * - `/help/seller-badges` and the admin trust guide (same, as a reference)
 *
 * 🛑 ONE component for all of them, driven by `sellerStandingRows()`. The
 * whole point of this feature's config module is that the numbers a seller is
 * chasing and the numbers a guide page promises cannot be different numbers —
 * and the surest way to reintroduce that is a second table (Root Cause
 * #73/#75). `metrics` absent is what distinguishes the guide from the panel,
 * not a separate component.
 */

import React from "react";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { Icon } from "../../../ui/components/Icon";
import { Progress } from "../../../ui/components/Progress";
import {
  SELLER_TIER,
  formatSellerStandingValue,
  sellerStandingRows,
  type SellerStandingThresholds,
  type SellerTier,
} from "../../../_internal/shared/features/seller-standing/config";
import type { SellerStandingSnapshot } from "../types";

export interface SellerStandingPanelProps {
  /** Absent on a store that has never been measured, and on the guide pages. */
  standing?: SellerStandingSnapshot;
  tier?: SellerTier;
  /** Admin-tuned thresholds; defaults apply when omitted. */
  thresholds?: SellerStandingThresholds;
  /**
   * Show "N of 5 met" and the progress bar. Off for the public guide, where
   * there is no seller to be N-of-5 about.
   */
  showProgress?: boolean;
  heading?: string;
}

function formatDate(value: Date | string | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function SellerStandingPanel({
  standing,
  tier = SELLER_TIER.SELLER,
  thresholds,
  showProgress = false,
  heading = "Trusted Seller",
}: SellerStandingPanelProps) {
  const rows = sellerStandingRows(standing ?? null, thresholds);
  const metCount = rows.filter((r) => r.met).length;
  const isTrusted = tier === SELLER_TIER.TRUSTED;
  const computedAt = formatDate(standing?.computedAt);
  const nextComputeAt = formatDate(standing?.nextComputeAt);

  return (
    <Stack gap="md" surface="card" padding="lg" rounded="xl">
      <Stack gap="xs">
        <Row align="center" justify="between" gap="sm" wrap>
          <Heading level={2} size="lg" weight="semibold">
            {heading}
          </Heading>
          {showProgress ? (
            <Text size="xs" color="muted">
              {metCount} of {rows.length} met
            </Text>
          ) : null}
        </Row>
        <Text size="sm" color="muted">
          {isTrusted
            ? "Your store meets every criterion. Your badge is live, and your payouts start when you ship rather than on delivery."
            : `Meet all ${rows.length} criteria in the same ${standing?.windowDays ?? thresholds?.windowDays ?? 90}-day window to earn the badge — and to be paid when you ship, rather than waiting for delivery.`}
        </Text>
      </Stack>

      {showProgress ? <Progress value={metCount} max={rows.length} size="sm" variant="gradient" /> : null}

      <Stack gap="sm">
        {rows.map((row) => (
          <Row key={row.criterion} gap="sm" align="start">
            {/*
              The tick is decorative; the met/unmet state is also carried by
              the figure beside it ("31 / 25") and by the label, so colour is
              never the only signal.
            */}
            <Icon
              name={row.met ? "approve" : "confirm"}
              size="sm"
              tone={row.met ? "success" : "muted"}
              aria-hidden
            />
            <Stack gap="xs" className="min-w-0 flex-1">
              <Row gap="sm" align="center" justify="between" wrap>
                <Text size="sm" weight="medium">
                  {row.label}
                </Text>
                <Text size="sm" color={row.met ? "inherit" : "muted"} numeric>
                  {/*
                    🛑 `actual === null` means NEVER MEASURED, and renders as an
                    em-dash rather than 0. A confident "0 / 25" on a store the
                    job has not reached yet is the same lie as a counter that
                    has never been written reading as zero (Root Cause #72).
                  */}
                  {row.actual === null
                    ? "—"
                    : formatSellerStandingValue(row.actual, row.kind)}
                  {" / "}
                  {formatSellerStandingValue(row.target, row.kind)}
                </Text>
              </Row>
              <Text size="xs" color="muted">
                {row.why}
              </Text>
            </Stack>
          </Row>
        ))}
      </Stack>

      {/*
        🛑 The cadence, in the seller's words. Without it a seller who shipped
        twenty orders this week reads an unchanged panel as broken rather than
        as monthly — which is the single most likely support ticket this
        feature generates.
      */}
      <Div>
        {standing ? (
          <Text size="xs" color="faint">
            Figures as of {computedAt ?? "the last check"}
            {nextComputeAt ? ` · next update ${nextComputeAt}` : ""}. Updated once a
            month, on the last day.
          </Text>
        ) : (
          <Text size="xs" color="faint">
            Your figures are calculated on the last day of each month — nothing has
            been measured for your store yet.
          </Text>
        )}
      </Div>
    </Stack>
  );
}
