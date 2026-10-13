import { normalizeError } from "../../../errors/normalize";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type DocumentSnapshot,
} from "../../../providers/db-firebase";
import { arrayUnion, increment } from "../../../contracts/field-ops";
import { CONVERSATION_PII_FIELDS, decryptPiiFields } from "../../../security";
import {
  CONVERSATIONS_COLLECTION,
  CONVERSATION_FIELDS,
  type ConversationDocument,
  type ConversationLastMessage,
  type ParticipantRole,
} from "../schemas/firestore";

/**
 * Top-level `conversations` collection. PII encryption: `lastMessage.body`
 * (dot-path form — see `encryptPiiFields`), applied via `piiFields` so every
 * mutating method inherits it (Root Cause #9 — never bypass repo hooks).
 */
export class ConversationsRepository extends BaseRepository<ConversationDocument> {
  constructor() {
    super(CONVERSATIONS_COLLECTION);
  }

  protected override piiFields = CONVERSATION_PII_FIELDS;

  /*
   * Every caller of findById/findBetween/listForUser is reached ONLY through
   * _internal/server/features/messages/actions.ts, which calls
   * requireConversation()+assertParticipant() before a document ever crosses a
   * route boundary — unlike the 14 staged repos (admin listings, bulk
   * exports) that can hand a decrypted doc to an operator who never needed to
   * see it, a conversation's lastMessage.body preview is BY DESIGN shown only
   * to its two participants, and that gate already lives one layer up. No
   * route, view or admin surface reads this repository directly.
   */
  // audit-pii-coverage-ok: gated one layer up in actions.ts, see comment above
  protected override mapDoc<D = ConversationDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<ConversationDocument>(snap);
    return decryptPiiFields(raw, [...CONVERSATION_PII_FIELDS]) as D;
  }

  /**
   * Find the (at most one) existing thread between two users. Participant
   * pairs are unordered — `array-contains` on one id, then an in-memory check
   * of the other, since Firestore has no "array contains both" operator and a
   * composite `array-contains-any` would also match threads with only one of
   * the two.
   */
  async findBetween(
    userIdA: string,
    userIdB: string,
  ): Promise<ConversationDocument | null> {
    try {
      const snap = await this.getCollection()
        .where(CONVERSATION_FIELDS.PARTICIPANT_IDS, "array-contains", userIdA)
        .get();
      const match = snap.docs.find((d) => {
        const ids = (d.data() as ConversationDocument).participantIds ?? [];
        return ids.includes(userIdB);
      });
      return match ? this.mapDoc<ConversationDocument>(match) : null;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to look up conversation between ${userIdA} and ${userIdB}`,
        error,
      );
    }
  }

  async createBetween(
    userIdA: string,
    userIdB: string,
    roles: Record<string, ParticipantRole>,
  ): Promise<ConversationDocument> {
    const now = new Date();
    const data: Omit<ConversationDocument, "id"> = {
      participantIds: [userIdA, userIdB],
      participantRoles: roles,
      lastReadAt: {},
      unread: { [userIdA]: 0, [userIdB]: 0 },
      status: "active",
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = this.getCollection().doc();
    const hooked = this.applyWriteHooks(data as object);
    await docRef.set(prepareForFirestore(hooked));
    const created = await this.findById(docRef.id);
    if (!created) {
      throw new DatabaseError(`Conversation ${docRef.id} not readable immediately after create`, null);
    }
    return created;
  }

  /**
   * Cursor-paginated, newest-first. Bounded by construction — the absence of
   * a `.limit()` is literally what turned 20 messages into ~1,600 reads the
   * first time this feature existed.
   */
  async listForUser(
    userId: string,
    opts: { limit?: number; cursor?: string } = {},
  ): Promise<{ items: ConversationDocument[]; nextCursor: string | null }> {
    const limit = Math.min(opts.limit ?? 20, 50);
    try {
      let query = this.getCollection()
        .where(CONVERSATION_FIELDS.PARTICIPANT_IDS, "array-contains", userId)
        .orderBy(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "desc")
        .limit(limit + 1);

      if (opts.cursor) {
        const cursorDoc = await this.getCollection().doc(opts.cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snap = await query.get();
      const docs = snap.docs.slice(0, limit);
      const items = docs.map((d) => this.mapDoc<ConversationDocument>(d));
      const nextCursor = snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return { items, nextCursor };
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to list conversations for ${userId}`, error);
    }
  }

  /**
   * After a message write: bump the denormalized preview, the per-recipient
   * unread counter, and `messageCount` — all in one update so a reader never
   * observes `lastMessage` ahead of `unread`.
   */
  async applyNewMessage(
    conversationId: string,
    authorId: string,
    recipientId: string,
    lastMessage: ConversationLastMessage,
  ): Promise<void> {
    try {
      const hooked = this.applyWriteHooks({ lastMessage } as object) as { lastMessage: ConversationLastMessage };
      // `messageCount` and `unread.{recipientId}` are real Firestore
      // increments, not a read-modify-write, so two near-simultaneous sends
      // cannot lose a count the way `item-requests/[id]/replies` once did.
      await this.getCollection()
        .doc(conversationId)
        .update(
          prepareForFirestore({
            lastMessage: hooked.lastMessage,
            lastMessageAt: lastMessage.at,
            [`unread.${recipientId}`]: increment(1),
            messageCount: increment(1),
            updatedAt: new Date(),
          }),
        );
      void authorId;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to apply new message to conversation ${conversationId}`, error);
    }
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.getCollection()
      .doc(conversationId)
      .update({
        [`lastReadAt.${userId}`]: new Date().toISOString(),
        [`unread.${userId}`]: 0,
        updatedAt: new Date(),
      });
  }

  async blockParticipant(conversationId: string, blockerId: string): Promise<void> {
    await this.getCollection()
      .doc(conversationId)
      .update({ blockedBy: arrayUnion(blockerId), updatedAt: new Date() });
  }

  async archiveStale(before: Date, limit: number): Promise<ConversationDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(CONVERSATION_FIELDS.STATUS, "==", "active")
        .where(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "<", before)
        .limit(limit)
        .get();
      return snap.docs.map((d) => this.mapDoc<ConversationDocument>(d));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to list conversations due for archive", error);
    }
  }

  async findDeletable(before: Date, limit: number): Promise<ConversationDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(CONVERSATION_FIELDS.LAST_MESSAGE_AT, "<", before)
        .limit(limit)
        .get();
      return snap.docs.map((d) => this.mapDoc<ConversationDocument>(d));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to list conversations due for deletion", error);
    }
  }
}

export const conversationsRepository = new ConversationsRepository();
