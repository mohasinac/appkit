import { getAdminDb } from "../../../../providers/db-firebase";
import { logServerWarning } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";

/**
 * A4's token budget — clones `messageBudget`'s shape and REVERSES all three
 * of its trades, each for a stated reason.
 *
 * | `messageBudget`        | here                      | why |
 * |------------------------|---------------------------|-----|
 * | single doc, ~1 write/s | **sharded**               | a turn is N tool rounds and users are concurrent |
 * | fails **open**         | **fails CLOSED**          | failing open on a metered API is a spend vulnerability |
 * | counts calls           | counts **tokens**         | a 100k-token context is not one unit |
 *
 * 🛑 The fail-open half is not hypothetical: `reserveSend` returns
 * `{allowed: true}` when its transaction THROWS, and an unreadable
 * `siteSettings` falls back to defaults and continues. That is right for
 * email — refusing to send an order confirmation because a counter was
 * unreadable is worse than sending one over quota — and exactly wrong for a
 * metered LLM, where the failure mode is an unbounded bill.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:writes-firestore
 */

const COLLECTION = "assistantBudget";

/**
 * 🛑 Same `Asia/Kolkata` reasoning as `BUDGET_TIMEZONE`, and it is
 * load-bearing for the same reason: the `{shard}_{YYYY-MM-DD}` doc id must
 * mean the same calendar day on a Vercel lambda (UTC) and a regional
 * Function. A floating local date gives two partial budgets at midnight and
 * doubles the day's ceiling.
 */
const BUDGET_TIMEZONE = "Asia/Kolkata";

/**
 * Shard count. A turn spends several rounds, and users are concurrent, so a
 * single document would serialise every turn on one ~1 write/s hot key —
 * `message-budget`'s own docstring says to shard before any concurrent
 * fan-out. 10 keeps per-shard contention low while leaving the ceiling
 * exactly divisible, so no shard silently gets a larger slice.
 */
const SHARDS = 10;

/** Daily token ceiling across all shards. Override with ASSISTANT_TOKEN_BUDGET. */
const DEFAULT_DAILY_TOKENS = 200_000;

/** `en-CA` formats as YYYY-MM-DD natively. */
function budgetDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUDGET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dailyCeiling(): number {
  const raw = Number(process.env.ASSISTANT_TOKEN_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_TOKENS;
}

export interface BudgetDecision {
  allowed: boolean;
  /** Operator-facing. Never rendered to a buyer. */
  reason?: string;
}

/**
 * Reserve `tokens` against today's allowance.
 *
 * 🛑 Reserved BEFORE the model call, like `message-budget`, and for the same
 * reason: a call that is made and then fails has still been paid for. There
 * is deliberately no `release()` — a compensating decrement is what lets a
 * partially-failed turn double-refund itself back over the ceiling.
 *
 * 🛑 Estimate-then-reserve, not measure-then-charge. The real token count is
 * only known AFTER the response, which is too late to refuse it. The caller
 * passes a conservative estimate; over-reserving costs a little headroom,
 * under-reserving costs money.
 */
export async function reserveTokens(tokens: number): Promise<BudgetDecision> {
  /*
   * 🛑 The env kill switch is checked FIRST, before any I/O — "fails closed,
   * env kill switch first". An operator who needs to stop the spend must not
   * have that depend on Firestore being reachable.
   */
  if (process.env.ASSISTANT_DISABLED === "1") {
    return { allowed: false, reason: "ASSISTANT_DISABLED=1" };
  }

  const ceiling = dailyCeiling();
  const perShard = Math.floor(ceiling / SHARDS);
  const now = new Date();
  const date = budgetDate(now);
  // Random shard: spreads contention without needing per-user affinity.
  const shard = Math.floor(Math.random() * SHARDS);

  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION).doc(`${shard}_${date}`);

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used: number = snap.exists ? ((snap.data()?.tokens as number) ?? 0) : 0;

      if (used + tokens > perShard) {
        return {
          allowed: false,
          reason: `shard ${shard} would exceed its slice (${used}+${tokens} > ${perShard})`,
        };
      }

      tx.set(
        ref,
        { shard, date, tokens: used + tokens, updatedAt: now },
        { merge: true },
      );
      return { allowed: true };
    });
  } catch (err) {
    /*
     * 🛑 FAIL CLOSED — the single most important line in this file, and the
     * exact inversion of `reserveSend`, which returns `{allowed: true}` from
     * its own catch.
     *
     * If the counter cannot be read or written we do not know what has been
     * spent, and "unknown spend" on a metered API must resolve to "stop", not
     * "continue". The caller degrades visibly: the buyer gets a refusal and
     * an escalation, which is a worse answer and a bounded bill.
     */
    logServerWarning("[assistant] budget unavailable — refusing (fail-closed)", {
      error: normalizeError(err).message,
    });
    return { allowed: false, reason: "budget counter unavailable" };
  }
}

/**
 * Conservative pre-call estimate, in tokens.
 *
 * ~4 chars/token is the usual English approximation; this rounds UP and adds
 * the tool manifest and a full `maxOutputTokens` of headroom, because the
 * cost of over-estimating is a little unused allowance and the cost of
 * under-estimating is an unbounded bill.
 */
export function estimateTurnTokens(
  promptChars: number,
  maxOutputTokens: number,
  toolCount: number,
): number {
  const promptTokens = Math.ceil(promptChars / 4);
  // Each tool's JSON Schema plus description costs roughly this much context.
  const manifestTokens = toolCount * 120;
  return promptTokens + manifestTokens + maxOutputTokens;
}
