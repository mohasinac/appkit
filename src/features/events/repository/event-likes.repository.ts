/**
 * Event likes — toggle, count, and who liked recently.
 *
 * See `../schemas/likes.ts` for why the document id is the idempotency key
 * and why no display name is stored on the row.
 *
 * @tag domain:events
 * @tag layer:repository
 * @tag access:server-only
 */

import { normalizeError } from "../../../errors/normalize";
import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { BaseRepository } from "../../../providers/db-firebase";
import {
  EVENT_LIKES_COLLECTION,
  EVENT_LIKE_FIELDS,
  eventLikeId,
  LIKERS_PREVIEW_LIMIT,
  type EventLikeDocument,
} from "../schemas/likes";
import { EVENTS_COLLECTION } from "../schemas/firestore";

export interface ToggleLikeResult {
  /** The state AFTER the toggle — what the button should now show. */
  liked: boolean;
  /** The event's like count after the write. Safe to render directly. */
  likeCount: number;
}

class EventLikesRepository extends BaseRepository<EventLikeDocument> {
  constructor() {
    super(EVENT_LIKES_COLLECTION);
  }

  /**
   * Like if not liked, unlike if liked. Returns the resulting state.
   *
   * 🛑 ONE TRANSACTION, ONE READ. The counter lives on the event
   * (`stats.likeCount`) and the membership lives on the like document, so a
   * bare `increment()` beside a bare `set()` would double-count a
   * double-click: both writes would land and the count would say 2 for one
   * person. Reading the like document inside the transaction is what makes
   * the increment conditional on the membership actually changing.
   *
   * It is one read, not two — the event document is never read, because
   * `FieldValue.increment` does not need its current value.
   */
  async toggle(eventId: string, userId: string): Promise<ToggleLikeResult> {
    try {
      const db = this.db;
      const likeRef = this.getCollection().doc(eventLikeId(eventId, userId));
      const eventRef = db.collection(EVENTS_COLLECTION).doc(eventId);

      return await db.runTransaction(async (tx) => {
        const [likeSnap, eventSnap] = await Promise.all([tx.get(likeRef), tx.get(eventRef)]);

        if (!eventSnap.exists) {
          // Liking a deleted event would create a row nothing can ever clean
          // up — the cascade keys on the event existing.
          throw new DatabaseError(`Event not found: ${eventId}`);
        }

        const current = Number(
          (eventSnap.data() as { stats?: { likeCount?: number } } | undefined)?.stats?.likeCount ?? 0,
        );

        if (likeSnap.exists) {
          tx.delete(likeRef);
          // 🛑 Floor at zero. A count can only go negative if it drifted —
          // a row deleted by the tester cascade without the counter moving,
          // say — and a public "-1 likes" is worse than an understated 0.
          const next = Math.max(0, current - 1);
          tx.update(eventRef, { "stats.likeCount": next, updatedAt: new Date() });
          return { liked: false, likeCount: next };
        }

        tx.set(likeRef, {
          eventId,
          userId,
          createdAt: new Date(),
        });
        const next = current + 1;
        tx.update(eventRef, { "stats.likeCount": next, updatedAt: new Date() });
        return { liked: true, likeCount: next };
      });
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.error("eventLikes.toggle failed", { eventId, userId, message: e.message });
      throw new DatabaseError(`Failed to toggle like: ${e.message}`);
    }
  }

  /** Has this user liked it? One document read, no query, no index. */
  async hasLiked(eventId: string, userId: string): Promise<boolean> {
    try {
      const snap = await this.getCollection().doc(eventLikeId(eventId, userId)).get();
      return snap.exists;
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("eventLikes.hasLiked failed", { eventId, userId, message: e.message });
      // Fail CLOSED to "not liked": an unliked heart that turns out to be
      // liked is one wasted tap, and `toggle` is idempotent on the id so the
      // state self-corrects. Failing open would show a filled heart the user
      // cannot un-fill.
      return false;
    }
  }

  /**
   * The most recent likers' user ids, newest first.
   *
   * Needs the composite index `(eventId ASC, createdAt DESC)` — declared in
   * `appkit/firebase/base/firestore.indexes.json`. 🛑 Every like row is
   * written with `createdAt`, so the `orderBy` cannot silently exclude rows
   * the way an optional field would (Root Cause #100).
   */
  async recentLikerIds(
    eventId: string,
    limit: number = LIKERS_PREVIEW_LIMIT,
    offset = 0,
  ): Promise<string[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_LIKE_FIELDS.EVENT_ID, "==", eventId)
        .orderBy(EVENT_LIKE_FIELDS.CREATED_AT, "desc")
        .limit(limit + offset)
        .get();

      return snapshot.docs
        .slice(offset)
        .map((d) => String((d.data() as EventLikeDocument).userId))
        .filter(Boolean);
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("eventLikes.recentLikerIds failed", { eventId, message: e.message });
      return [];
    }
  }

  /**
   * Like timestamps for the engagement chart, newest first and BOUNDED.
   *
   * `max` exists because this is the one method that reads more than a
   * handful of rows, and an unbounded read on a popular event is exactly the
   * N-document scan Rule #6 budgets against. 200 rows covers a 14-day chart
   * at any volume worth plotting.
   */
  async recentLikeTimes(eventId: string, max = 200): Promise<Date[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_LIKE_FIELDS.EVENT_ID, "==", eventId)
        .orderBy(EVENT_LIKE_FIELDS.CREATED_AT, "desc")
        .limit(max)
        .get();

      return snapshot.docs
        .map((d) => {
          /*
           * Firestore hands back a Timestamp, the Admin SDK sometimes a Date,
           * and a seeded row a Date. Naming both shapes beats `unknown`: the
           * union is small, closed, and says what the field can actually be.
           */
          const raw = (d.data() as { createdAt?: Date | { toDate?: () => Date } })
            .createdAt;
          if (raw instanceof Date) return raw;
          return typeof raw?.toDate === "function" ? raw.toDate() : null;
        })
        .filter((d): d is Date => d !== null);
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("eventLikes.recentLikeTimes failed", { eventId, message: e.message });
      return [];
    }
  }
}

export const eventLikesRepository = new EventLikesRepository();
