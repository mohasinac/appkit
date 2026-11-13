/**
 * Sale protection — what is covered for free, and what a buyer is told when it
 * is not.
 *
 * Owner, 2026-11-13: *"if items are already more than a threshold, say 2k,
 * show the insurance is advised else loss won't be covered by the seller or
 * the platform; items are covered automatically till 2k and more is the add-on
 * needed."* And separately: *"for the shipping add-on, if it is not opted tell
 * them the risks clearly, and make sure the invoice generated has that."*
 *
 * 🛑 THIS MODULE DECIDES A DISCLOSURE, NOT A CHARGE. It never prices anything
 * and never gates checkout — `saleProtectionFee*` already owns the money. What
 * it answers is "is this parcel riding uncovered, and has the buyer been told
 * plainly?", which is the half that turns a lost-parcel argument into a
 * documented decision.
 */

/** Everything the decision needs. All of it is already on the checkout. */
export interface AutoCoverInput {
  /** The order's goods value — NOT a single line's price. See below. */
  orderGoodsValue: number;
  /**
   * The configured free-cover ceiling (`commissions.saleProtectionAutoCoverLimit`).
   *
   * 🛑 `undefined` must behave as ZERO, never as "everything is covered". An
   * unreadable config promising free cover on every order is the money-path
   * direction this codebase refuses everywhere else: unknown → the
   * conservative answer, and here the conservative answer is "not covered",
   * because over-disclosing a risk costs nothing and under-disclosing it is
   * what gets argued about after a parcel vanishes.
   */
  autoCoverLimit: number | undefined;
  /** Did the buyer actually buy protection for this order? */
  protectionPurchased: boolean;
  /**
   * Does the SELLER offer it at all (`store.supportsSaleProtection`)?
   *
   * ⚠ Absent means NOT offered — the store schema says so explicitly, and the
   * two flags default opposite ways on purpose: the platform's
   * `saleProtectionFeeEnabled` means "we built this", the seller's means "I
   * have agreed to be held to it".
   */
  sellerOffersProtection: boolean;
}

export type AutoCoverState =
  /** At or under the ceiling — covered, nothing to buy, nothing to warn about. */
  | "auto-covered"
  /** Over the ceiling and protection was bought. */
  | "protected"
  /** Over the ceiling, protection available, NOT bought — advise. */
  | "uncovered-available"
  /** Over the ceiling and the seller does not offer it — advise, differently. */
  | "uncovered-unavailable";

export interface AutoCoverDecision {
  state: AutoCoverState;
  /** True whenever the buyer must be shown the risk before paying. */
  requiresDisclosure: boolean;
  /**
   * The disclosure itself, plain and in the buyer's terms.
   *
   * 🛑 Carried HERE rather than written at each render site, because this text
   * must also reach the INVOICE — the owner asked for exactly that — and a
   * second copy written in the invoice template is how the two drift until the
   * document contradicts the screen it came from.
   */
  message?: string;
}

/**
 * ⚠ Compared against the ORDER's goods value, never a single line.
 *
 * A cart of ten ₹500 items is a ₹5,000 parcel to a courier, and the PARCEL is
 * what gets lost. Comparing per item would leave the most valuable shipments
 * uncovered precisely because each individual piece looked cheap — the exact
 * inversion of what the threshold is for.
 */
export function resolveAutoCover(input: AutoCoverInput): AutoCoverDecision {
  const limit = Number.isFinite(input.autoCoverLimit) ? (input.autoCoverLimit as number) : 0;
  const value = Number.isFinite(input.orderGoodsValue) ? input.orderGoodsValue : 0;

  if (value <= limit) {
    return { state: "auto-covered", requiresDisclosure: false };
  }

  if (input.protectionPurchased) {
    return { state: "protected", requiresDisclosure: false };
  }

  /*
   * Over the ceiling and unprotected. The two arms say different things
   * because the buyer's OPTIONS differ, and telling someone to buy cover that
   * is not on offer is worse than telling them nothing — it reads as a fault
   * in the page rather than a property of the order.
   */
  if (input.sellerOffersProtection) {
    return {
      state: "uncovered-available",
      requiresDisclosure: true,
      message:
        `Orders above ${formatLimit(limit)} are not covered automatically. ` +
        `Protection is strongly advised — without it, neither the seller nor the ` +
        `platform covers loss or damage in transit for this order.`,
    };
  }

  return {
    state: "uncovered-unavailable",
    requiresDisclosure: true,
    message:
      `Orders above ${formatLimit(limit)} are not covered automatically, and this ` +
      `seller does not offer protection. Loss or damage in transit for this order ` +
      `is not covered by the seller or the platform.`,
  };
}

/**
 * ⚠ Rupees, whole, with a separator — the figure appears on an invoice as well
 * as a screen, and a bare `2000` there reads as a quantity rather than money.
 */
function formatLimit(limit: number): string {
  return `₹${Math.round(limit).toLocaleString("en-IN")}`;
}
