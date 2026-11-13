/**
 * A prize listing cannot be bought without the win ticket that entitles it.
 *
 * Owner, 2026-11-13: *"the prizes are 0 only, but a claim on it needs that
 * coupons as win ticket"* and *"else it is blocked from purchase."*
 *
 * ## 🛑 THIS IS THE WHOLE FEATURE, AND WITHOUT IT A PRIZE IS FREE
 *
 * A prize listing is priced **₹0**. Every other part of the prize work —
 * the badge, the Prizes tab, the claim panel, the ticket issuance — only
 * ADVERTISES or AUTHORISES. None of them stops a purchase. So until this gate
 * exists, anyone who finds a prize listing's URL can check it out for nothing,
 * repeatedly, until its stock is gone.
 *
 * ⚠ The affordance cannot be the control. `resolvePrizeClaim` decides whether
 * the Claim button draws; a buyer who types the URL never sees that code. The
 * coupon's `allowedUserIds` stops a non-winner REDEEMING A TICKET, but it has
 * nothing to say about a buyer who presents NO ticket at all — which is exactly
 * the hole, because a ₹0 item needs no discount to be worth taking.
 *
 * ## Where it runs
 *
 * Cart-wide, BEFORE any stock is touched — the same position and the same
 * reasoning as the platform payment ceiling: a refusal that happens after a
 * reservation has to undo it, and the undo is the part that breaks.
 */

/** The minimum a cart line must tell this gate. */
export interface PrizeGateItem {
  productId: string;
  /** Present ⇒ this listing IS a prize and is claim-only. */
  isEventPrize: boolean;
  /** For the message only — never part of the decision. */
  productTitle?: string;
  /** How many units the cart asks for. Absent ⇒ 1. */
  quantity?: number;
  /**
   * The listing's own value, for tickets that carry a ceiling.
   *
   * ⚠ Supplied by the caller rather than read here — this module is pure. 🛑
   * An ABSENT value cannot satisfy a ceiling: a caller that forgets to pass it
   * gets a refusal, never an unbounded match. The prize is ₹0 at checkout, so
   * this is the listing's NOMINAL worth (what the win was "for"), not its
   * price.
   */
  itemValue?: number;
}

/** A ticket the buyer has applied to this cart. */
export interface PrizeGateTicket {
  /** Product ids this ticket entitles (`restrictions.applicableProducts`). */
  applicableProducts: readonly string[];
  /**
   * A VALUE CEILING instead of a fixed product set — for a generic prize.
   *
   * Owner: *"if in future we decide to do a more generic prize like anything
   * from the listing store under 10k, then that is meaningful for them"*, and
   * *"10k is a number I spouted, it has to be properly configured."*
   *
   * 🛑 A ticket with a ceiling entitles ANY prize listing at or under it, so
   * `applicableProducts` may legitimately be empty on one. That is the ONLY
   * case where empty is permitted — for every other ticket an empty product
   * list means unscoped, which on ₹0 listings is the whole catalogue.
   *
   * ⚠ The ceiling is compared against the listing's OWN value, which the
   * caller supplies per item. The gate never reads a product itself: it is a
   * pure function and must stay one, so a caller that forgets the value gets
   * a REFUSAL rather than a free pass.
   */
  maxItemValue?: number;
  /** Uids permitted to redeem (`restrictions.allowedUserIds`). */
  allowedUserIds?: readonly string[];
  /** How many units the win is worth. Absent ⇒ 1. */
  claimQuantity?: number;
}

export interface PrizeGateInput {
  items: readonly PrizeGateItem[];
  /** Tickets applied to this cart, already fetched by the caller. */
  tickets: readonly PrizeGateTicket[];
  /** The buyer's uid, from the SESSION. `undefined` ⇒ not identified. */
  buyerUserId?: string | undefined;
}

export interface PrizeGateRefusal {
  productId: string;
  productTitle?: string | undefined;
  reason: "no-ticket" | "ticket-not-yours" | "unidentified-buyer" | "over-entitlement";
  message: string;
}

/**
 * Which prize lines may NOT be purchased. Empty ⇒ nothing is blocked.
 *
 * 🛑 FAILS CLOSED in every direction. A line is permitted only when a ticket
 * positively entitles it; absence of evidence refuses. The alternative —
 * "allow unless we can prove otherwise" — hands out stock whenever a read
 * fails, which on a ₹0 listing is the entire prize pool.
 */
export function refusedPrizeLines(input: PrizeGateInput): PrizeGateRefusal[] {
  const refusals: PrizeGateRefusal[] = [];

  for (const item of input.items) {
    if (!item.isEventPrize) continue;

    /*
     * 🛑 An unidentified buyer can never hold a ticket, so this is refused
     * before the ticket search rather than falling through it. Stated as its
     * own reason because the remedy differs — sign in, rather than "you did
     * not win".
     */
    if (!input.buyerUserId) {
      refusals.push({
        productId: item.productId,
        productTitle: item.productTitle,
        reason: "unidentified-buyer",
        message: "Sign in with the account that won this prize to claim it.",
      });
      continue;
    }

    /*
     * A ticket entitles this line EITHER by naming it OR by covering its
     * value. Two shapes, one predicate, so a generic prize and a fixed one
     * cannot drift into two gates.
     *
     * 🛑 The ceiling arm requires BOTH a ceiling on the ticket AND a value on
     * the item. A ticket with a ceiling and an item with no value is NOT a
     * match — otherwise forgetting to pass `itemValue` would turn every
     * ceiling ticket into a pass for the entire catalogue, which is the
     * failure the whole gate exists to prevent.
     */
    const entitling = input.tickets.filter((t) => {
      if (t.applicableProducts.includes(item.productId)) return true;
      const ceiling = t.maxItemValue;
      if (!Number.isFinite(ceiling) || (ceiling as number) <= 0) return false;
      if (!Number.isFinite(item.itemValue)) return false;
      return (item.itemValue as number) <= (ceiling as number);
    });

    if (entitling.length === 0) {
      refusals.push({
        productId: item.productId,
        productTitle: item.productTitle,
        reason: "no-ticket",
        message:
          "This item is an event prize and can only be claimed with the winning ticket issued to its winner.",
      });
      continue;
    }

    /*
     * ⚠ Belt AND braces. `_fetchAndValidateCoupon` already refuses a ticket
     * whose `allowedUserIds` excludes the redeemer, so reaching here with
     * someone else's ticket should be impossible. It is checked anyway because
     * this gate must not depend on another gate having run — the two are
     * reached by different call paths, and "the other one covers it" is how
     * both end up covering nothing.
     *
     * 🛑 An EMPTY `allowedUserIds` does NOT mean "anyone" here. For an ordinary
     * coupon it does, which is correct and deliberate; for a win ticket it
     * means the ticket was issued without a holder, and an unbound ticket on a
     * ₹0 item is a free pass. Treated as not-yours.
     */
    const mine = entitling.some(
      (t) => (t.allowedUserIds?.length ?? 0) > 0 && t.allowedUserIds!.includes(input.buyerUserId!),
    );

    if (!mine) {
      refusals.push({
        productId: item.productId,
        productTitle: item.productTitle,
        reason: "ticket-not-yours",
        message: "This winning ticket belongs to a different account.",
      });
      continue;
    }

    /*
     * ── HOW MANY THE WIN IS WORTH ───────────────────────────────────────
     *
     * ⚠ Checked HERE rather than in a second mechanism. An earlier draft
     * documented CLAMPING the quantity instead — rejected because silently
     * reducing 3 to 1 on a FREE item reads as a bug, and a buyer who meant to
     * claim three cannot tell whether the other two failed or were never
     * allowed. Refusing with the entitled number says exactly what happened.
     *
     * 🛑 And one gate, not two: a quantity rule living somewhere else is the
     * drift this codebase keeps closing.
     */
    const asked = Number.isFinite(item.quantity) && (item.quantity as number) > 0
      ? Math.floor(item.quantity as number)
      : 1;
    /*
     * 🛑 Derived from `entitling` — the tickets ALREADY matched above — not by
     * re-matching. An earlier version called `entitledQuantity(productId, …)`,
     * which matches by product id only, so a CEILING ticket (empty
     * `applicableProducts`) always scored 0 and every generic prize was
     * refused as over-entitlement. The ceiling arm was unusable and two
     * assertions caught it.
     *
     * ⚠ And my comment at the time called that narrowing "deliberate", which
     * was rationalising a bug rather than describing a decision. One predicate,
     * evaluated once: the matching tickets are right here.
     */
    const allowed = entitling.reduce((max, t) => {
      const q = Number.isFinite(t.claimQuantity) && (t.claimQuantity as number) > 0
        ? Math.floor(t.claimQuantity as number)
        : 1;
      return q > max ? q : max;
    }, 0);
    if (asked > allowed) {
      refusals.push({
        productId: item.productId,
        productTitle: item.productTitle,
        reason: "over-entitlement",
        message: allowed === 1
          ? "Your winning ticket covers 1 of this prize."
          : `Your winning ticket covers ${allowed} of this prize.`,
      });
    }
  }

  return refusals;
}

/**
 * How many units of a prize a buyer's ticket entitles.
 *
 * Used BY `refusedPrizeLines` for the over-entitlement refusal, and exported so
 * a UI can show "covers N" without duplicating the arithmetic.
 *
 * ⚠ This comment previously said *"the caller clamps the quantity rather than
 * refusing the line"* — which was true of an earlier draft and became FALSE
 * when the check moved into the gate. Left as a note because a doc comment that
 * describes behaviour the code no longer has is the drift this codebase keeps
 * closing, and it survived one review here.
 *
 * Absent `claimQuantity` ⇒ 1. 🛑 Never unlimited: an unspecified quantity on a
 * ₹0 item is the same hole as no ticket at all.
 */
export function entitledQuantity(
  productId: string,
  tickets: readonly PrizeGateTicket[],
  buyerUserId: string | undefined,
): number {
  if (!buyerUserId) return 0;
  let max = 0;
  for (const t of tickets) {
    /* Same two-shape predicate as the gate. ⚠ The ceiling arm needs the
       item value, which this signature does not take — so a ceiling ticket
       is only counted when it NAMES the product. A caller wanting the
       ceiling arm passes the value through `refusedPrizeLines`, which has
       it. Deliberately narrower rather than silently permissive. */
    if (!t.applicableProducts.includes(productId)) continue;
    if (!(t.allowedUserIds?.length ?? 0)) continue;
    if (!t.allowedUserIds!.includes(buyerUserId)) continue;
    const q = Number.isFinite(t.claimQuantity) && (t.claimQuantity as number) > 0
      ? Math.floor(t.claimQuantity as number)
      : 1;
    if (q > max) max = q;
  }
  return max;
}
