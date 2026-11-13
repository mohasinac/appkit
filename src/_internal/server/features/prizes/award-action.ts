/**
 * Awarding a prize — the ONE action that records winners and issues tickets.
 *
 * ## 🛑 WHY THIS IS ONE ACTION AND NOT TWO
 *
 * Recording `winnerUserIds` and issuing the win tickets are the same decision.
 * Split across two admin steps they WILL diverge: winners recorded with no
 * tickets (a claim button that cannot be honoured), or tickets with no winners
 * recorded (a prize that advertises nothing while someone holds a pass to it).
 * Both halves here, or neither.
 *
 * ## What gets stamped on the prize, and why each is a SNAPSHOT
 *
 * | field | why it is denormalised onto the listing |
 * |---|---|
 * | `winnerUserIds` | the shop must not read the events collection — microservice rule |
 * | `eventEndsAt` | if events were unreachable a real winner would be told the event has not finished, which silently DENIES a legitimate claim |
 * | `claimWindowEndsAt` | the button must agree with the ticket's own expiry, and config moves |
 *
 * 🛑 All three are written HERE, at award time, by the one action that knows
 * all of them. An event that has ended cannot un-end and a window that was set
 * cannot retroactively change, so none of these can go stale in a way that
 * matters — which is what makes denormalising them safe rather than lazy.
 */

import { productRepository } from "../../../../features/products/repository/products.repository";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";
import { issueWinTickets, type IssuedWinTicket } from "./award";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { userRepository } from "../../../../features/auth/repository/user.repository";

export interface AwardPrizeInput {
  /** Every prize listing this win entitles. */
  prizeProductIds: readonly string[];
  /** The event it was won at. */
  eventId: string;
  /** When the event closed — stamped so the shop never reads events. */
  eventEndsAt: Date;
  /** The winners. Several is normal. */
  winnerUserIds: readonly string[];
  /** Units the win is worth. */
  quantity: number;
  /** Who awarded it. */
  awardedBy: string;
  /**
   * Days to claim, from `siteSettings.prizes.claimWindowDays`.
   *
   * 🛑 PASSED IN, never read from a constant here. Owner: *"a gate, say 7 or 10
   * or 15 days I can set"* and *"10k is a number I spouted, it has to be
   * properly configured."* The caller resolves it from settings so this module
   * holds no commercial figure.
   *
   * ⚠ Absent falls to a BOUNDED default, never to unlimited — an unreadable
   * setting must not create a prize claimable forever, which is the exact
   * thing the window exists to prevent.
   */
  claimWindowDays?: number;
}

export interface AwardPrizeResult {
  issued: IssuedWinTicket[];
  failed: Array<{ userId: string; reason: string }>;
  /** Prize listings whose winner stamp could not be written. */
  stampFailed: string[];
  claimWindowEndsAt: Date;
}

/** Bounded fallback. 🛑 Never unlimited — see `claimWindowDays`. */
const DEFAULT_CLAIM_WINDOW_DAYS = 30;

/**
 * Record the winners and issue their tickets. Idempotent — safe to re-run.
 *
 * ⚠ TICKETS FIRST, then the stamp. If issuing fails the prize is left
 * un-awarded and the admin can retry cleanly; if the stamp failed after a
 * successful issue, the tickets exist and are harmless (the purchase gate
 * honours them) while the claim BUTTON simply does not draw yet. The reverse
 * order would advertise a claim nobody can complete, which is the worse half.
 */
export async function awardPrize(input: AwardPrizeInput): Promise<AwardPrizeResult> {
  const days =
    Number.isFinite(input.claimWindowDays) && (input.claimWindowDays as number) > 0
      ? Math.floor(input.claimWindowDays as number)
      : DEFAULT_CLAIM_WINDOW_DAYS;

  const claimWindowEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const { issued, failed } = await issueWinTickets({
    prizeProductIds: input.prizeProductIds,
    quantity: input.quantity,
    eventId: input.eventId,
    winnerUserIds: input.winnerUserIds,
    awardedBy: input.awardedBy,
    claimWindowDays: days,
  });

  /*
   * 🛑 Only stamp the winners who actually HAVE a ticket. Recording someone as
   * a winner whose ticket failed to issue draws them a claim button that the
   * purchase gate will refuse — the dead affordance, manufactured deliberately.
   */
  const ticketed = issued.map((t) => t.userId);
  const stampFailed: string[] = [];

  if (ticketed.length > 0) {
    for (const productId of Array.from(new Set(input.prizeProductIds.filter(Boolean)))) {
      try {
        const existing = await productRepository.findById(productId);
        const prior = existing?.eventPrize;
        await productRepository.update(productId, {
          eventPrize: {
            ...(prior ?? {}),
            eventId: input.eventId,
            eventEndsAt: input.eventEndsAt,
            claimWindowEndsAt,
            /* ⚠ MERGED, not replaced: re-running an award for a second winner
               must not erase the first. `Set` because the same uid can arrive
               twice across runs. */
            winnerUserIds: Array.from(new Set([...(prior?.winnerUserIds ?? []), ...ticketed])),
          },
        } as never);
      } catch (err) {
        const e = normalizeError(err);
        serverLogger.error("[prize-award] winner stamp failed", { productId, kind: e.kind });
        stampFailed.push(productId);
      }
    }
  }

  /*
   * ── TELL THE WINNER ───────────────────────────────────────────────────────
   *
   * Owner, 2026-11-13: *"send the coupon via email."*
   *
   * 🛑 AFTER the ticket exists, never before. An email naming a code that was
   * not issued is worse than no email — the winner tries it, checkout refuses
   * it, and support has nothing to look up. Only `issued` is notified, and a
   * ticket that was `alreadyIssued` is notified again on purpose: a re-run is
   * usually someone chasing a winner who did not receive the first one.
   *
   * ⚠ Failures here do NOT fail the award. The entitlement is the ticket; the
   * email is delivery. Losing the message leaves a claimable prize the winner
   * can still find on their coupons page, whereas failing the award over a mail
   * problem would discard a correctly issued entitlement.
   *
   * ⚠ Sent per winner, never as one message to all of them — a prize with
   * three winners must not disclose the other two to each.
   */
  for (const t of issued) {
    try {
      const user = await userRepository.findById(t.userId).catch(() => null);
      const revealed = user ? userRepository.revealUser(user) : null;
      await sendNotification({
        userId: t.userId,
        type: "system",
        title: "You won a prize",
        message:
          `Your winning ticket is ${t.code}. Claim it before ` +
          `${claimWindowEndsAt.toLocaleDateString("en-IN")} — after that the claim window closes.`,
        ...(revealed?.email ? { userEmail: revealed.email } : {}),
      } as never);
    } catch (err) {
      const e = normalizeError(err);
      /* ⚠ The CODE is never logged — it is an entitlement, and logs are read
         by more people than the winner. */
      serverLogger.warn("[prize-award] could not notify a winner", {
        userId: t.userId,
        kind: e.kind,
      });
    }
  }

  return { issued, failed, stampFailed, claimWindowEndsAt };
}
