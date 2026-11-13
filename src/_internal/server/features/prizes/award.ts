/**
 * Awarding an event prize = issuing the WIN TICKET its winner claims it with.
 *
 * Owner, 2026-11-13, across four messages — the model is specific and the
 * obvious reading of any one of them is wrong, so all four are recorded:
 *
 *   · *"the prize claims have to go via the coupon only i.e. they have to
 *     purchase the prize item"*
 *   · *"the prizes are 0 only, but a claim on it needs that coupons as win
 *     ticket"*
 *   · *"else it is blocked from purchase"*
 *   · *"when someone wins they get the coupon for the events, the coupon code,
 *     and the prize id (for multiple items) and the quantity too"*
 *
 * ## 🛑 THE COUPON IS AN ENTITLEMENT, NOT A DISCOUNT
 *
 * A prize listing is priced **₹0**. So a percentage or fixed discount on it is
 * meaningless — there is nothing to reduce. The coupon's job is
 * AUTHORISATION: it is the ticket that makes an otherwise **purchase-blocked**
 * listing buyable, by the one person who won it, for the quantity they won.
 *
 * ⚠ This inverts the usual direction and it is the thing most likely to be
 * "simplified" later. Everywhere else in this system a coupon is OPTIONAL and
 * makes a purchase cheaper. Here the product REQUIRES one and the coupon makes
 * the purchase possible at all. Remove the requirement and a ₹0 prize is free
 * for anyone who finds the URL — which is why the gate, not the discount, is
 * the feature.
 *
 * 🛑 An earlier draft of this file minted a 100%-off percentage coupon against
 * a full-price listing. That is a different design and it is WRONG for this
 * one twice over: the discount does nothing on a ₹0 item, and it leaves the
 * listing purchasable by anybody without a ticket.
 *
 * ## What the ticket carries
 *
 * `applicableProducts` — the prize ids, PLURAL. The owner's *"(for multiple
 * items)"*: one win can entitle a set, and one ticket covers the set rather
 * than forcing a coupon per item.
 * `claimQuantity`      — how many units the win is worth.
 * `allowedUserIds`     — the winner, and nobody else.
 * `eventId`            — which event it was won at.
 */

import { couponsRepository } from "../../../../features/promotions/repository/coupons.repository";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";

export interface IssueWinTicketsInput {
  /**
   * Every prize listing this win entitles. PLURAL — *"the prize id (for
   * multiple items)"*.
   *
   * 🛑 Also the purchase allowlist. A ticket must never be spendable on a
   * listing outside this set: the listings are ₹0, so a ticket that escaped
   * its prize would be free goods.
   */
  prizeProductIds: readonly string[];
  /**
   * An optional VALUE CEILING, for prizes that are not a fixed item.
   *
   * Owner, 2026-11-13, looking ahead: *"if in future we decide to do a more
   * generic prize like anything from the listing store under 10k, then that is
   * meaningful for them."*
   *
   * 🛑 THE SHAPE IS ADDED NOW BECAUSE RETROFITTING IT IS A DATA MIGRATION, NOT
   * AN EDIT. Every ticket already issued would have to be re-authored to carry
   * a scope it was never written with — the exact trap the primitive catalogue
   * records for `acceptsCombinationWith` ("a boolean cannot be upgraded
   * without re-authoring every promotion row"). A ticket's scope is therefore
   * "a set of ids" OR "anything up to a value", expressible from day one.
   *
   * 🛑 BUT IT IS NOT YET ENFORCED, AND THAT IS WHY `issueWinTickets` REFUSES
   * IT. A stored ceiling that nothing checks is worse than no ceiling: it
   * reads as a restriction while permitting the entire catalogue, which on a
   * claim path means any item at any price. Refusing to issue is the only
   * honest state until the claim gate can read it — the declared-but-unwired
   * defect, pre-empted rather than discovered.
   *
   * 🛑 AND WHEN IT IS BUILT, THE NUMBER IS CONFIG — NEVER A CONSTANT. Owner,
   * 2026-11-13: *"10k is a number I spouted, it has to be properly
   * configured."* The per-ticket value here is the AMOUNT THIS WIN IS WORTH,
   * which is data by definition; any platform-wide default or cap sits in
   * `siteSettings`, exactly like `saleProtectionAutoCoverLimit`. A hardcoded
   * rupee figure anywhere in this feature is the deploy test failing — it is a
   * commercial number, and commercial numbers move.
   *
   * ⚠ The owner's figure is deliberately NOT written here as a literal. This
   * codebase has burned four releases on a banned string re-entering the dist
   * inside the comment explaining the ban, because the audits are regexes over
   * SOURCE and cannot tell a comment from code. Describe the shape, never the
   * value.
   */
  maxItemValue?: number;
  /** How many units of the prize the win is worth. */
  quantity: number;
  /** The event it was won at — traceability, never a gate. */
  eventId: string;
  /** Every winner. One ticket each. */
  winnerUserIds: readonly string[];
  /** Who awarded it, for the audit trail. */
  awardedBy: string;
  /** Days to claim before the ticket expires. Absent → 30. */
  claimWindowDays?: number;
}

export interface IssuedWinTicket {
  userId: string;
  couponId: string;
  code: string;
  /** True when the ticket already existed and was left untouched. */
  alreadyIssued: boolean;
}

/**
 * 🛑 DETERMINISTIC ID, so awarding is IDEMPOTENT.
 *
 * Awarding WILL be re-run — an admin corrects a winner list, a retry fires,
 * two tabs submit. A random id would issue a SECOND ticket for the same person
 * and prize each time, and nothing downstream would notice: each is
 * individually valid, and the winner could claim the prize once per duplicate.
 * On a ₹0 listing that is free stock, repeatedly.
 *
 * ⚠ Keyed on the FIRST prize id plus the uid. A win is one ticket, so the key
 * must not vary with the order of a multi-item set — sorting the ids before
 * keying would also work, but the first id is stable for the single-item case
 * that is almost all of them, and the set is recorded on the row itself.
 */
function winTicketId(prizeProductIds: readonly string[], userId: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  const anchor = [...prizeProductIds].sort()[0] ?? "prize";
  return `coupon-wt-${safe(anchor)}-${safe(userId)}`;
}

/** Human-readable, uppercase, unique per (prize set, winner). */
function winTicketCode(prizeProductIds: readonly string[], userId: string): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const anchor = [...prizeProductIds].sort()[0] ?? "PRIZE";
  return `WIN${safe(anchor).slice(-8)}${safe(userId).slice(-6)}`;
}

/**
 * Issue one win ticket per winner. Safe to call repeatedly.
 *
 * ⚠ Returns per-winner results rather than throwing on the first failure: an
 * award to five winners that dies on the third must not leave the first two
 * unrecorded and the last two unattempted. The caller reports partial success
 * and re-runs — which is why the id is deterministic.
 */
export async function issueWinTickets(
  input: IssueWinTicketsInput,
): Promise<{ issued: IssuedWinTicket[]; failed: Array<{ userId: string; reason: string }> }> {
  const issued: IssuedWinTicket[] = [];
  const failed: Array<{ userId: string; reason: string }> = [];

  /*
   * 🛑 REFUSE A CEILING NOTHING ENFORCES. See `maxItemValue` — a stored
   * ceiling with no reader reads as a restriction while permitting the whole
   * catalogue, which on a claim path is any item at any price. The shape
   * exists so it is not a migration later; issuing against it is blocked until
   * the claim gate can read it.
   */
  if (input.maxItemValue !== undefined) {
    serverLogger.error("[prize-award] refused: maxItemValue is not enforced yet", {
      eventId: input.eventId,
      maxItemValue: input.maxItemValue,
    });
    return {
      issued: [],
      failed: input.winnerUserIds.map((userId) => ({ userId, reason: "ceiling-not-enforced" })),
    };
  }

  const prizeIds = Array.from(new Set(input.prizeProductIds.filter(Boolean)));
  if (prizeIds.length === 0) {
    /* 🛑 Refuse rather than issue an unscoped ticket. An empty
       `applicableProducts` means "every product" to the validators, so a
       ticket with no prize ids would be 100% entitlement to the whole
       catalogue. Failing loudly here is the only safe answer. */
    return {
      issued: [],
      failed: input.winnerUserIds.map((userId) => ({ userId, reason: "no-prize-ids" })),
    };
  }

  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? Math.floor(input.quantity) : 1;
  const windowDays = Number.isFinite(input.claimWindowDays) ? Number(input.claimWindowDays) : 30;
  const now = new Date();
  const endsAt = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  /* Deduplicated — the same uid twice in a pasted winner list must not mean
     two tickets, and a pasted list is exactly where that happens. */
  for (const userId of Array.from(new Set(input.winnerUserIds.filter(Boolean)))) {
    const id = winTicketId(prizeIds, userId);
    try {
      const existing = await couponsRepository.findById(id).catch(() => null);
      if (existing) {
        issued.push({ userId, couponId: id, code: existing.code, alreadyIssued: true });
        continue;
      }

      const code = winTicketCode(prizeIds, userId);
      await couponsRepository.createWithId(id, {
        code,
        name: "Event prize — win ticket",
        description:
          "Entitles its winner to claim this prize. Usable only by them, only on the prize it was won for.",
        /*
         * ⚠ `fixed` at value 0, NOT `percentage` at 100.
         *
         * The prize is already ₹0, so this coupon must not pretend to
         * discount anything — `computeDiscount` clamps a fixed value with
         * `min(value, cartTotal)`, so 0 on a ₹0 item is 0 either way and the
         * arithmetic cannot surprise anyone. The ENTITLEMENT is the point;
         * the money term is deliberately inert.
         */
        type: "fixed",
        scope: "admin",
        discount: { value: 0 },
        usage: {
          currentUsage: 0,
          /* One claim, and one holder. Defence in depth on the coupon type
             whose loss is an ITEM rather than a discount. */
          perUserLimit: 1,
          totalLimit: 1,
        },
        validity: { isActive: true, startDate: now, endDate: endsAt },
        restrictions: {
          firstTimeUserOnly: false,
          /* The winner, enforced server-side in `_fetchAndValidateCoupon`. */
          allowedUserIds: [userId],
          /* 🛑 The prize set, and nothing outside it. These listings are ₹0. */
          applicableProducts: prizeIds,
        },
        createdBy: input.awardedBy,
        eventId: input.eventId,
        /* How many units the win is worth — *"and the quantity too"*. */
        claimQuantity: quantity,
        stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
      } as never);

      issued.push({ userId, couponId: id, code, alreadyIssued: false });
    } catch (err) {
      const e = normalizeError(err);
      /* ⚠ `kind` and the uid, never the raw message — a thrown message is
         written for a developer and can reach a user through a 500. */
      serverLogger.error("[prize-award] could not issue a win ticket", {
        prizeProductIds: prizeIds.length,
        userId,
        kind: e.kind,
      });
      failed.push({ userId, reason: e.kind });
    }
  }

  return { issued, failed };
}
