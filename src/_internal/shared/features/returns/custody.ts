/**
 * Return custody — C5g. Where a returned parcel is, and who owns the next step.
 *
 * ## 🛑 The gap this closes, measured
 *
 * `OrderStatus` has exactly TWO return states: `return_requested` → `returned`.
 * There is no `returnAddress`, no `rmaNumber` and no inspection field anywhere
 * on `OrderDocument` (grepped: zero hits). So a buyer whose return is approved
 * today is told nothing about where to send the item, and the status jumps from
 * "requested" straight to "returned" with no custody in between.
 *
 * Two statuses cannot express *"the buyer posted it and we have not received
 * it"*, which is the single most-asked question in any returns flow. And that
 * gap exists on the ORDINARY seller path too, not only on protected claims —
 * a return with no address is unactionable for either party, which is why this
 * is worth closing regardless of whether escrow ever ships.
 *
 * ## 🛑 Why a SUB-STATUS and not five new `OrderStatus` members
 *
 * The plan left this open as "a schema decision worth taking deliberately".
 * Taken: custody is its own field, and `OrderStatus` keeps its two values.
 *
 *   1. `OrderStatus` drives every order surface — nine status chips, the
 *      Active/Closed scope map (`Record<OrderStatus, …>`), badges, filters,
 *      `mergeOrderScopeFilter`. Five new members would appear in all of them
 *      while applying only to a return, and all five would map to "Active",
 *      so they would add a chip and no information.
 *   2. A return is a SUB-PROCESS of an order, not a phase of it. The order's
 *      own fact is "a return is in progress"; the rest belongs to the return.
 *   3. It composes with what is already per-item. `OrderDocumentItem` already
 *      carries `cancelledQuantity`, so partial returns are an item-level idea —
 *      and an order-level status could never express two items in different
 *      custody states.
 *
 * And NOT a separate `returns` collection either, which was the third option:
 * that would make a fourth place order state lives (the order, its items, its
 * `statusHistory`, and a return document), and the first three already have to
 * agree.
 */

/**
 * The custody chain. Ordered, and the order is load-bearing — `canAdvance`
 * reads it rather than hand-listing transitions.
 */
export const RETURN_CUSTODY_STATES = [
  /** The buyer asked. Nobody has agreed to anything yet. */
  "requested",
  /** Approved, and the buyer has been given a destination. */
  "approved",
  /** The buyer says they have posted it. Our records show nothing yet. */
  "in_transit",
  /** It physically arrived, wherever it was routed to. */
  "received",
  /** A human has opened it and recorded a finding. */
  "inspected",
  /** Refund (or refusal) issued; money has moved. */
  "resolved",
] as const;

export type ReturnCustodyState = (typeof RETURN_CUSTODY_STATES)[number];

/**
 * 🛑 A `Record<ReturnCustodyState, …>`, so a seventh state cannot compile
 * without someone answering what the buyer is told during it.
 *
 * The copy matters more than it looks: `in_transit` is the state that exists
 * ENTIRELY so a buyer who has posted something is not shown "requested" for a
 * week, and a label that does not say "we have not received it yet" wastes the
 * state.
 */
export const RETURN_CUSTODY_COPY: Record<
  ReturnCustodyState,
  { label: string; buyerNote: string }
> = {
  requested: {
    label: "Return requested",
    buyerNote: "We have your request. You will get a return address once it is approved.",
  },
  approved: {
    label: "Return approved",
    buyerNote: "Approved. Post the item to the address below, then mark it as sent.",
  },
  in_transit: {
    label: "On its way back",
    buyerNote: "You have marked this as posted. We have not received it yet.",
  },
  received: {
    label: "Received",
    buyerNote: "It arrived. We are checking it now.",
  },
  inspected: {
    label: "Checked",
    buyerNote: "We have checked the item. Your refund is being processed.",
  },
  resolved: {
    label: "Return complete",
    buyerNote: "Done — see the refund on this order.",
  },
};

/** Terminal: nothing follows `resolved`. */
export function isTerminalCustody(state: ReturnCustodyState): boolean {
  return state === "resolved";
}

/**
 * Whether `next` may follow `current`.
 *
 * 🛑 Strictly forward, one step at a time, and that is deliberate rather than
 * lazy. A flow that permits skipping lets `approved → resolved` refund an item
 * nobody ever received, which is the exact shape of the fraud
 * `return_swap_fraud` describes; and a flow that permits going backwards lets a
 * seller un-receive a parcel to re-open a settled inspection.
 *
 * The one exception is the identity transition, which is allowed so an
 * idempotent writer (a retry, a double-clicked button) is a no-op rather than
 * an error.
 */
export function canAdvanceCustody(
  current: ReturnCustodyState,
  next: ReturnCustodyState,
): boolean {
  if (current === next) return true;
  const i = RETURN_CUSTODY_STATES.indexOf(current);
  const j = RETURN_CUSTODY_STATES.indexOf(next);
  if (i < 0 || j < 0) return false;
  return j === i + 1;
}

/** The next state, or `null` at the end of the chain. */
export function nextCustodyState(current: ReturnCustodyState): ReturnCustodyState | null {
  const i = RETURN_CUSTODY_STATES.indexOf(current);
  if (i < 0 || i === RETURN_CUSTODY_STATES.length - 1) return null;
  return RETURN_CUSTODY_STATES[i + 1]!;
}

/**
 * Who owns the next action.
 *
 * 🛑 This is the half of C5g that CLAUDE.md gets wrong today. It records
 * `return_requested` as deliberately in the *Active* order scope because it is
 * "the seller's next action item" — and with warehouse routing that is no
 * longer true for an untrusted seller's protected claim: it is OUR action item
 * until inspection completes. A queue that shows it as the seller's is a queue
 * where returns sit waiting on us.
 *
 * `buyer` during `approved`/`in_transit` is not a formality either — the buyer
 * is the only party who can post the parcel, and showing a seller an action
 * they cannot take is how a return stalls with everyone waiting.
 */
export function custodyOwner(
  state: ReturnCustodyState,
  destination: "warehouse" | "seller",
): "buyer" | "seller" | "platform" {
  switch (state) {
    case "requested":
      // Whoever will receive it decides whether to accept it.
      return destination === "warehouse" ? "platform" : "seller";
    case "approved":
    case "in_transit":
      return "buyer";
    case "received":
    case "inspected":
      return destination === "warehouse" ? "platform" : "seller";
    case "resolved":
      // Nothing to do. Reported as the platform's so a stale queue entry is
      // ours to clear rather than a seller's to wonder about.
      return "platform";
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

/**
 * Whether this custody state should appear in a WORK QUEUE for `viewer`.
 *
 * Deliberately not `custodyOwner(...) === viewer`: `resolved` belongs to nobody
 * and must leave every queue, and a terminal row in a queue is how a queue
 * stops being read.
 */
export function isActionableBy(
  state: ReturnCustodyState,
  destination: "warehouse" | "seller",
  viewer: "buyer" | "seller" | "platform",
): boolean {
  if (isTerminalCustody(state)) return false;
  return custodyOwner(state, destination) === viewer;
}
