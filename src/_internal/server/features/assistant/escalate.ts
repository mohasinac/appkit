import { logServerWarning } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";
import { supportRepository } from "../../../../features/support/repository/support.repository";
import type { TicketPriority } from "../../../../features/support/schemas/firestore";
import type { EscalationSeverity } from "./severity";

/**
 * A4's first half: when the assistant cannot answer, a human picks it up.
 *
 * Without this a refusal is a dead end — the buyer is told "I can't help"
 * and nothing anywhere records that they asked. The plan's phrasing is the
 * contract: *"a refusal is never a 500 … Exhausted budget yields 'I'll have
 * someone get back to you' plus a `supportTickets` row."*
 *
 * ## 🛑 Reuses supportTickets rather than inventing a queue
 *
 * `supportTickets` already has 12 categories, an admin queue that filters by
 * category, a statutory `dueAt` clock for grievances, and a whole
 * notification path (`onSupportTicketCreate`). A parallel
 * `assistantEscalations` collection would be a second inbox nobody is
 * watching — the speculative-infra pattern this codebase keeps paying for.
 *
 * Category is `general`, deliberately: the assistant cannot reliably tell an
 * `order_issue` from a `billing_payment`, and a MISFILED ticket is worse than
 * an unfiled one — it lands in a queue whose owner skips it. A human
 * re-categorises in one click; nobody un-does a wrong statutory clock.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:writes-firestore
 */

/** Firestore `subject` is a display column; keep it scannable in the queue. */
const SUBJECT_MAX = 80;

export interface EscalationInput {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  conversationId: string;
  /** The buyer's own words — what they actually asked. */
  question: string;
  /** Operator-facing reason the turn could not answer. Never shown to the buyer. */
  reason: string;
  /** From `classifyEscalation`. Decides the ticket's queue priority. */
  severity: EscalationSeverity;
  priority: TicketPriority;
}

function toSubject(question: string): string {
  const flat = question.replace(/\s+/g, " ").trim();
  return flat.length <= SUBJECT_MAX ? flat : `${flat.slice(0, SUBJECT_MAX - 1)}…`;
}

/**
 * File a ticket for a question the assistant could not answer.
 *
 * 🛑 Returns a boolean and NEVER throws. The caller is already on a failure
 * path — the turn could not be answered — and a throw here would convert
 * "I could not answer, a human will" into a 500, which is precisely the
 * outcome the escalation exists to prevent. A failed escalation is logged
 * and the buyer still gets the honest apology.
 */
export async function escalateToHuman(input: EscalationInput): Promise<boolean> {
  try {
    const ticket = await supportRepository.createTicket({
      userId: input.userId,
      /*
       * Plaintext in — the repository's write hook encrypts via
       * SUPPORT_TICKET PII fields. Passing pre-encrypted values here would
       * double-encrypt; the types say Encrypted<string> because that is what
       * a READ returns, and createTicket's own comment records that the
       * previous `as unknown as` cast was lying about exactly this.
       */
      userEmail: input.userEmail as never,
      userDisplayName: input.userDisplayName as never,
      category: "general",
      subject: toSubject(input.question),
      description: [
        "Raised automatically by the customer assistant, which could not answer.",
        "",
        `Buyer asked: ${input.question}`,
        "",
        `Conversation: ${input.conversationId}`,
        `Severity: ${input.severity}`,
        `Assistant reason: ${input.reason}`,
      ].join("\n"),
    });

    /*
     * 🛑 Priority is a SECOND write, because `createTicket` hardcodes
     * `priority: "normal"` and `SupportTicketCreateInput` cannot express it.
     * Widening that Pick<> would be the tidier fix and is deliberately NOT
     * done here, since this module now lives in the same package as the
     * repository it is widening — revisit in a dedicated pass rather than as
     * a drive-by inside this relocation.
     *
     * Best-effort on purpose. A ticket that exists at the wrong priority is
     * recoverable by a human in one click; throwing here would lose the
     * ticket entirely and strand the buyer, which is the outcome this whole
     * path exists to prevent.
     */
    if (input.priority !== "normal") {
      try {
        await supportRepository.updateTicketStatus(ticket.id, { priority: input.priority });
      } catch (err) {
        logServerWarning("[assistant] ticket filed but priority not applied", {
          ticketId: ticket.id,
          wanted: input.priority,
          error: normalizeError(err).message,
        });
      }
    }
    return true;
  } catch (err) {
    /*
     * Logged, not rethrown. See the contract above: the buyer is mid-failure
     * already and must not be handed a 500 on top of it.
     */
    logServerWarning("[assistant] escalation failed to file a ticket", {
      conversationId: input.conversationId,
      error: normalizeError(err).message,
    });
    return false;
  }
}
