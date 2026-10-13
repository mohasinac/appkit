import { getAdminDb } from "../../../providers/db-firebase/admin";
import { normalizeError } from "../../../errors/normalize";
import { DatabaseError } from "../../../errors";
import { encryptPiiFields, decryptPiiFields, MESSAGE_PII_FIELDS } from "../../../security";
import {
  CONVERSATIONS_COLLECTION,
  MESSAGES_SUBCOLLECTION,
  MESSAGE_FIELDS,
  type MessageDocument,
} from "../schemas/firestore";

/**
 * `conversations/{id}/messages/{msgId}` — a SUBCOLLECTION, not an embedded
 * array. `supportTickets` embeds `messages[]` and appends with
 * `arrayUnion(prepareForFirestore(msg))`, which is correct for a ticket (a
 * bounded, closable record) and wrong here: a thread has no natural ceiling,
 * and a subcollection is concurrency-safe without `arrayUnion` — two replies
 * at once are two documents, never a lost write (the `item-requests/[id]/
 * replies` read-modify-write bug this avoids by construction).
 *
 * Plain functional module over `getAdminDb()`, matching the digital-code pool
 * precedent (`_internal/server/features/digital-code/pool.ts`) — BaseRepository
 * assumes a top-level collection and has no subcollection form.
 */

function messagesRef(conversationId: string) {
  return getAdminDb()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversationId)
    .collection(MESSAGES_SUBCOLLECTION);
}

function encryptMessage(data: Omit<MessageDocument, "id">): Omit<MessageDocument, "id"> {
  return encryptPiiFields(data, [...MESSAGE_PII_FIELDS]);
}

function decryptMessage(doc: MessageDocument): MessageDocument {
  return decryptPiiFields(doc, [...MESSAGE_PII_FIELDS]);
}

export interface CreateMessageInput {
  conversationId: string;
  authorId: string;
  body: string;
  clientMessageId: string;
  attachments?: string[];
  productRef?: MessageDocument["productRef"];
}

/**
 * Idempotent on `(conversationId, clientMessageId)` — a retry on a flaky
 * connection must not double-post. The doc id IS the client message id, so a
 * duplicate `set()` (non-merge) on an existing id throws `ALREADY_EXISTS`
 * rather than silently overwriting a different author's message that happened
 * to reuse an id (which cannot happen across conversations since this is
 * scoped under one, but a malicious resend of someone else's id must not
 * silently replace it either).
 */
export async function createMessage(input: CreateMessageInput): Promise<MessageDocument> {
  const ref = messagesRef(input.conversationId).doc(input.clientMessageId);

  try {
    const existing = await ref.get();
    if (existing.exists) {
      // Idempotent replay: the client retried, the server already has it.
      return decryptMessage({ id: existing.id, ...(existing.data() as Omit<MessageDocument, "id">) });
    }

    const now = new Date();
    const data: Omit<MessageDocument, "id"> = {
      conversationId: input.conversationId,
      authorId: input.authorId,
      body: input.body,
      clientMessageId: input.clientMessageId,
      createdAt: now,
      updatedAt: now,
      ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
      ...(input.productRef ? { productRef: input.productRef } : {}),
    };

    await ref.create(encryptMessage(data));
    return { id: ref.id, ...data };
  } catch (error) {
    void normalizeError(error);
    throw new DatabaseError(`Failed to create message in conversation ${input.conversationId}`, error);
  }
}

/**
 * Cursor-paginated, newest-first, `limit(30)` — the absence of a limit is
 * literally what made the old feature expensive (20 messages -> ~1,600 reads
 * across both participants' list refetches).
 */
export async function listMessages(
  conversationId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ items: MessageDocument[]; nextCursor: string | null }> {
  const limit = Math.min(opts.limit ?? 30, 50);
  try {
    let query = messagesRef(conversationId)
      .orderBy(MESSAGE_FIELDS.CREATED_AT, "desc")
      .limit(limit + 1);

    if (opts.cursor) {
      const cursorDoc = await messagesRef(conversationId).doc(opts.cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snap = await query.get();
    const docs = snap.docs.slice(0, limit);
    const items = docs.map((d) => decryptMessage({ id: d.id, ...(d.data() as Omit<MessageDocument, "id">) }));
    const nextCursor = snap.docs.length > limit ? docs[docs.length - 1].id : null;
    return { items, nextCursor };
  } catch (error) {
    void normalizeError(error);
    throw new DatabaseError(`Failed to list messages for conversation ${conversationId}`, error);
  }
}

/** Tombstone, never a hard delete of a single message — see schema comment. */
export async function softDeleteMessage(
  conversationId: string,
  messageId: string,
  deletedBy: string,
): Promise<void> {
  try {
    await messagesRef(conversationId).doc(messageId).update({
      deletedAt: new Date(),
      deletedBy,
      body: "",
      updatedAt: new Date(),
    });
  } catch (error) {
    void normalizeError(error);
    throw new DatabaseError(`Failed to delete message ${messageId}`, error);
  }
}

/**
 * Retention — delete every message in a conversation being pruned. Bounded
 * batches, never a whole-subcollection snapshot in one go for a thread that
 * somehow grew very large.
 */
export async function deleteAllMessages(conversationId: string): Promise<number> {
  const BATCH_SIZE = 400;
  const db = getAdminDb();
  let deleted = 0;
  for (;;) {
    const snap = await messagesRef(conversationId).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < BATCH_SIZE) break;
  }
  return deleted;
}

/** All attachment URLs across a conversation's messages — for retention's
 * "attachments die before the document" step. */
export async function listAllAttachmentUrls(conversationId: string): Promise<string[]> {
  const snap = await messagesRef(conversationId).get();
  const urls: string[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Pick<MessageDocument, "attachments">;
    if (data.attachments) urls.push(...data.attachments);
  }
  return urls;
}
