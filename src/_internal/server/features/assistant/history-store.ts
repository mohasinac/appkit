import { getAdminDb } from "../../../../providers/db-firebase";

/**
 * The assistant's OWN conversation history — one Firestore document per
 * user, holding a capped array of recent messages.
 *
 * ## 🛑 Not the buyer↔seller `conversations`/`messages` collections
 *
 * Earlier drafts of this feature rode the shared inbox: a synthetic
 * `"assistant"` participant, a real `conversations` row, `sendMessage()` /
 * `listMessagesForConversation()`. Owner's instruction (2026-10-31): drop
 * that entirely. The assistant chat is its own surface with its own history,
 * never mixed into the buyer↔seller inbox a human might also be reading.
 *
 * ## Why one document, not a subcollection
 *
 * `runAssistantTurn` only ever looks at the last `HISTORY_LIMIT` messages —
 * that was true of the old `mount-conversation.ts` too. A subcollection with
 * pagination would be solving a problem this feature does not have. One
 * document per user, capped array, read-modify-write under a transaction —
 * the same shape `assistantBudget` (`budget.ts`) already uses for its own
 * per-key document.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:writes-firestore
 */

const COLLECTION = "assistantHistory";

/** Mirrors `runAssistantTurn`'s own read window — more than this is never
 * consulted, so keeping more on the document would only grow the write. */
const HISTORY_LIMIT = 10;

export interface StoredAssistantMessage {
  role: "user" | "assistant";
  content: string;
  at: Date;
}

/** Oldest first — the same order `AssistantTurnInput.messages` expects. */
export async function getAssistantHistory(userId: string): Promise<StoredAssistantMessage[]> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(userId).get();
  const raw = snap.data()?.messages;
  return Array.isArray(raw) ? (raw as StoredAssistantMessage[]) : [];
}

/**
 * Append one question/answer pair and trim to `HISTORY_LIMIT`.
 *
 * 🛑 Read-modify-write under a transaction, not a blind `arrayUnion` — the
 * cap has to be enforced on the WRITER'S side, and `arrayUnion` cannot drop
 * from the front of an array (the same reason `withHistory`'s FIFO cap folds
 * entries in memory rather than trusting `arrayUnion`).
 */
export async function appendAssistantTurn(
  userId: string,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(userId);
  const now = new Date();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = Array.isArray(snap.data()?.messages)
      ? (snap.data()!.messages as StoredAssistantMessage[])
      : [];

    const next = [
      ...existing,
      { role: "user" as const, content: userMessage, at: now },
      { role: "assistant" as const, content: assistantMessage, at: now },
    ].slice(-HISTORY_LIMIT);

    tx.set(ref, { userId, messages: next, updatedAt: now }, { merge: true });
  });
}
