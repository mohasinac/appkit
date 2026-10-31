"use client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor } from "../../../ui/components/Anchor";
import { Button } from "../../../ui/components/Button";
import { GatedPrice } from "../../../ui/components/GatedPrice";
import { QuantityStepper } from "../../../ui/components/QuantityStepper";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { LoginRequiredModal } from "../../../ui/components/LoginRequiredModal";
import { useAddToCart } from "../../cart/hooks/useAddToCart";
import { useToast } from "../../../ui/components/Toast";
import { normalizeError } from "../../../errors/normalize";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils/number.formatter";
import { NonRefundableConsentModal } from "./NonRefundableConsentModal";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../constants/action-defs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { toUserMessage } from "../../../errors/error-display-map";

export interface RandomLotsEntryActionsProps {
  productId: string;
  productSlug?: string;
  title: string;
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
 * - On confirm → add the chosen number of entries to the cart, then /user/cart
 * - "View RNG source" link → prizeGithubFileUrl
 *
 * 🛑 THIS FLOW DID NOT WORK AT ALL UNTIL 2026-10-19, and the docstring above
 * described the behaviour it was supposed to have. `handleConfirm` pushed to
 * `/checkout?directItem=<slug>&type=prize-draw` — and NOTHING anywhere reads
 * `directItem` (CheckoutRouteClient reads only `coupon` and `lane`), and
 * nothing added to the cart. A buyer pressing "Enter draw" landed on a
 * checkout of whatever was already in their basket, with no entry in it.
 * Buying an entry was impossible.
 *
 * 🛑 MULTI-ENTRY NEEDED NO SERVER WORK. `randomLotsRule.splitMultipleOrders`
 * already chunks a quantity into batches of RANDOM_LOTS_MAX_REVEALS_PER_ORDER
 * (7 entries → [3,3,1]), `enforceMaxPerUserForCart` already caps per buyer, and
 * the rule's preflight already checks `prizeMaxEntries`. The whole server half
 * was written and unreachable because the client never sent a quantity.
 */
export function RandomLotsEntryActions({
  productId,
  title,
  pricePerEntry,
  currency,
  remainingEntries,
  revealStatus,
  prizeGithubFileUrl,
}: RandomLotsEntryActionsProps) {
  const router = useRouter();
  const { requireAuth, isAuthResolving, modalOpen, modalMessage, closeModal } =
    useAuthGate();
  const [consentOpen, setConsentOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { showToast } = useToast();
  const { mutate: addToCart, isLoading: adding } = useAddToCart();

  const closed = revealStatus === "closed" || remainingEntries === 0;

  /*
   * Capped by what is LEFT, not by maxPerUser.
   *
   * `remainingEntries` is a fact about the draw and is already on screen.
   * `maxPerUser` is an async per-buyer check (`enforceMaxPerUserForCart` counts
   * their existing orders), so mirroring it here would mean a second, slower
   * source of truth that disagrees with the server whenever an order is in
   * flight — and the server's refusal already names the cap.
   */
  const maxQuantity = Math.max(1, Math.min(99, remainingEntries || 1));

  const handleEnter = useCallback(() => {
    if (closed) return;
    requireAuth(ACTION_ID.ENTER_RANDOM_LOTS, () => setConsentOpen(true));
  }, [closed, requireAuth]);

  const handleConfirm = useCallback(async () => {
    setConsentOpen(false);
    /*
     * ADD, then route. The previous version only routed — and to a parameter
     * nobody reads. `useAddToCart` falls back to the guest cart on a 401, so
     * this works signed-out too and the entry survives the login merge.
     */
    try {
      await addToCart({
        productId,
        quantity,
        productTitle: title,
        price: pricePerEntry,
      });
    } catch (err) {
      const n = normalizeError(err);
      /*
       * 🛑 Surfaced, and the ROUTE IS SKIPPED. The add can legitimately fail —
       * the draw sold out between render and confirm, or this buyer is over
       * `maxPerUser`, which is an async per-buyer check the stepper cannot
       * mirror. Routing to the cart anyway would show an empty basket and make
       * a correct refusal look like the same silent nothing this flow did
       * before it was repaired.
       */
      showToast(toUserMessage(n.code, undefined, { fallback: "We couldn't enter you into that draw. Please try again." }), "error");
      return;
    }
    router.push(String(ROUTES.USER.CART));
  }, [addToCart, productId, quantity, title, pricePerEntry, router, showToast]);

  const totalLabel = useMemo(
    () => formatCurrency(pricePerEntry * quantity, currency),
    [pricePerEntry, quantity, currency],
  );

  return (
    <Stack gap="md">
      <Text size="2xl" weight="bold" color="primary">
        <GatedPrice label="Sign in to see the entry price">
          {formatCurrency(pricePerEntry, currency)}
          <Text as="span" className="ml-1 text-[var(--appkit-color-text-muted)]" size="xs" weight="normal">
            per entry
          </Text>
        </GatedPrice>
      </Text>

      {!closed ? (
        <Row align="center" justify="between" gap="sm" wrap>
          <Text size="sm" color="muted">Entries</Text>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={maxQuantity}
          />
        </Row>
      ) : null}

      {!closed && quantity > 1 ? (
        <Text size="sm" color="muted">
          <GatedPrice label="Sign in to see the total">
            {quantity} entries · {totalLabel}
          </GatedPrice>
        </Text>
      ) : null}

      <Button
        action={closed ? undefined : ACTIONS.RANDOM_LOTS["buy-now"]}
        variant="primary"
        size="md"
        className="w-full"
        disabled={closed || isAuthResolving || adding}
        onClick={handleEnter}
      >
        {closed
          ? "Lot closed"
          : isAuthResolving
            ? "Checking…"
            : adding
              ? "Adding…"
              : undefined}
      </Button>

      {prizeGithubFileUrl ? (
        <Anchor
          href={prizeGithubFileUrl}
          tone="none"
          underline="hover"
          size="xs"
          weight="medium"
          className="text-left text-primary-600 underline-offset-4 dark:text-primary-400"
        >
          View RNG source code on GitHub →
        </Anchor>
      ) : null}

      <Text className="text-[var(--appkit-color-text-muted)]" size="xs" align="start">
        Winners chosen by Node.js crypto.randomInt — fully auditable. Entries are
        locked once paid; refunds only if the prize pool is exhausted.
      </Text>

      <NonRefundableConsentModal
        open={consentOpen}
        listingType="random-lots"
        itemTitle={title}
        priceLabel={formatCurrency(pricePerEntry, currency)}
        onCancel={() => setConsentOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
      <LoginRequiredModal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
    </Stack>
  );
}
