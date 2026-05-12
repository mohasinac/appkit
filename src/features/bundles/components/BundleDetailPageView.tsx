"use client";

/**
 * BundleDetailPageView — SB3-I. Public detail page for a single bundle.
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Container,
  Div,
  Heading,
  Row,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { NonRefundableConsentModal } from "../../products/components/NonRefundableConsentModal";
import { ROUTES } from "../../../next/routing/route-map";
import type { BundleDocument, BundleItem } from "../schemas/firestore";

export interface BundleDetailPageViewProps {
  bundle: BundleDocument;
  /** Fires after the user accepts the non-refundable consent modal. */
  onBuy: (bundle: BundleDocument) => Promise<void> | void;
  /** Optional override for the buy CTA (e.g. "Sign in to buy"). */
  buyDisabledReason?: string;
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function savingsPct(b: BundleDocument): number {
  if (!b.bundleOriginalTotal) return 0;
  const off = Math.max(0, b.bundleOriginalTotal - b.bundlePrice);
  return Math.round((off / b.bundleOriginalTotal) * 100);
}

export function BundleDetailPageView({
  bundle,
  onBuy,
  buyDisabledReason,
}: BundleDetailPageViewProps) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const oos = bundle.status === "out_of_stock";
  const off = savingsPct(bundle);

  const handleBuyClick = () => {
    if (oos || buyDisabledReason) return;
    setConsentOpen(true);
  };

  const handleConfirm = async () => {
    setConsentOpen(false);
    setBusy(true);
    try {
      await onBuy(bundle);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section>
      <Container>
        <Stack className="gap-6">
          <Stack className="gap-1">
            <Row className="text-sm text-[var(--appkit-color-text-muted,#6b7280)] gap-2">
              <Link href={String(ROUTES.PUBLIC.BUNDLES)}>Bundles</Link>
              <span>·</span>
              <Text>{bundle.storeName}</Text>
            </Row>
            <Heading level={1}>{bundle.title}</Heading>
            {bundle.description && (
              <Text className="text-[var(--appkit-color-text-muted,#6b7280)]">
                {bundle.description}
              </Text>
            )}
          </Stack>

          <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Div className="aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              {bundle.images?.[0] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={bundle.images[0]}
                  alt={bundle.title}
                  className="h-full w-full object-cover"
                />
              )}
            </Div>

            <Stack className="gap-4">
              {off > 0 && (
                <Badge variant="success">
                  Save {off}% on this bundle
                </Badge>
              )}
              <Row className="items-baseline gap-3">
                <Heading level={2}>{formatRupees(bundle.bundlePrice)}</Heading>
                {bundle.bundleOriginalTotal > bundle.bundlePrice && (
                  <Text className="line-through text-[var(--appkit-color-text-muted,#6b7280)]">
                    {formatRupees(bundle.bundleOriginalTotal)}
                  </Text>
                )}
              </Row>
              <Text className="text-sm text-[var(--appkit-color-text-muted,#6b7280)]">
                {bundle.bundleItems.length} items · ships together · non-refundable
              </Text>

              {bundle.maxPerUser != null && (
                <Badge variant="secondary">
                  Limit: {bundle.maxPerUser} per customer
                </Badge>
              )}

              {oos ? (
                <Alert variant="warning">
                  This bundle is currently unavailable — one or more items have
                  sold out.
                </Alert>
              ) : buyDisabledReason ? (
                <Alert variant="info">{buyDisabledReason}</Alert>
              ) : null}

              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={oos || !!buyDisabledReason || busy}
                onClick={handleBuyClick}
              >
                {busy ? "Processing…" : "Buy Bundle"}
              </Button>
            </Stack>
          </Div>

          {bundle.video?.url && (
            <Div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={bundle.video.url}
                controls
                className="h-full w-full"
              />
            </Div>
          )}

          <Stack className="gap-3">
            <Heading level={2}>What's in this bundle</Heading>
            <Div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bundle.bundleItems.map((it: BundleItem) => (
                <Stack
                  key={it.productId}
                  className={`rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden ${it.isSold ? "opacity-60" : ""}`}
                >
                  <Div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
                    {it.images?.[0] && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.images[0]}
                        alt={it.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                    {it.isSold && (
                      <Div className="absolute inset-0 grid place-items-center bg-black/50">
                        <Badge variant="danger">Sold</Badge>
                      </Div>
                    )}
                  </Div>
                  <Stack className="gap-1 p-2">
                    <Text className="text-xs font-medium truncate">
                      {it.title}
                    </Text>
                    <Row className="items-center gap-1 text-xs text-[var(--appkit-color-text-muted,#6b7280)]">
                      <Badge variant="secondary">
                        {it.listingType === "pre-order" ? "Pre-order" : "Standard"}
                      </Badge>
                      <Text>×{it.quantity}</Text>
                    </Row>
                  </Stack>
                </Stack>
              ))}
            </Div>
          </Stack>
        </Stack>

        <NonRefundableConsentModal
          open={consentOpen}
          listingType="bundle"
          itemTitle={bundle.title}
          priceLabel={formatRupees(bundle.bundlePrice)}
          onCancel={() => setConsentOpen(false)}
          onConfirm={handleConfirm}
        />
      </Container>
    </Section>
  );
}
