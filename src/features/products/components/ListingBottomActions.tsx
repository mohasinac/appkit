"use client";

import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTION_META, MOBILE_PRIMARY_ACTIONS } from "../constants/action-defs";

/**
 * The sticky-CTA registrar shared by every listing type whose bottom bar is just
 * "primary CTA that scrolls to the buy/contact panel, plus a price label".
 *
 * Pre-order, prize-draw, classified, digital-code and live all fit that shape, which put
 * it well past the Rule of Three for a per-type copy. Auction and standard product keep
 * their own registrars — the auction ticks a live countdown into `secondaryLabel`, and
 * the product bar carries three buttons whose labels track cart/wishlist state.
 *
 * Renders nothing; it exists purely to register into `BottomActionsContext`.
 */
export interface ListingBottomActionsProps {
  /** Selects the CTA set from the ACTIONS registry (Rule #7 — never inline actions). */
  listingType: keyof typeof MOBILE_PRIMARY_ACTIONS;
  /** `id` of the element the CTA scrolls to. */
  anchorId: string;
  price: number | null;
  currency: string;
  /**
   * Register nothing at all — for ended/closed/sold-out listings, matching how the
   * auction and prize-draw registrars bail out.
   */
  unavailable?: boolean;
  /** Appended after the formatted price, e.g. "per entry". */
  infoSuffix?: string;
}

export function ListingBottomActions({
  listingType,
  anchorId,
  price,
  currency,
  unavailable = false,
  infoSuffix,
}: ListingBottomActionsProps) {
  const actionIds = MOBILE_PRIMARY_ACTIONS[listingType] ?? [];

  const infoLabel =
    price !== null
      ? `${formatCurrency(price, currency)}${infoSuffix ? ` ${infoSuffix}` : ""}`
      : undefined;

  useBottomActions(
    unavailable
      ? {}
      : {
          actions: actionIds.map((id) => ({
            ...ACTION_META[id],
            onClick: () => {
              document
                .getElementById(anchorId)
                ?.scrollIntoView({ behavior: "smooth" });
            },
          })),
          infoLabel,
          desktop: "after-scroll" as const,
        },
  );

  return null;
}
