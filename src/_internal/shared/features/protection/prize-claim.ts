/**
 * Who may claim an event prize, and when.
 *
 * Owner, 2026-11-13: *"event claims go to the checkout like buy now on claims,
 * all can see, only the winners can claim if multiple, and on the main shop
 * only not from the events."*
 *
 * Four rules, and each one is a separate failure if it is missed:
 *
 *   1. EVERYONE sees the prize. The prize is advertising — hiding it from
 *      non-winners hides it from the people the event is trying to attract.
 *   2. Only a WINNER may claim, and there may be several.
 *   3. Not before the event ENDS. A prize claimable mid-contest is a prize
 *      awarded before the result.
 *   4. The claim happens on the SHOP, not on the events host — it ends in a
 *      checkout, and checkout lives on the shop.
 *
 * 🛑 THIS DECIDES AN AFFORDANCE, NOT AN ENTITLEMENT. It says whether to draw
 * the button. What actually stops a non-winner is the claim coupon's
 * `restrictions.allowedUserIds`, enforced server-side in
 * `_fetchAndValidateCoupon`. Anyone can type the checkout URL; nobody can
 * redeem someone else's coupon. Treating this function as the control is the
 * mistake it exists to make impossible — hence the name.
 */

export interface PrizeClaimInput {
  /** The viewer. `undefined` for a signed-out visitor. */
  viewerUserId?: string | undefined;
  /** `eventPrize.winnerUserIds` — absent/empty means not yet awarded. */
  winnerUserIds?: readonly string[] | undefined;
  /**
   * When the event closed. `undefined` means it has not, or is unknown — and
   * unknown must behave as NOT ENDED, because the conservative direction for
   * handing out a prize is to wait.
   */
  eventEndsAt?: Date | string | number | undefined;
  /**
   * When the claim window closes — the ticket's own expiry.
   *
   * Owner, 2026-11-14: *"make sure that there is a gate, say 7 or 10 days or 15
   * days I can set, so that no one can claim something after 2-3 years"* and
   * *"same like expirations."*
   *
   * 🛑 THE AFFORDANCE MUST NOT OUTLIVE THE TICKET. Without this the button
   * still draws three years later, the buyer clicks it, and `validateCoupon`
   * refuses the expired ticket somewhere deep in checkout. That is the dead
   * affordance this codebase keeps producing — a control that looks live,
   * fails elsewhere, and explains nothing. The window is checked HERE so the
   * page says "claims closed" instead.
   *
   * ⚠ `undefined` means NO WINDOW RECORDED, which is NOT "open forever". A
   * prize awarded before the window existed, or an award action that forgot to
   * stamp it, must not become permanently claimable — the exact state the
   * owner asked to make impossible. Treated as CLOSED.
   */
  claimWindowEndsAt?: Date | string | number | undefined;
  /** Clock, injected so this is testable without faking global time. */
  now: number;
}

export type PrizeClaimState =
  /** Event still running — nobody claims yet. */
  | "event-open"
  /** Ended, but no winners recorded. */
  | "not-awarded"
  /** Ended and awarded, viewer is not a winner (or is signed out). */
  | "not-yours"
  /** The claim window has closed — the ticket is expired or was never dated. */
  | "claim-window-closed"
  /** Ended, awarded, and this viewer won. */
  | "claimable";

export interface PrizeClaimDecision {
  state: PrizeClaimState;
  /** Draw the claim control? Only ever true for `claimable`. */
  canClaim: boolean;
  /**
   * Why not, in the viewer's terms — or undefined when they can claim.
   *
   * ⚠ "not-yours" deliberately does NOT say "you did not win". A prize page is
   * public and is read by people who never entered; telling a passer-by they
   * lost is both wrong and unkind. It states who it is for instead.
   */
  reason?: string;
}

export function resolvePrizeClaim(input: PrizeClaimInput): PrizeClaimDecision {
  const endsAt = toTime(input.eventEndsAt);

  /*
   * 🛑 Unknown end date → NOT ENDED. A missing `endsAt` must not make a prize
   * claimable: the conservative direction when handing out something of value
   * is to wait, and the opposite error gives an item away before the result is
   * known. Same asymmetry as every other money-path unknown in this codebase,
   * pointed at a different hazard.
   */
  if (endsAt === undefined || input.now < endsAt) {
    return {
      state: "event-open",
      canClaim: false,
      reason: "Claims open when the event closes.",
    };
  }

  const winners = input.winnerUserIds ?? [];
  if (winners.length === 0) {
    return {
      state: "not-awarded",
      canClaim: false,
      reason: "Winners have not been announced yet.",
    };
  }

  /*
   * ⚠ A signed-out viewer falls here, not into a sign-in prompt. They may well
   * be a winner who has not logged in — but this module cannot know that, and
   * guessing produces either a false promise or a false denial. The surface
   * offers sign-in; this only reports that the viewer is not identified as a
   * winner.
   */
  if (!input.viewerUserId || !winners.includes(input.viewerUserId)) {
    return {
      state: "not-yours",
      canClaim: false,
      reason:
        winners.length === 1
          ? "This prize has been awarded to its winner."
          : `This prize has been awarded to ${winners.length} winners.`,
    };
  }

  /*
   * ── THE CLAIM WINDOW — checked LAST, and only for the winner ─────────────
   *
   * 🛑 Deliberately AFTER the winner test. A passer-by must not be told
   * "claims closed" on a prize that was never theirs: that leaks the award
   * state of an event to someone with no stake in it, and it is not the
   * sentence they need anyway. Only the person who COULD have claimed is told
   * that they no longer can.
   *
   * ⚠ An ABSENT window reads as CLOSED, never as open-ended. A prize awarded
   * before this field existed, or an award action that forgot to stamp it,
   * must not be claimable forever — which is exactly what the owner asked to
   * make impossible: *"no one can claim something after 2-3 years."*
   *
   * ⚠ This duplicates no logic. The ticket's real expiry is its coupon
   * `validity.endDate`, enforced by `validateCoupon`; this reads the same
   * instant stamped on the prize so the BUTTON agrees with the TICKET. Without
   * it the control draws, the buyer clicks, and the refusal surfaces deep in
   * checkout — the dead affordance this codebase keeps producing.
   */
  const windowEndsAt = toTime(input.claimWindowEndsAt);
  if (windowEndsAt === undefined || input.now > windowEndsAt) {
    return {
      state: "claim-window-closed",
      canClaim: false,
      reason: "The claim window for this prize has closed.",
    };
  }

  return { state: "claimable", canClaim: true };
}

/** Accepts the three shapes a stored date arrives as. */
function toTime(value: Date | string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const t =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : Date.parse(value);
  return Number.isFinite(t) ? t : undefined;
}
