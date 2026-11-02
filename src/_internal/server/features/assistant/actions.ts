import { logServerWarning } from "../../../../monitoring";
import { AuthorizationError } from "../../../../errors";
import { GroqModelProvider } from "../../../../providers/ai-groq";
import { getProviders } from "../../../../contracts/registry";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import type { IAssistantModelProvider } from "../../../../contracts/ai";
import { runAssistantTurn } from "./turn";
import { escalateToHuman } from "./escalate";
import { classifyEscalation } from "./severity";
import { BUILTIN_ASSISTANT_TOOLS } from "./tools/builtin";
import { mergeAssistantToolRegistries } from "./tools/registry";
import type { AnyAssistantToolDef } from "./tools/define";
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
  // A registered `aiProviders` list wins outright — this is the seam a
  // second vendor wires through, same as `payment`/`shipping` already do.
  const registered = getProviders().aiProviders;
  if (registered && registered.length > 0) return registered;
  // Env read happens inside the provider's own `turn()` call, never cached
  // at module load — see providers/ai-groq's docstring.
  return [new GroqModelProvider()];
}

/**
 * 🛑 `!== false` — the opposite polarity to `assertChatEnabled` in
 * `_internal/server/features/messages/actions.ts`. This is a kill switch on
 * an already-shipped path, not an opt-in for a new one: an unseeded
 * document, a never-written field, or a failed read must all mean ON, or a
 * settings outage silently takes the assistant down with no admin action.
 * Checked server-side so a stale client (the widget already rendered before
 * an admin flips the switch) cannot route around it.
 */
async function assertAssistantEnabled(): Promise<void> {
  const settings = await siteSettingsRepository.getSingleton();
  if (settings?.assistant?.enabled === false) {
    throw new AuthorizationError("The assistant is not currently available.");
  }
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

/**
 * Shared by both public entry points below — the refusal/escalation
 * handling is IDENTICAL regardless of who is asking or which tools they
 * have; only `roles` and `tools` differ. Extracted 2026-11-02 (Phase 2E-ii)
 * when `answerAdminAssistantQuestion` was added, rather than hand-copying
 * ~45 lines of escalation logic a second time (Duplication Decision
 * Framework's bug-fix-multiplier criterion — a fix to the refusal path
 * would otherwise need two commits).
 */
async function runAnswerTurn(
  user: AssistantUser,
  question: string,
  opts: { roles: readonly string[]; tools: readonly AnyAssistantToolDef[] },
): Promise<AssistantAnswer> {
  await assertAssistantEnabled();

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
      roles: opts.roles,
      /*
       * 🛑 "redacted", not "none" — free text can carry a phone number, an
       * email or an address at any time, and nothing stops the caller. See
       * redaction.ts's `assertAlreadyPublic` docstring for why "none" is
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
      tools: opts.tools,
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

/** The buyer-facing entry point — unchanged behaviour (`roles: ["buyer"]`, builtin tools only). */
export async function answerAssistantQuestion(
  user: AssistantUser,
  question: string,
): Promise<AssistantAnswer> {
  return runAnswerTurn(user, question, { roles: ["buyer"], tools: BUILTIN_ASSISTANT_TOOLS });
}

/**
 * The admin/seller-facing entry point — 2E-ii (overhaul brief). A SEPARATE
 * exported function rather than a `roles` parameter bolted onto
 * `answerAssistantQuestion`, because the two have different RBAC postures:
 * the buyer one is reachable by anyone signed in; this one is for a
 * session that has already passed an admin/seller gate at the ROUTE level
 * (mirroring every other admin-only surface in this codebase) — the
 * caller's own `roles` is trusted input here, not re-derived.
 *
 * `extraTools` is where `createSearchNavTool(...)` (or any other
 * consumer-supplied tool) joins the builtin set — appkit cannot import the
 * consumer's own nav tree, so the caller flattens it and passes the
 * resulting tool in.
 */
export async function answerAdminAssistantQuestion(
  user: AssistantUser,
  question: string,
  opts: { roles: readonly string[]; extraTools?: readonly AnyAssistantToolDef[] },
): Promise<AssistantAnswer> {
  return runAnswerTurn(user, question, {
    roles: opts.roles,
    tools: mergeAssistantToolRegistries(BUILTIN_ASSISTANT_TOOLS, opts.extraTools ?? []),
  });
}
