"use client";

import { useState } from "react";
import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { useCanSeePrices } from "../../../react/hooks/useCanSeePrices";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTION_ID, ACTION_META } from "../../products/constants/action-defs";
import { useCountdown, type CountdownRemaining } from "../../../react";
import { Modal } from "../../../ui";
import { isBuyNowAvailable } from "../../../_internal/shared/features/auctions/config";
import {
  PlaceBidFormClient,
  type PlaceBidFormClientProps,
} from "./PlaceBidFormClient";

export interface AuctionBottomActionsProps extends PlaceBidFormClientProps {
  bidCount: number;
}

function formatCountdownLabel(
  remaining: CountdownRemaining | null,
): string | undefined {
  if (!remaining) return undefined;
  const { days, hours, minutes, seconds } = remaining;
  if (days > 0) return `Ends in ${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `Ends in ${hours}h ${minutes}m ${seconds}s`;
  return `Ends in ${minutes}m ${seconds}s`;
}

/**
 * Mobile/after-scroll CTA bar for an auction.
 *
 * 🛑 It owns its own modal rather than pointing at one.
 *
 * Two defects lived here. (a) The single Place Bid action ran
 * `getElementById("auction-bid-form")?.scrollIntoView(...)` — but that id is
 * set inside `renderBidForm`, which `AuctionDetailView` wraps in
 * `hidden lg:block`. On mobile the target is `display:none`, so the bar's only
 * action did nothing on the only viewport the bar exists for. A DOM id is not
 * a contract; the element it names can be hidden, moved or removed without any
 * signal here. (b) There was no Buy Now action at all, even though
 * `MOBILE_PRIMARY_ACTIONS.auction` has declared `[PLACE_BID, BUY_NOW_AUCTION]`
 * for a long time — a declared CTA nothing rendered (Root Cause #8's shape).
 *
 * Both actions now open the real form, which is the only place the Buy Now
 * button can report an error or route to `/checkout?lane=auction`.
 */
export function AuctionBottomActions(props: AuctionBottomActionsProps) {
  const { currentBid, currency, bidCount, isEnded, auctionEndDate, buyNowPrice } =
    props;
  const [open, setOpen] = useState(false);
  const remaining = useCountdown(auctionEndDate ?? undefined);
  const { canSeePrices } = useCanSeePrices();

  const placeBidMeta = ACTION_META[ACTION_ID.PLACE_BID];
  const buyNowMeta = ACTION_META[ACTION_ID.BUY_NOW_AUCTION];

  // Same single predicate the form and the card use. `!!props.onBuyNow` matters
  // because the preview/demo mount passes no action.
  const buyNowAvailable =
    isBuyNowAvailable({ buyNowPrice, currentBid, isEnded }) && !!props.onBuyNow;

  useBottomActions(
    isEnded
      ? {}
      : {
          actions: [
            { ...placeBidMeta, onClick: () => setOpen(true) },
            ...(buyNowAvailable && buyNowPrice !== null
              ? [
                  {
                    ...buyNowMeta,
                    // Both of these are plain strings on the bottom bar rather
                    // than slots, so the gate happens as they are built.
                    label: canSeePrices
                      ? `Buy Now — ${formatCurrency(buyNowPrice, currency)}`
                      : "Buy Now",
                    onClick: () => setOpen(true),
                  },
                ]
              : []),
          ],
          secondaryLabel: formatCountdownLabel(remaining),
          infoLabel: canSeePrices
            ? `${formatCurrency(currentBid, currency)} · ${bidCount} bid${bidCount !== 1 ? "s" : ""}`
            : `Sign in to see the bid · ${bidCount} bid${bidCount !== 1 ? "s" : ""}`,
          desktop: "after-scroll" as const,
        },
  );

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      size="md"
      title="Place your bid"
    >
      <PlaceBidFormClient {...props} />
    </Modal>
  );
}
