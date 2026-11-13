"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { LoginRequiredModal } from "../../../ui/components/LoginRequiredModal";
import { useAuth } from "../../../react/contexts/SessionContext";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { resolvePrizeClaim } from "../../../_internal/shared/features/protection/prize-claim";
import { ACTION_ID } from "../constants/action-defs";
import { useSingleItemCheckout } from "./useSingleItemCheckout";

export interface EventPrizeClaimPanelProps {
  /** The cart line this claim checks out — the listing IS the prize. */
  productId: string;
  productTitle: string;
  productImage?: string | undefined;
  price?: number | undefined;
  storeId?: string | undefined;
  storeName?: string | undefined;
  /**
   * `eventPrize.winnerUserIds` — who may claim. Absent/empty means not yet
   * awarded.
   */
  winnerUserIds?: readonly string[] | undefined;
  /**
   * `eventPrize.eventEndsAt`, already flattened to epoch milliseconds by the
   * server component. Absent → NOT claimable (see `resolvePrizeClaim`).
   */
  eventEndsAt?: number | undefined;
  /**
   * `eventPrize.showInPromotions` — whether this prize is ANNOUNCED.
   *
   * It gates the explanatory text, never the button. See the note on
   * `reasonIsPublic` below; the two are not the same decision.
   */
  showInPromotions?: boolean | undefined;
  /**
   * Prize stock. A claim is still a checkout, so a prize with nothing to ship
   * cannot be one — the control states that rather than failing at the cart.
   */
  inStock: boolean;
}

/**
 * The claim affordance for a listing that is an event prize.
 *
 * Owner, 2026-11-13: *"event claims go to the checkout like buy now on claims,
 * all can see, only the winners can claim if multiple, and on the main shop
 * only not from the events."* All four halves of that are honoured here and in
 * the two modules this composes:
 *
 *   - **all can see** — the PRIZE is advertised by the 🏆 feature badge, which
 *     is SERVER-rendered and therefore crawlable, for every visitor. This panel
 *     is only the CLAIM, which is viewer-specific by definition.
 *   - **only the winners** — `resolvePrizeClaim` against `winnerUserIds`.
 *   - **not before it ends** — `eventEndsAt`, with unknown meaning "not ended".
 *   - **on the main shop only** — this component lives on the shop's PDP and
 *     ends in the shop's checkout. Nothing here is mounted by the events app.
 *
 * 🛑 THE BUTTON IS A HINT, NOT A GATE. There is deliberately no entitlement
 * logic here beyond deciding what to draw. What actually stops a non-winner is
 * the claim coupon's `restrictions.allowedUserIds`, enforced server-side —
 * anyone can type the checkout URL, and nobody can redeem someone else's
 * coupon. Adding a "real" client-side check here would create a second,
 * weaker authority for the same question, which is the mistake
 * `resolvePrizeClaim`'s header exists to make impossible.
 *
 * ⚠ DEGRADES TO NOTHING, STRUCTURALLY. It reads no event data over the network
 * and makes no Firestore call — every input arrives on the product row the PDP
 * had already read. So an unknown, deleted or unreachable event cannot 500 this
 * page or blank the listing; it simply yields no `eventEndsAt`, which the
 * resolver reports as `event-open` and this renders as no claim control.
 */
export function EventPrizeClaimPanel({
  productId,
  productTitle,
  productImage,
  price,
  storeId,
  storeName,
  winnerUserIds,
  eventEndsAt,
  showInPromotions,
  inStock,
}: EventPrizeClaimPanelProps) {
  const { user } = useAuth();
  const { requireAuth, isAuthResolving, modalOpen, modalMessage, closeModal } =
    useAuthGate();
  const checkout = useSingleItemCheckout({
    productId,
    productTitle,
    productImage,
    price,
    storeId,
    storeName,
  });

  /*
   * 🛑 `Date.now()` MUST NOT BE READ DURING RENDER. The server render and the
   * hydration render would disagree in the one second an event closes, and this
   * sits in the buy box — a text mismatch there is a hydration error on the
   * money path's own panel.
   *
   * `null` until mounted, and `null` renders NOTHING. That is not a compromise:
   * the claim decision is per-viewer and `SessionProvider` is mounted with
   * `initialUser={null}` (the locale layout is static and must stay that way),
   * so the signed-in answer was never available on the server anyway. Rendering
   * nothing first is strictly better than rendering a wrong reason and
   * correcting it a tick later — a non-winner would otherwise read "claims open
   * when the event closes" on a finished event, from a cached page.
   */
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  if (now === null) return null;

  const claim = resolvePrizeClaim({
    viewerUserId: user?.uid,
    winnerUserIds,
    eventEndsAt,
    now,
  });

  /*
   * ⚠ THE REASON IS ADVERTISING; THE BUTTON IS NOT. "This prize has been
   * awarded to 3 winners" published on a prize the admin has not announced
   * announces it — and `showInPromotions` exists precisely so that *"a prize can
   * be RECORDED before it is ANNOUNCED"*. So the explanatory text waits for the
   * announcement, while a WINNER's button does not: it is rendered only for the
   * one viewer it belongs to and publishes nothing to anyone else. Withholding
   * it would deny a real entitlement over a publicity flag.
   */
  const reasonIsPublic = showInPromotions === true;

  if (!claim.canClaim) {
    if (!reasonIsPublic || !claim.reason) return null;
    return (
      <Text size="xs" color="muted">
        {claim.reason}
      </Text>
    );
  }

  return (
    <>
      <LoginRequiredModal
        isOpen={modalOpen}
        onClose={closeModal}
        message={modalMessage}
      />
      <Stack gap="xs">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={!inStock || checkout.running || isAuthResolving}
          onClick={() =>
            /*
             * ✅ THE SAME SINGLE-ITEM LANE "Buy Now" USES — literally the same
             * function, not a copy of it. `useSingleItemCheckout` adds the line,
             * PUTs `CART_ENDPOINTS.SELECTION` with just that line's `itemId`,
             * fails closed if the scoping call fails, and only then routes to
             * checkout. A claimant's other saved items stay in their cart and
             * stay out of this order.
             *
             * ⚠ Gated through `requireAuth` even though `canClaim` already
             * implies a signed-in viewer: a session can expire between render
             * and click, and the login modal is a far better answer than
             * `useAddToCart` quietly falling back to the GUEST cart and the
             * scoping PUT then 401ing.
             */
            requireAuth(ACTION_ID.BUY_NOW, () => {
              void checkout.start();
            })
          }
        >
          {!inStock
            ? "Prize unavailable"
            : checkout.running
              ? "Loading…"
              : "Claim prize"}
        </Button>
        {/*
          The one thing a claimant needs to know before pressing it: this ends
          in the normal checkout, where the claim coupon is what makes it free.
          Saying so here is what keeps "Claim prize" from reading as a purchase.
        */}
        <Text size="xs" color="muted">
          You won this. Claiming takes you to checkout for this item only.
        </Text>
      </Stack>
    </>
  );
}
