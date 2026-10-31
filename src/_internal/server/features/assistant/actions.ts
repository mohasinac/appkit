import { logServerWarning } from "../../../../monitoring";
import { GroqModelProvider } from "../../../../providers/ai-groq";
import type { IAssistantModelProvider } from "../../../shared/features/assistant/types";
import { runAssistantTurn } from "./turn";
import { escalateToHuman } from "./escalate";
import { classifyEscalation } from "./severity";
import { BUILTIN_ASSISTANT_TOOLS } from "./tools/builtin";
import { appendAssistantTurn, getAssistantHistory } from "./history-store";

/**
 * `answerAssistantQuestion()` — the ONE public entry point this feature
 * exports from `server.ts`. Everything above it (routing, redaction,
 * handles, budget, quorum, escalation, the tool registry) is wiring this
 * function assembles; nothing else needs to be imported by a consumer.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:writes-firestore
 */

function getAssistantProviders(): readonly IAssistantModelProvider[] {
  // Env read happens inside the provider's own `turn()` call, never cached
  // at module load — see providers/ai-groq's docstring.
  return [new GroqModelProvider()];
}

export interface AssistantUser {
  id: string;
  /*
   * 🛑 From the SESSION, not from a Firestore read.
   *
   * `UserRepository.mapDoc` no longer decrypts, so a user document hands back
   * `enc:v1:…` and the only way to plaintext is `revealUser()` — a `reveal*`
   * accessor, which `audit-assistant-egress` R1 forbids anywhere in this
   * feature. The caller already holds the authenticated session's `email`
   * and `displayName` in plaintext, so pass what is already in hand rather
   * than decrypting a document that was never read.
   */
  email: string;
  displayName: string;
}

export interface AssistantAnswer {
  text: string;
}

export async function answerAssistantQuestion(
  user: AssistantUser,
  question: string,
): Promise<AssistantAnswer> {
  const history = await getAssistantHistory(user.id);

  const outcome = await runAssistantTurn(
    {
      /*
       * There is no real "conversation" any more — the shared inbox was
       * dropped. `userId` doubles as the handle registry's scoping key,
       * which only needs to be stable for the lifetime of this one call.
       */
      conversationId: user.id,
      userId: user.id,
      roles: ["buyer"],
      /*
       * 🛑 "redacted", not "none" — a buyer's free text can carry a phone
       * number, an email or an address at any time, and nothing stops them.
       * See redaction.ts's `assertAlreadyPublic` docstring for why "none" is
       * reserved for text whose SOURCE is already a public projection.
       */
      piiClass: "redacted",
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: question },
      ],
    },
    {
      providers: getAssistantProviders(),
      tools: BUILTIN_ASSISTANT_TOOLS,
      /*
       * Owner's instruction 2026-10-31 ("its fine with groq"). Groq is the
       * only registered vendor, so without this a money/policy answer could
       * never clear review and every such question would escalate. The
       * reviewer still runs a different model lineage (Qwen vs gpt-oss);
       * see quorum.ts for why that is weaker than cross-vendor.
       */
      allowSameVendorQuorum: true,
    },
  );

  /*
   * A refusal is never silence: the buyer gets "someone will get back to
   * you" and a real `supportTickets` row is filed, so a question the
   * assistant could not answer reaches a human instead of evaporating.
   */
  let replyText = outcome.ok ? outcome.text : "";

  if (!outcome.ok) {
    /*
     * 🛑 The reason goes in the MESSAGE, not only the data bag — appkit's
     * logger has previously been found to drop a metadata object entirely,
     * so the one field needed to diagnose a refusal belongs in the string.
     */
    logServerWarning(`[assistant] turn refused: ${outcome.reason}`, {
      userId: user.id,
    });

    /*
     * Severity is decided from OUR refusal reason plus the buyer's topic —
     * never by asking the model (see severity.ts: a model already failing to
     * answer is not a reliable judge of how badly it failed, and a
     * severity prompt is an injection target).
     */
    const decision = classifyEscalation(outcome.reason, question);

    /*
     * 🛑 `escalates: false` means file NOTHING — today that is only a
     * flagged prompt injection. Ticketing hostile input would spam the
     * human queue and hand an attacker a one-message-per-ticket flood.
     */
    if (!decision.escalates) {
      replyText = decision.buyerMessage;
    } else {
      const escalated = await escalateToHuman({
        userId: user.id,
        userEmail: user.email,
        userDisplayName: user.displayName,
        conversationId: user.id,
        question,
        reason: outcome.reason,
        severity: decision.severity,
        priority: decision.priority,
      });

      /*
       * The promise is only made when the ticket actually exists. Saying
       * "someone will get back to you" after the write failed is a lie the
       * buyer cannot detect — the exact silent-degrade shape
       * `audit-silent-degrade` R1 exists for.
       */
      replyText = escalated
        ? decision.buyerMessage
        : "I'm having trouble answering right now — please try again in a moment.";
    }
  }

  await appendAssistantTurn(user.id, question, replyText);

  return { text: replyText };
}
