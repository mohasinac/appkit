"use client";
import { normalizeError } from "../../../errors/normalize";
import React, { useState } from "react";
import Link from "next/link";
import { Button, Div, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import type { ConversationDocument } from "../../messages/schemas/firestore";
import type { startClassifiedConversationAction } from "../../../_internal/server/features/classified/actions";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

export interface ClassifiedContactSellerPanelProps {
  productId: string;
  onContactSeller: typeof startClassifiedConversationAction;
}

/**
 * The only purchase-path CTA on a classified listing — no cart, no checkout.
 * Extracted from the old ClassifiedDetailView so the richer, full-parity
 * ClassifiedDetailPageView can slot this into a `renderBuyBar` prop.
 */
export function ClassifiedContactSellerPanel({ productId, onContactSeller }: ClassifiedContactSellerPanelProps) {
  const [pending, setPending] = useState(false);
  const [conversation, setConversation] = useState<ConversationDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleContactSeller() {
    setPending(true);
    setError(null);
    try {
      const result = await onContactSeller({ productId });
      if (result && typeof result === "object" && "ok" in result) {
        if (result.ok) {
          setConversation((result as { ok: true; data: typeof conversation }).data);
        } else {
          setError((result as { ok: false; error: string }).error);
        }
      } else {
        setConversation(result as typeof conversation);
      }
    } catch (e) {
      void normalizeError(e);
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (conversation) {
    return (
      <Div className={`border border-border bg-muted/40 ${__P.p4}`} rounded="lg">
        <Text className="mb-2" weight="medium">Conversation started!</Text>
        <Link href={ROUTES.USER.MESSAGES} className="text-primary underline underline-offset-2">
          Go to your messages →
        </Link>
      </Div>
    );
  }

  return (
    <Stack gap="sm">
      {error && (
        <Text className="text-destructive" size="sm">{error}</Text>
      )}
      <Button
        type="button"
        variant="primary"
        size="lg"
        isLoading={pending}
        disabled={pending}
        onClick={handleContactSeller}
        className="w-full"
      >
        Contact Seller
      </Button>
    </Stack>
  );
}
