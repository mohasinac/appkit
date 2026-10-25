"use client";

/**
 * WHY: a seller's WhatsApp settings are now ONE decision — do they pay the
 *      monthly fee to have order updates sent to their buyers on the
 *      platform's WhatsApp number.
 *
 * 🛑 This replaced a 574-line credential form that asked every seller for a
 * WhatsApp Business Account ID, a Catalogue ID and a **System User Access
 * Token**, then stored that token encrypted on their store document.
 *
 * Three things were wrong with it, and they are why none of it is coming back:
 *
 *   1. Almost no small seller will create a Meta app and mint a system user
 *      token. A setting nobody can complete is a feature nobody has.
 *   2. It made LetItRip the custodian of a live Meta credential per seller.
 *      `StoreRepository.mapDoc` decrypted that token on EVERY read, so any
 *      code path that forgot to project was handling plaintext — a gap
 *      CLAUDE.md flags as deserving its own session.
 *   3. The catalogue half it existed for is gone: `/whatsapp/{slug}/feed.csv`
 *      is a public feed the seller points their own Commerce Manager at, so
 *      no credential crosses the boundary at all.
 *
 * WHAT: subscription status, the price, and the toggle.
 *
 * ## Presentational on purpose
 *
 * Takes the price and the current state as PROPS rather than reading site
 * settings itself. Site settings are server-read and passed down — the
 * monthly fee lives beside the platform's Meta credentials in a document that
 * must never reach a browser, and a client hook here would be a second reader
 * of it (Root Cause #70).
 *
 * EXPORTS: SellerWhatsAppSettingsView, SellerWhatsAppSettingsViewProps
 *
 * @tag domain:whatsapp
 * @tag layer:component
 * @tag access:client
 */

import React, { useState } from "react";
import { Alert } from "../../../ui/components/Alert";
import { Badge } from "../../../ui/components/Badge";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { Section } from "../../../ui/components/Semantic";
import { Toggle } from "../../../ui/components/Toggle";
import { useToast } from "../../../ui/components/toast-context";
import { normalizeError } from "../../../errors/normalize";
import { formatCurrency } from "../../../utils/number.formatter";

export interface SellerWhatsAppSettingsViewProps {
  /** Is this store currently subscribed? Server-resolved from the store document. */
  subscribed: boolean;
  /** Admin-set monthly price, in rupees. Server-resolved from site settings. */
  monthlyFee: number;
  /** Currency for the price label. */
  currency?: string;
  /**
   * Is the channel switched on platform-wide? When false the toggle is
   * disabled and says so — a seller who subscribes into a disabled channel
   * pays for silence.
   */
  channelEnabled: boolean;
  /** Persists the change. Resolves to the new state. */
  onToggleSubscription: (next: boolean) => Promise<void>;
  /** Gate from the store's capabilities; false renders a read-only explanation. */
  hasCapability?: boolean;
}

export function SellerWhatsAppSettingsView({
  subscribed,
  monthlyFee,
  currency = "INR",
  channelEnabled,
  onToggleSubscription,
  hasCapability = true,
}: SellerWhatsAppSettingsViewProps) {
  const [isOn, setIsOn] = useState(subscribed);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleToggle = async (next: boolean) => {
    if (saving) return;
    const previous = isOn;
    setIsOn(next);
    setSaving(true);
    try {
      await onToggleSubscription(next);
      showToast(
        next
          ? "WhatsApp order updates are on. Your buyers will get them from the next order."
          : "WhatsApp order updates are off. Buyers still get email and in-app updates.",
        "success",
      );
    } catch (err) {
      /*
       * Not swallowed, and the optimistic flip is REVERTED. A toggle that
       * stays on after a failed write tells the seller they are subscribed
       * when they are not — and the first they would hear of it is a buyer
       * asking why no updates arrived.
       */
      void normalizeError(err);
      setIsOn(previous);
      showToast("Could not change your subscription. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section>
      <Div className="mx-auto max-w-2xl">
        <Heading level={1} className="mb-1" color="primary" size="2xl" weight="bold">
          WhatsApp order updates
        </Heading>
        <Text variant="secondary" className="mb-6" size="sm">
          Send your buyers order updates on WhatsApp — confirmed, shipped, delivered — from
          LetItRip&apos;s verified business number. You don&apos;t need a WhatsApp Business
          account of your own, and nothing is installed on your phone.
        </Text>

        {!channelEnabled && (
          <Alert variant="warning" className="mb-4">
            WhatsApp updates are currently switched off platform-wide, so nothing will be sent
            even if you subscribe. We&apos;ll start sending as soon as it&apos;s back on.
          </Alert>
        )}

        <Stack gap="md" surface="card" padding="md">
          <Row justify="between" align="center" gap="md">
            <Div className="flex-1 min-w-0">
              <Row gap="sm" align="center">
                <Text size="sm" weight="semibold">Subscription</Text>
                <Badge variant={isOn ? "success" : "inactive"}>
                  {isOn ? "Active" : "Not subscribed"}
                </Badge>
              </Row>
              <Text color="muted" size="sm">
                {formatCurrency(monthlyFee, currency)} per month. Covers every order update to
                every buyer — not charged per message.
              </Text>
            </Div>
            <Toggle
              checked={isOn}
              onChange={handleToggle}
              disabled={saving || !hasCapability}
              size="md"
            />
          </Row>

          {!hasCapability && (
            <Div textSize="sm" className="border border-warning/20" color="warning" surface="warning-surface" padding="inlineSm" rounded="lg">
              Your store doesn&apos;t have this add-on enabled. Contact support to turn it on.
            </Div>
          )}
        </Stack>

        <Heading level={2} className="mt-8 mb-3" size="lg" weight="semibold">
          What your buyers get
        </Heading>

        <Stack gap="sm" surface="card" padding="md">
          <Text color="muted" size="sm">
            A WhatsApp message when an order is <Span weight="semibold">confirmed</Span>,{" "}
            <Span weight="semibold">shipped</Span>, <Span weight="semibold">delivered</Span>,{" "}
            <Span weight="semibold">cancelled</Span> or <Span weight="semibold">refunded</Span>.
            Nothing promotional — buyers who opted out of WhatsApp never receive these.
          </Text>
          <Text color="muted" size="sm">
            Messages come from LetItRip&apos;s number, not yours, so your personal number stays
            private and replies land with our support team rather than on your phone.
          </Text>
          <Text color="muted" size="sm">
            Turning this off changes nothing else: buyers keep getting the same updates by
            email and in their account.
          </Text>
        </Stack>
      </Div>
    </Section>
  );
}
