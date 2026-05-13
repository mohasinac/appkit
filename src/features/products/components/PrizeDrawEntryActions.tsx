"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Stack, Text, useToast } from "../../../ui";
import { ROUTES } from "../../../next";
import { formatCurrency } from "../../../utils/number.formatter";
import { useGuestCart } from "../../cart/hooks/useGuestCart";
import { pushCartOp } from "../../cart/utils/pending-ops";
import { NonRefundableConsentModal } from "./NonRefundableConsentModal";

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
}: PrizeDrawEntryActionsProps) {
  const router = useRouter();
  const cart = useGuestCart();
  const { showToast } = useToast();
  const [consentOpen, setConsentOpen] = useState(false);

  const closed = revealStatus === "closed" || remainingEntries === 0;

  const handleEnter = useCallback(() => {
    if (closed) return;
    setConsentOpen(true);
  }, [closed]);

  const handleConfirm = useCallback(() => {
    cart.add(productId, 1, {
      productTitle: title,
      productImage: thumb,
      price: pricePerEntry,
    });
    pushCartOp({
      op: "add",
      productId,
      quantity: 1,
      productTitle: title,
      productImage: thumb,
      price: pricePerEntry,
    });
    setConsentOpen(false);
    showToast("Entry added to cart", "success");
    router.push(String(ROUTES.USER.CART));
  }, [cart, productId, title, thumb, pricePerEntry, router, showToast]);

  return (
    <Stack gap="md">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {formatCurrency(pricePerEntry, currency)}
        <Text as="span" className="ml-1 text-xs font-normal text-[var(--appkit-color-text-muted)]">
          per entry
        </Text>
      </Text>

      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={closed}
        onClick={handleEnter}
      >
        {closed ? "Draw closed" : "Enter draw"}
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

      <Text className="text-center text-xs text-[var(--appkit-color-text-muted)]">
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
    </Stack>
  );
}
