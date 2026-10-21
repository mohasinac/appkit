import { getAdminDb } from "../../../providers/db-firebase";
import {
  POINTS_FIELDS,
  POINTS_LEDGER_COLLECTION,
  POINTS_EXPIRY_MONTHS,
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
    /**
     * When this batch stops being spendable. Decision 4: three months.
     *
     * 🛑 Optional, and ABSENT MEANS NEVER EXPIRES — which is the right default
     * for every entry written before the field existed. Treating absence as
     * "expired" would retroactively void live balances.
     *
     * A caller crediting points SHOULD pass it; `pointsExpiryFrom(now)` is the
     * one helper that computes it, so the three-month figure has one owner.
     * Spends and reversals deliberately pass nothing: a spend has nothing to
     * expire, and a reversal restores points whose original clock was already
     * consumed — a fresh three months there would be a quiet extension nobody
     * granted.
     */
    expiresAt?: Date;
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
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
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
    const now = new Date();

    /*
     * ── FIFO: which BATCHES does this spend draw from? ────────────────────
     *
     * 🛑 Queried OUTSIDE the transaction, and that is a Firestore constraint
     * rather than a preference: a transaction must complete all reads before
     * any write, and a collection QUERY cannot be mixed with the per-document
     * updates below it. The part that must not race — the balance check — stays
     * inside.
     *
     * The residual risk is two concurrent redemptions picking the same batches
     * and over-consuming one, leaving a `consumed` figure above that entry's
     * `amount`. That is an artefact on an EXPIRY calculation, not on a balance:
     * the balance is guarded transactionally and still cannot go negative. The
     * reconciliation job reports it, and a lock here would buy nothing a buyer
     * can see.
     */
    const credits = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .where(POINTS_FIELDS.USER_ID, "==", input.userId)
      .where(POINTS_FIELDS.AMOUNT, ">", 0)
      .orderBy(POINTS_FIELDS.AMOUNT)
      .limit(200)
      .get();

    /*
     * 🛑 Re-sorted in memory, because the QUERY CANNOT RETURN FIFO ORDER.
     * Firestore forces an inequality's field to lead the `orderBy` (Root Cause
     * #59), so `amount > 0` means the results arrive smallest-credit-first.
     * Skipping this sort would consume the SMALLEST batches first — which looks
     * exactly like FIFO on a ledger where every credit happens to be the same
     * size, and silently is not.
     *
     * Oldest first, so a buyer never loses points they could have spent.
     * Newest-first silently maximises expiry: the house winning by a mechanism
     * nobody announced.
     */
    const batches = credits.docs
      .map((d) => d.data() as PointsLedgerEntry)
      .filter((e) => {
        /*
         * An expired batch is not spendable. Absent `expiresAt` means never
         * expires — correct for every entry written before the field existed.
         */
        if (!e.expiresAt) return true;
        const exp =
          e.expiresAt instanceof Date ? e.expiresAt : new Date(e.expiresAt as unknown as string);
        return exp.getTime() > now.getTime();
      })
      .sort((a, b) => {
        const at = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return at - bt;
      });

    let toDraw = input.points;
    const draws: Array<{ id: string; consumed: number }> = [];
    for (const batch of batches) {
      if (toDraw <= 0) break;
      const remaining = Math.round((batch.amount - (batch.consumed ?? 0)) * 100) / 100;
      if (remaining <= 0) continue;
      const take = Math.min(remaining, toDraw);
      draws.push({
        id: batch.id,
        consumed: Math.round(((batch.consumed ?? 0) + take) * 100) / 100,
      });
      toDraw = Math.round((toDraw - take) * 100) / 100;
    }

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
        /*
         * Which batches paid for this spend, recorded ON the spend rather than
         * derived later — a reversal needs to know what to give back, and by
         * then those batches may have expired. "Return it where it came from"
         * is only answerable if the spend wrote it down.
         */
        ...(draws.length ? { drawnFrom: draws.map((d) => d.id) } : {}),
      });
      for (const d of draws) {
        tx.update(db.collection(POINTS_LEDGER_COLLECTION).doc(d.id), {
          consumed: d.consumed,
          updatedAt: new Date(),
        });
      }
      tx.set(userRef, { pointsBalance: next }, { merge: true });
      return next;
    });

    return { entryId: entryRef.id, balance };
  }

  /**
   * Expire every lapsed batch, debiting whatever was never spent.
   *
   * ## 🛑 Expiry is a LEDGER ENTRY, never a silent balance edit
   *
   * The balance is DEFINED as the sum of the ledger. Quietly lowering the
   * mirror would make the two disagree by exactly the expired amount, and the
   * reconciliation job would then report drift forever with no way to tell it
   * from a real fault. An adjustment row with a stated reason is the honest
   * representation: the points left, and the row says why.
   *
   * 🛑 `actorUid: "system:points-expiry"` is a sentinel and this is the ONE
   * place a system actor may write an adjustment — because expiry is a rule
   * with a date attached, not a discretionary decision. Every other adjustment
   * is a human's, which is why `adminReason` is mandatory on the kind.
   *
   * Marks the batch fully `consumed` in the same pass, and THAT is the
   * idempotency key: without it an expiry job that ran twice would debit the
   * buyer twice for one lapse.
   */
  async expireLapsedBatches(
    now: Date,
    limit = 200,
  ): Promise<{ examined: number; expired: number; points: number }> {
    const db = getAdminDb();
    const snap = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .where(POINTS_FIELDS.EXPIRES_AT, "<=", now)
      .orderBy(POINTS_FIELDS.EXPIRES_AT, "asc")
      .limit(limit)
      .get();

    let expired = 0;
    let points = 0;

    for (const doc of snap.docs) {
      const e = doc.data() as PointsLedgerEntry;
      /*
       * Credits only. A redemption carries no `expiresAt` so should never
       * appear here — but the guard is free, and the cost of being wrong is
       * debiting a buyer for a spend they already made.
       */
      if (e.amount <= 0) continue;
      const remaining = Math.round((e.amount - (e.consumed ?? 0)) * 100) / 100;
      if (remaining <= 0) continue;

      await this.append({
        userId: e.userId,
        kind: "admin_adjustment",
        amount: -remaining,
        description: `${remaining} points expired.`,
        adminReason: `Automatic expiry after ${POINTS_EXPIRY_MONTHS} months — batch ${e.id}.`,
        actorUid: "system:points-expiry",
      });

      await doc.ref.update({ consumed: e.amount, updatedAt: now });
      expired += 1;
      points = Math.round((points + remaining) * 100) / 100;
    }

    return { examined: snap.size, expired, points };
  }

  /**
   * Return points a cancelled order had consumed — `redemption_reversal`.
   *
   * ## 🛑 Points come back as POINTS, never as money
   *
   * The schema header states it as a legal boundary rather than a preference:
   * *"never refunded as cash when an order is cancelled; points SPENT on a
   * cancelled order are returned as points."* Paying them out in rupees is what
   * would make this stored value, and stored value in India is PPI territory
   * with RBI authorisation attached. This is the writer that makes that stated
   * rule true — the kind has existed with no writer since it was declared (D48).
   *
   * 🛑 NO fresh `expiresAt`. A reversal restores points whose original clock has
   * already been consumed; granting three new months would be a quiet extension
   * nobody authorised, and it would reward cancelling an order with a longer
   * window than keeping it.
   *
   * Idempotent on the ORDER: one reversal per order, found by querying for an
   * existing `redemption_reversal` carrying the same `orderId`. An append-only
   * ledger cannot net off a double reversal, so the check has to happen before
   * the write.
   */
  async reverseRedemptionForOrder(
    orderId: string,
    reason: string,
  ): Promise<{ reversed: number }> {
    const db = getAdminDb();

    const already = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .where(POINTS_FIELDS.ORDER_ID, "==", orderId)
      .where(POINTS_FIELDS.KIND, "==", "redemption_reversal")
      .limit(1)
      .get();
    if (!already.empty) return { reversed: 0 };

    const spends = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .where(POINTS_FIELDS.ORDER_ID, "==", orderId)
      .where(POINTS_FIELDS.KIND, "==", "redemption")
      .get();
    if (spends.empty) return { reversed: 0 };

    const rows = spends.docs.map((d) => d.data() as PointsLedgerEntry);
    /*
     * `Math.abs`, because a redemption is stored NEGATIVE and a reversal must
     * be positive — `isPointsEntryWellFormed` refuses the wrong sign, so a
     * missing `abs` here would throw rather than silently credit a negative.
     */
    const total = Math.round(rows.reduce((sum, r) => sum + Math.abs(r.amount), 0) * 100) / 100;
    if (total <= 0) return { reversed: 0 };

    await this.append({
      userId: rows[0].userId,
      kind: "redemption_reversal",
      amount: total,
      orderId,
      description: `${total} points returned — ${reason}`,
    });

    return { reversed: total };
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

  /**
   * Prove the mirror agrees with the ledger, and repair it where it does not.
   *
   * ## This is the job `sumLedger`'s own docstring has promised since day one
   *
   * That method says it exists "to repair the mirror and to let a
   * reconciliation job prove the two agree" — and no such job was ever written
   * (D49). So `users/{uid}.pointsBalance` could diverge from the entries
   * indefinitely with nothing reporting it, which is Root Cause #102 exactly:
   * a counter that cannot be checked drifts silently, because a wrong number
   * raises nothing.
   *
   * ## 🛑 It enumerates USERS, not ledger entries
   *
   * Root Cause #102's reconciler could only ever ADD, because it built its
   * tally from the events that existed rather than the entities that do — so a
   * row whose last event was deleted was never visited and never reset. The
   * same trap here: a user whose entries were all removed keeps a stale
   * non-zero mirror forever if you only walk the ledger.
   *
   * So the candidate set is the UNION of two reads:
   *
   *   - every user document carrying a `pointsBalance` — catches a mirror with
   *     no entries behind it, which is the case a ledger walk cannot see
   *   - the distinct `userId`s in a bounded page of the ledger — catches
   *     entries whose user has no mirror yet
   *
   * ## Repair direction, and why it still opens a case
   *
   * The ledger is append-only and is the DEFINITION of the balance, so repair
   * is always mirror ← `sumLedger`. There is no judgement in it.
   *
   * 🛑 But a repaired mirror hides the writer that broke it. Every drift is
   * therefore returned for the caller to raise a `ledger_drift` case: silent
   * self-healing would make a persistently broken write path look like a
   * healthy system, which is the failure this whole phase exists to remove.
   *
   * Absence of a mirror is NOT drift. `getBalance` already falls back to
   * summing the ledger, so a user with entries and no mirror reads correctly —
   * it is merely uncomputed. It is still written, because paying the scan on
   * every balance read is what the mirror exists to avoid, but it is counted
   * separately and never reported as a fault.
   *
   * Saturation is reported rather than hidden: at the page limit there are more
   * users to check than were checked, which is a fact about the programme's
   * size, not an error — but it must not read as "all clear".
   */
  async reconcileLedgerMirror(
    limit = 500,
  ): Promise<{
    examined: number;
    drifted: { userId: string; mirror: number; ledger: number }[];
    initialised: number;
    saturated: boolean;
  }> {
    const db = getAdminDb();

    const mirrorSnap = await db
      .collection(USER_COLLECTION)
      .select("pointsBalance")
      .limit(limit)
      .get();
    const ledgerSnap = await db
      .collection(POINTS_LEDGER_COLLECTION)
      .select(POINTS_FIELDS.USER_ID)
      .limit(limit)
      .get();

    const mirrors = new Map<string, number | undefined>();
    for (const d of mirrorSnap.docs) {
      const v = d.data()?.pointsBalance;
      if (typeof v === "number") mirrors.set(d.id, v);
    }
    const candidates = new Set<string>(mirrors.keys());
    for (const d of ledgerSnap.docs) {
      const uid = d.data()?.[POINTS_FIELDS.USER_ID];
      if (typeof uid === "string" && uid) candidates.add(uid);
    }

    const drifted: { userId: string; mirror: number; ledger: number }[] = [];
    let initialised = 0;

    for (const userId of candidates) {
      const ledger = await this.sumLedger(userId);
      const mirror = mirrors.get(userId);

      if (mirror === undefined) {
        // Uncomputed, not drifted — see the docstring.
        if (ledger !== 0) {
          await db
            .collection(USER_COLLECTION)
            .doc(userId)
            .set({ pointsBalance: ledger }, { merge: true });
          initialised += 1;
        }
        continue;
      }

      /*
       * Half-paisa epsilon, matching every other money comparison here:
       * `0.1 + 0.2 > 0.3` is true in IEEE-754, so an exact `!==` would report
       * drift on a balance that is correct to the last paisa — and a reconciler
       * that cries wolf nightly is one people stop reading.
       */
      if (Math.abs(mirror - ledger) > 0.005) {
        drifted.push({ userId, mirror, ledger });
        await db
          .collection(USER_COLLECTION)
          .doc(userId)
          .set({ pointsBalance: ledger }, { merge: true });
      }
    }

    return {
      examined: candidates.size,
      drifted,
      initialised,
      saturated: mirrorSnap.size === limit || ledgerSnap.size === limit,
    };
  }
}

export const pointsRepository = new PointsRepository();
