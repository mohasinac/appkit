"use client";

/**
 * NonRefundableConsentModal — SB3-C / SB4 (S22 Phase-4-follow-up 2026-05-12)
 *
 * Shared confirmation modal shown before a user commits to a non-refundable
 * purchase. Used by:
 *   - Bundle detail page → "Buy Bundle" (whole-bundle, all-or-nothing settlement)
 *   - Prize-draw detail page → "Enter Draw" (entry fee is locked once paid)
 *
 * Copy varies by `listingType`. The primary CTA stays disabled until the
 * consent checkbox is ticked, mirroring the legal flow the support team
 * agreed to in S5-doc.
 */

import React, { useEffect, useId, useState } from "react";
import { Button, Checkbox, Li, Modal, Stack, Text, Ul } from "../../../ui";
// SB-UNI-E 2026-05-13 — "bundle" dropped (bundle UI deleted in SB-UNI-V; bundles
// are now a category discriminator). Prize draws remain the only consumer.
export type NonRefundableListingType = "prize-draw";

export interface NonRefundableConsentModalProps {
  /** Modal visibility — controlled by the parent. */
  open: boolean;
  /** Fires when the user dismisses the modal (Cancel button or backdrop). */
  onCancel: () => void;
  /**
   * Fires when the user ticks the consent checkbox AND clicks "Agree & Continue".
   * The parent should then proceed with checkout / entry submission.
   */
  onConfirm: () => void;
  /** Drives the copy below — bundle wording vs prize-draw wording. */
  listingType: NonRefundableListingType;
  /** Marketing label shown above the description (e.g. "Pokémon TCG Starter Pack"). */
  itemTitle?: string;
  /**
   * Display-only price string (e.g. "₹6,499"). Optional — when omitted the
   * modal omits the price line entirely; this keeps the component reusable
   * from contexts that don't have a finalised number yet.
   */
  priceLabel?: string;
}

const COPY: Record<
  NonRefundableListingType,
  { heading: string; bullets: string[]; cta: string; consent: string }
> = {
  "prize-draw": {
    heading: "Entry fee is non-refundable",
    bullets: [
      "Your entry is locked the moment payment confirms. Prize draws use a public on-chain RNG — no entries can be voided after the reveal window opens.",
      "If the prize pool is exhausted (every prize already won), your entry is automatically refunded.",
      "If you miss the reveal deadline after winning, the prize is auto-forfeited and your entry fee is NOT returned.",
    ],
    cta: "Agree & Enter Draw",
    consent:
      "I understand my entry fee is non-refundable except in the documented pool-exhaustion case.",
  },
};

export function NonRefundableConsentModal({
  open,
  onCancel,
  onConfirm,
  listingType,
  itemTitle,
  priceLabel,
}: NonRefundableConsentModalProps) {
  const [consented, setConsented] = useState(false);
  const consentId = useId();
  const copy = COPY[listingType];

  // Reset the consent state every time the modal is opened so a previous
  // accidental click doesn't carry over to the next attempt.
  useEffect(() => {
    if (open) setConsented(false);
  }, [open]);

  const handleConfirm = () => {
    if (!consented) return;
    onConfirm();
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="md"
      title={copy.heading}
      actions={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!consented}
            onClick={handleConfirm}
          >
            {copy.cta}
          </Button>
        </>
      }
    >
      <Stack gap="3">
        {itemTitle && (
          <Text weight="semibold">{itemTitle}</Text>
        )}
        {priceLabel && (
          <Text className="text-[var(--appkit-color-text-muted)]">
            Total: {priceLabel}
          </Text>
        )}

        <Ul className="list-disc pl-5 space-y-2">
          {copy.bullets.map((b, i) => (
            <Li key={i}>
              <Text>{b}</Text>
            </Li>
          ))}
        </Ul>

        <Checkbox
          id={consentId}
          label={copy.consent}
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
        />
      </Stack>
    </Modal>
  );
}
