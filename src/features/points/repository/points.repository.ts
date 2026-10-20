import { getAdminDb } from "../../../providers/db-firebase";
import {
  POINTS_FIELDS,
  POINTS_LEDGER_COLLECTION,
  isPointsEntryWellFormed,
  type PointsEntryKind,
  type PointsLedgerEntry,
} from "../schemas/firestore";
import { USER_COLLECTION } from "../../auth/schemas/firestore";

/**
 * The points ledger: append-only entries, and a balance that is their sum.
 *
 * ## 🛑 Every mutation is a TRANSACTION over the ledger and the mirror
 *
 * `users/{uid}.pointsBalance` is a denormalised mirror of the ledger, kept so
 * a page can show a balance in one read instead of scanning an unbounded
 * collection. Root Cause #42 is explicit about what happens to a mirror the
 * moment one write path forgets it, and this mirror guards MONEY-SHAPED value:
 * drift here either hands a buyer points nobody credited, or swallows points
 * they earned.
 *
 * So the entry and the mirror move together or not at all, and the mirror is
 * incremented from the value read INSIDE the transaction rather than from a
 * figure the caller passed in — two concurrent credits that each read "53" and
 * each wrote "106" would lose one of them.
 *
 * `redeem()` additionally re-checks the balance inside the transaction. A
 * caller that validated the balance a moment earlier is working from a read
 * that may already be stale, and the failure mode is a negative balance — the
 * one state this ledger must never reach.
 */
export class PointsRepository {
  /**
   * Current balance, from the mirror.
   *
   * 🛑 Falls back to summing the ledger when the mirror is absent, rather than
   * returning 0. An unseeded or pre-feature user document has no
   * `pointsBalance`, and answering "0" for someone with real credits would
   * silently deny them money they are owed. Absence means "not computed yet",
   * never "nothing".
   */
  async getBalance(userId: string): Promise<number> {
    const db = getAdminDb();
    const snap = await db.collection(USER_COLLECTION).doc(userId).get();
    const mirrored = snap.data()?.pointsBalance;
    if (typeof mirrored === "number") return mirrored;
    return this.sumLedger(userId);
  }

  /**
   * The authoritative balance, computed from the entries themselves.
   *
   * Unbounded by nature, so it is NOT the read path — it exists to repair the
   * mirror and to let a reconciliation job prove the two agree.
   */
  async sumLedger(userId: string): Promise<number> {
    const db = getAdminDb();
    const rows = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .where(POINTS_FIELDS.USER_ID, "==", userId)
      .select(POINTS_FIELDS.AMOUNT)
      .get();
    const total = rows.docs.reduce((sum, d) => sum + (Number(d.data().amount) || 0), 0);
    return Math.round(total * 100) / 100;
  }

  /**
   * Append an entry and move the mirror, atomically.
   *
   * Returns the new balance so a caller can report it without a second read.
   */
  async append(input: {
    userId: string;
    kind: PointsEntryKind;
    amount: number;
    description: string;
    orderId?: string;
    adminReason?: string;
    actorUid?: string;
  }): Promise<{ entryId: string; balance: number }> {
    if (!isPointsEntryWellFormed(input)) {
      /*
       * 🛑 Throws rather than writing a row it knows is malformed. A ledger
       * whose invariant is only enforced by its callers is a ledger whose
       * invariant is not enforced — and a zero-amount or wrong-signed entry is
       * invisible in a balance while being wrong in an audit.
       */
      throw new Error(
        `Malformed points entry: kind=${input.kind} amount=${input.amount}`,
      );
    }

    const db = getAdminDb();
    const entryRef = db.collection(POINTS_LEDGER_COLLECTION).doc();
    const userRef = db.collection(USER_COLLECTION).doc(input.userId);

    const balance = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const current =
        typeof userSnap.data()?.pointsBalance === "number"
          ? (userSnap.data()!.pointsBalance as number)
          : 0;
      const next = Math.round((current + input.amount) * 100) / 100;

      const entry: PointsLedgerEntry = {
        id: entryRef.id,
        userId: input.userId,
        kind: input.kind,
        amount: input.amount,
        description: input.description,
        ...(input.orderId ? { orderId: input.orderId } : {}),
        ...(input.adminReason ? { adminReason: input.adminReason } : {}),
        ...(input.actorUid ? { actorUid: input.actorUid } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PointsLedgerEntry;

      tx.set(entryRef, entry);
      tx.set(userRef, { pointsBalance: next }, { merge: true });
      return next;
    });

    return { entryId: entryRef.id, balance };
  }

  /**
   * Spend points against an order.
   *
   * 🛑 `points` is given POSITIVE and stored NEGATIVE. The caller is saying
   * "spend 53", and making them pass `-53` is an invitation to pass `53` by
   * mistake and credit somebody instead of charging them.
   *
   * Re-reads the balance inside the transaction and refuses rather than going
   * negative — see the class header.
   */
  async redeem(input: {
    userId: string;
    points: number;
    orderId: string;
    description: string;
  }): Promise<{ entryId: string; balance: number }> {
    if (!Number.isFinite(input.points) || input.points <= 0) {
      throw new Error(`Redemption must be positive, got ${input.points}`);
    }

    const db = getAdminDb();
    const entryRef = db.collection(POINTS_LEDGER_COLLECTION).doc();
    const userRef = db.collection(USER_COLLECTION).doc(input.userId);

    const balance = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const current =
        typeof userSnap.data()?.pointsBalance === "number"
          ? (userSnap.data()!.pointsBalance as number)
          : 0;
      if (current < input.points) {
        throw new Error("INSUFFICIENT_POINTS");
      }
      const next = Math.round((current - input.points) * 100) / 100;

      tx.set(entryRef, {
        id: entryRef.id,
        userId: input.userId,
        kind: "redemption",
        amount: -input.points,
        orderId: input.orderId,
        description: input.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      tx.set(userRef, { pointsBalance: next }, { merge: true });
      return next;
    });

    return { entryId: entryRef.id, balance };
  }

  /** Most recent entries first, for the buyer's own points page. */
  async listForUser(userId: string, limit = 50): Promise<PointsLedgerEntry[]> {
    const db = getAdminDb();
    const rows = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .where(POINTS_FIELDS.USER_ID, "==", userId)
      .orderBy(POINTS_FIELDS.CREATED_AT, "desc")
      .limit(limit)
      .get();
    return rows.docs.map((d) => d.data() as PointsLedgerEntry);
  }
}

export const pointsRepository = new PointsRepository();
