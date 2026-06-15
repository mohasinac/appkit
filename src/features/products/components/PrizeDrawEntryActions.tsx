"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Stack, Text, LoginRequiredModal } from "../../../ui";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils/number.formatter";
import { NonRefundableConsentModal } from "./NonRefundableConsentModal";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../constants/action-defs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

export interface PrizeDrawEntryActionsProps {
  productId: string;
  productSlug?: string;
  title: string;
  thumb?: string;
  pricePerEntry: number;
  currency: string;
  remainingEntries: number;
  revealStatus: "pending" | "open" | "closed" | undefined;
  prizeGithubFileUrl?: string;
  storeId?: string;
  storeName?: string;
}

/**
 * Client buy panel for a prize-draw detail page (SB4-G).
 *
 * - Enter Draw → NonRefundableConsentModal (listingType="prize-draw")
 * - On confirm → add 1 entry to guest cart and route to /user/cart
 * - "View RNG source" link → prizeGithubFileUrl
 */
export function PrizeDrawEntryActions({
  productId,
  productSlug,
  title,
  thumb,
  pricePerEntry,
  currency,
  remainingEntries,
  revealStatus,
  prizeGithubFileUrl,
  storeId,
  storeName,
}: PrizeDrawEntryActionsProps) {
  const router = useRouter();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [consentOpen, setConsentOpen] = useState(false);

  const closed = revealStatus === "closed" || remainingEntries === 0;

  const handleEnter = useCallback(() => {
    if (closed) return;
    requireAuth(ACTION_ID.ENTER_PRIZE_DRAW, () => setConsentOpen(true));
  }, [closed, requireAuth]);

  const handleConfirm = useCallback(() => {
    setConsentOpen(false);
    const slug = productSlug ?? productId;
    router.push(`${String(ROUTES.USER.CHECKOUT)}?directItem=${encodeURIComponent(slug)}&type=prize-draw`);
  }, [productSlug, productId, router]);

  return (
    <Stack gap="md">
      <Text className="text-zinc-900 dark:text-zinc-50" size="2xl" weight="bold">
        {formatCurrency(pricePerEntry, currency)}
        <Text as="span" className="ml-1 text-[var(--appkit-color-text-muted)]" size="xs" weight="normal">
          per entry
        </Text>
      </Text>

      <Button
        action={closed ? undefined : ACTIONS.PRIZE_DRAW["buy-now"]}
        variant="primary"
        size="md"
        className="w-full"
        disabled={closed}
        onClick={handleEnter}
      >
        {closed ? "Draw closed" : undefined}
      </Button>

      {prizeGithubFileUrl ? (
        <a
          href={prizeGithubFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-xs font-medium text-primary-600 underline-offset-4 hover:underline dark:text-primary-400"
        >
          View RNG source code on GitHub →
        </a>
      ) : null}

      <Text className="text-[var(--appkit-color-text-muted)]" size="xs" align="center">
        Winners chosen by Node.js crypto.randomInt — fully auditable. Entries are
        locked once paid; refunds only if the prize pool is exhausted.
      </Text>

      <NonRefundableConsentModal
        open={consentOpen}
        listingType="prize-draw"
        itemTitle={title}
        priceLabel={formatCurrency(pricePerEntry, currency)}
        onCancel={() => setConsentOpen(false)}
        onConfirm={handleConfirm}
      />
      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Stack>
  );
}
