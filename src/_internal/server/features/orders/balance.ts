/**
 * D55 — collecting a pre-order balance.
 *
 * ## 🛑 `balanceDue` has been computed and rendered since Part 2, and
 * nothing has ever collected it
 *
 * `OrderSourcePreOrder.balanceDue` is written at order creation and
 * `OrderProvenanceCard` prints it — so `/user/pre-orders` has been
 * advertising a figure the product has no way to accept. That is worse than
 * omitting it: a buyer who sees "Balance due ₹4,000" and finds no control
 * reasonably concludes the site is broken, and a seller waiting on it has no
 * mechanism to chase.
 *
 * ## Manual only, and that is a decision rather than a stopping point
 *
 * The manual path needs no mandate, no scheduled debit and no account
 * change, so it is what makes the balance payable AT ALL today. The auto
 * path is blocked on RBI requirements and on Razorpay recurring being
 * enabled against live keys — see the schema's own note, which declares the
 * union so adding `auto` is a compile-checked change.
 *
 * ## 🛑 It reuses the manual-payment REVIEW flow and none of its STORAGE
 *
 * The vocabulary is the same (submit a proof, an admin approves or rejects
 * with a note) and the fields are separate, because a pre-order has two
 * payments months apart. Writing the balance's proof over the deposit's
 * would destroy the evidence for the payment that created the order — and
 * `paymentWindowTimeout`, which sweeps `pending`/`pending` orders with no
 * `paymentProofUrl`, would then cancel and restock a paid one.
 */

import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import { ValidationError } from "../../../../errors/validation-error";
import { NotFoundError } from "../../../../errors/not-found-error";
import { AuthorizationError } from "../../../../errors/authorization-error";
import { storeRepository } from "../../../../features/stores/repository/store.repository";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { serverLogger } from "../../../../monitoring/server-logger";
import { formatMoney } from "../../../../utils/number.formatter";


/*
 * 🛑 ONE message, for the same reason the ads collector names its own: an
 * order that is not the caller's answers 404 rather than 403, so "no such
 * order" and "not yours" must read identically. Two matching literals are a
 * coincidence; a constant is the rule.
 */
const ORDER_NOT_FOUND = "Order not found.";
/**
 * How long a buyer gets, once the balance is opened for collection.
 *
 * 🛑 Days, not the 15 MINUTES the deposit window uses. That window exists to
 * stop an unpaid order holding stock; this one is a bill falling due on goods
 * that have arrived, and the buyer may legitimately need to move money. A
 * 15-minute balance window would cancel real orders for no benefit.
 */
export const BALANCE_WINDOW_DAYS = 7;

/** The balance a pre-order still owes, or `null` when it is not one. */
export function balanceDueOn(order: OrderDocument): number | null {
  const ctx = order.sourceContext;
  if (!ctx || ctx.path !== "pre-order") return null;
  return ctx.balanceDue > 0 ? ctx.balanceDue : null;
}

/**
 * Open the balance for collection — the seller's "the goods have landed"
 * signal.
 *
 * 🛑 **Opening is an EVENT, not a derived state.** The balance could be
 * computed as payable the moment the order exists, and that would be wrong:
 * a pre-order's whole premise is that the goods do not exist yet, so asking
 * for the balance before they do is asking a buyer to fund inventory. The
 * seller opens it when stock arrives, and `dueBy` runs from that moment.
 *
 * 🛑 Idempotent. A seller clicking twice must not restart the buyer's
 * window — which, since `dueBy` is what a reminder and any future
 * auto-cancel would read, would silently extend the deadline every time
 * anyone touched the button.
 *
 * 🛑 **Ownership is checked HERE, and it has to be**: the route that calls
 * this is role-gated to sellers, and every seller passes that gate. Without
 * this block any seller could open — and therefore start the payment clock
 * on, and notify the buyer about — another seller's pre-order.
 *
 * It was missing, and the reason it was invisible is worth recording: the
 * route also carried `permission: "orders:write"` alongside a `roles` array
 * holding `seller`, which `getServerPermissions()` resolves for `employee`
 * only — so every seller got a 403 before reaching this function at all. A
 * broken gate masked an absent one, exactly as in Root Cause #98.
 */
export async function openBalanceCollection(
  orderId: string,
  actor: { uid: string; role: string },
  now: Date = new Date(),
): Promise<OrderDocument> {
  const order = (await orderRepository.findById(orderId)) as OrderDocument | null;
  if (!order) throw new NotFoundError(ORDER_NOT_FOUND);

  /*
   * 🛑 `order.storeId` is the store SLUG, never the seller's Firebase UID —
   * two namespaces by design (§ "Store Identity Architecture"). Comparing it
   * to `actor.uid` returns false for every legitimate seller, which is the
   * other half of Root Cause #98. Resolve the store first.
   */
  if (actor.role !== "admin") {
    const store = await storeRepository.findByOwnerId(actor.uid);
    if (!store || order.storeId !== store.id) {
      throw new AuthorizationError("You do not own this order");
    }
  }

  const due = balanceDueOn(order);
  if (due == null) {
    throw new ValidationError("This order has no pre-order balance.", {
      orderId: "Only a pre-order carries a balance.",
    });
  }
  if (order.balance) return order; // already open — see the idempotency note.

  const dueBy = new Date(now.getTime() + BALANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  await orderRepository.update(orderId, {
    balance: {
      /*
       * 🛑 Snapshotted HERE, from `sourceContext`, and never read live
       * again. The gap between deposit and balance is months — the worst in
       * the codebase for D61 — so a price or tax change in between must not
       * move what the buyer was told they owe.
       */
      amount: due,
      method: "manual",
      status: "awaiting",
      dueBy,
    },
  } as never);

  await sendNotification({
    userId: order.userId,
    type: "order_confirmed",
    priority: "high",
    title: "Your pre-order balance is due",
    message: `The balance of ${formatMoney(due)} on order ${orderId} is now payable. Your item is ready to ship once it clears.`,
    relatedId: orderId,
    relatedType: "order",
  });

  return { ...order, balance: { amount: due, method: "manual", status: "awaiting", dueBy } };
}

/**
 * The buyer submits a proof.
 *
 * 🛑 Allowed from `awaiting` AND from `rejected`. A rejected proof is the
 * commonest reason to need a second attempt — a blurred screenshot, the
 * wrong reference — and locking the buyer out after one rejection turns a
 * recoverable mistake into a support ticket.
 */
export async function submitBalanceProof(
  orderId: string,
  buyerUid: string,
  proofUrl: string,
  transactionId: string,
  now: Date = new Date(),
): Promise<void> {
  const order = (await orderRepository.findById(orderId)) as OrderDocument | null;
  if (!order) throw new NotFoundError(ORDER_NOT_FOUND);
  /*
   * 🛑 Ownership checked against `userId`, which is the buyer field on
   * `OrderDocument` — NOT `buyerId`, which does not exist. A query or guard
   * written against `buyerId` returns nothing and raises nothing, which is
   * indistinguishable from "not your order" (CLAUDE.md records this costing
   * real time once already).
   */
  if (order.userId !== buyerUid) {
    throw new NotFoundError(ORDER_NOT_FOUND);
  }
  if (!order.balance) {
    throw new ValidationError("No balance has been opened on this order yet.", {
      orderId: "The seller opens the balance when the goods arrive.",
    });
  }
  if (order.balance.status === "paid") {
    throw new ValidationError("This balance is already paid.", {
      orderId: "Nothing further is owed.",
    });
  }
  if (order.balance.status === "submitted") {
    throw new ValidationError("A proof is already awaiting review.", {
      orderId: "Wait for the current one to be reviewed before sending another.",
    });
  }
  if (!transactionId.trim()) {
    throw new ValidationError("Enter the transaction reference.", {
      transactionId: "The UTR or reference from your bank or UPI app.",
    });
  }

  await orderRepository.update(orderId, {
    balance: {
      ...order.balance,
      status: "submitted",
      proofUrl,
      transactionId: transactionId.trim(),
      submittedAt: now,
      /*
       * 🛑 The previous rejection's note is CLEARED on resubmission. Leaving
       * it would show the buyer a stale "your proof was unreadable" beside a
       * proof they have just replaced.
       */
      reviewNote: undefined,
    },
  } as never);
}

/**
 * An admin approves or rejects the balance proof.
 *
 * 🛑 A rejection REQUIRES a note, for the same reason a reversal does: the
 * buyer has to know what to send instead, and "rejected" alone guarantees
 * the next attempt is the same proof again.
 */
export async function reviewBalanceProof(
  orderId: string,
  reviewerUid: string,
  approve: boolean,
  note?: string,
  now: Date = new Date(),
): Promise<void> {
  const order = (await orderRepository.findById(orderId)) as OrderDocument | null;
  if (!order) throw new NotFoundError(ORDER_NOT_FOUND);
  if (order.balance?.status !== "submitted") {
    throw new ValidationError("There is no submitted balance proof to review.", {
      orderId: `The balance is "${order.balance?.status ?? "not opened"}".`,
    });
  }
  if (!approve && !note?.trim()) {
    throw new ValidationError("A rejection needs a reason.", {
      note: "Say what was wrong, or the buyer will send the same proof again.",
    });
  }

  await orderRepository.update(orderId, {
    balance: {
      ...order.balance,
      status: approve ? "paid" : "rejected",
      reviewedBy: reviewerUid,
      reviewedAt: now,
      ...(note?.trim() ? { reviewNote: note.trim() } : {}),
    },
  } as never);

  /*
   * 🛑 The LEDGER is not posted here, and that is deliberate.
   *
   * A balance payment is a second capture against an order whose sale was
   * already posted in full at creation — `orderPlacedPosting` recognises the
   * whole `totalPrice`, not the deposit. Posting again would double the
   * sale. What actually changes is which asset holds the money, and that is
   * the settlement's job: the gateway receivable clears when the settlement
   * lands, exactly as it does for a single-payment order.
   *
   * Recording this is left to whoever wires the deposit/balance split into
   * `orderPlacedPosting`, which is a change to that rule rather than an
   * extra entry here. An extra entry would balance and be wrong, which is
   * the failure mode Part 4's whole design is about.
   */
  serverLogger.info("balance proof reviewed", {
    orderId,
    approved: approve,
    reviewerUid,
  });

  await sendNotification({
    userId: order.userId,
    type: approve ? "order_confirmed" : "payment_review",
    priority: "high",
    title: approve ? "Balance received" : "We could not accept your payment proof",
    message: approve
      ? `Your balance on order ${orderId} has been confirmed. It is ready to ship.`
      : `Your balance proof on order ${orderId} was not accepted: ${note?.trim() ?? ""}`,
    relatedId: orderId,
    relatedType: "order",
  });
}
