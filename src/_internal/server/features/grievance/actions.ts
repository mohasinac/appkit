"use server";

/**
 * Grievance intake — a record, a clock, and a place in the queue.
 *
 * ## What was wrong (D18)
 *
 * There was **no intake at all**: no form, no route, no API endpoint. The
 * public `/grievance` page's only instruction was a `mailto:` to the generic
 * support address, so nothing recorded a grievance, timestamped it, or tracked
 * any statutory clock. `/report` is for scam and entity reports, not money.
 *
 * ## What this builds, and what it deliberately does NOT
 *
 * Built: the record, the acknowledgement timestamp, the resolution deadline,
 * the structured disputed amount, and a `paymentCases` row so the deadline sits
 * in the one queue an operator already reads.
 *
 * 🛑 **NOT built: anything published.** The Consumer Protection (E-Commerce)
 * Rules 2020 require a NAMED individual as grievance officer, and this project
 * publishes the business name with designation "Support" and the same generic
 * support email — so there is no escalation tier (D17). It also publishes no
 * timeline anywhere.
 *
 * I am not asserting the statutory periods from memory, and the reason is
 * asymmetric: **a published timeline we then miss is worse than the present
 * silence.** So the clock runs against `GRIEVANCE_PERIODS`, whose defaults are
 * deliberately shorter than any plausible statutory period — firing early is
 * harmless, firing late is the thing the regime punishes — and the public page
 * stays untouched until the owner supplies the officer and the real numbers.
 */

import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { ValidationError } from "../../../../errors";
import { supportRepository } from "../../../../features/support/repository/support.repository";
import {
  GRIEVANCE_PERIODS,
  TicketCategoryValues,
  type SupportTicketDocument,
} from "../../../../features/support/schemas/firestore";
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";

export interface FileGrievanceInput {
  subject: string;
  detail: string;
  /** The order it concerns, when it concerns one. */
  orderId?: string;
  /** Decimal rupees in dispute. Structured so the queue can sort by it. */
  disputedAmount?: number;
}

const DETAIL_MIN = 30;
const DETAIL_MAX = 5000;

/**
 * File a grievance.
 *
 * 🛑 The acknowledgement is stamped at intake, SYNCHRONOUSLY, and that is the
 * one thing here that must not be best-effort. An acknowledgement timestamp is
 * the evidence that we received the complaint on the day we say we did; writing
 * it fire-and-forget would mean the clock's start could silently fail to
 * record, and a clock whose start is unknown cannot be shown to have been met.
 *
 * The `paymentCases` row IS best-effort, because it is a convenience surface —
 * losing it costs visibility, not evidence.
 */
export async function fileGrievanceAction(
  input: FileGrievanceInput,
): Promise<ActionResult<{ ticketId: string; dueAt: string }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);

    const subject = input.subject?.trim() ?? "";
    const detail = input.detail?.trim() ?? "";
    if (subject.length < 5) {
      throw new ValidationError("Please give your grievance a short subject line.");
    }
    if (detail.length < DETAIL_MIN) {
      throw new ValidationError(
        `Please describe the grievance in at least ${DETAIL_MIN} characters — a complaint with no account of the problem cannot be investigated or evidenced.`,
      );
    }
    if (detail.length > DETAIL_MAX) {
      throw new ValidationError(`Please keep the description under ${DETAIL_MAX} characters.`);
    }
    if (
      input.disputedAmount !== undefined &&
      (!Number.isFinite(input.disputedAmount) || input.disputedAmount < 0)
    ) {
      throw new ValidationError("The disputed amount must be a positive number of rupees.");
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + GRIEVANCE_PERIODS.resolveHours * 3_600_000);

    /*
     * `description`, not `message` — the create input is a `Pick` of the plain
     * document and that is the field's real name. I wrote `message` first; an
     * excess property would have been a compile error, which is the signal
     * working as intended rather than a cast hiding it.
     */
    const ticket = await supportRepository.createTicket({
      userId: user.uid,
      /*
       * Both REQUIRED by `SupportTicketCreateInput`, which is a `Pick` of the
       * PLAIN document — so plaintext here is correct, and the repository
       * encrypts on write. Omitting them was a compile error rather than a
       * silent gap, which is the Pick working as intended.
       */
      userEmail: user.email ?? "",
      userDisplayName: user.name ?? user.email ?? "Buyer",
      category: TicketCategoryValues.GRIEVANCE,
      subject,
      description: detail,
      ...(input.orderId ? { orderId: input.orderId } : {}),
      /*
       * Both stamped at creation. `acknowledgedAt` is "we have it" and is
       * automatic; `firstResponseAt` is deliberately NOT set — that is a
       * human replying, and letting an automatic receipt satisfy it would make
       * the response metric meaningless.
       */
      acknowledgedAt: now,
      dueAt,
      ...(input.disputedAmount !== undefined ? { disputedAmount: input.disputedAmount } : {}),
    });

    /*
     * Into the operator queue with the SAME `dueAt`, because a grievance with a
     * deadline is structurally a chargeback with a deadline: an external clock
     * we did not set and cannot extend. Phase 3's queue already sorts by
     * nearest `dueAt` and the daily digest already prints it, so this needs no
     * new surface — which is the whole reason that queue was built as one
     * collection rather than three.
     */
    void paymentCasesRepository()
      .openOrObserve({
        kind: "grievance",
        subjectId: ticket.id,
        severity: "error",
        title: `Grievance — ${subject}`,
        detail: [
          `A formal grievance has been filed and a statutory clock is running.`,
          "",
          `Ticket: ${ticket.id}`,
          input.orderId ? `Order: ${input.orderId}` : "Order: (not order-specific)",
          input.disputedAmount !== undefined
            ? `Disputed amount: ${input.disputedAmount}`
            : "Disputed amount: not stated",
          `Acknowledged: ${now.toISOString()}`,
          `Due: ${dueAt.toISOString()}`,
          "",
          detail,
          "",
          `🛑 The periods are internal DEFAULTS (${GRIEVANCE_PERIODS.acknowledgeHours}h ack /`,
          `${GRIEVANCE_PERIODS.resolveHours / 24}d resolve), chosen shorter than any plausible`,
          `statutory period so the clock fires early. Nothing is published yet.`,
        ].join("\n"),
        entityType: "user",
        entityId: user.uid,
        dueAt,
        ...(input.disputedAmount !== undefined ? { amountAtRisk: input.disputedAmount } : {}),
        ...(input.orderId ? { orderIds: [input.orderId] } : {}),
        now,
      })
      .catch((err: unknown) => {
        void normalizeError(err);
      });

    serverLogger.warn("grievance filed", {
      ticketId: ticket.id,
      orderId: input.orderId,
      dueAt: dueAt.toISOString(),
    });

    return { ticketId: ticket.id, dueAt: dueAt.toISOString() };
  });
}

/**
 * Stamp the first human response.
 *
 * 🛑 Separate from the ticket's ordinary reply path on purpose: it is
 * write-once (`!existing.firstResponseAt`), so a second reply cannot move the
 * metric forward and make a slow first response look fast. The same
 * write-once discipline `resolvedAt` already uses.
 */
export async function recordGrievanceFirstResponseAction(
  ticketId: string,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator", "employee"]);
    const existing = (await supportRepository.findById(ticketId)) as
      | SupportTicketDocument
      | null;
    if (!existing) throw new ValidationError(`Ticket ${ticketId} not found`);
    if (existing.firstResponseAt) return; // write-once, idempotent

    await supportRepository.update(ticketId, {
      firstResponseAt: new Date(),
    });

    serverLogger.info("grievance first response recorded", { ticketId, by: user.uid });
  });
}
