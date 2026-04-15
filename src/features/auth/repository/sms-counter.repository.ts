import { BaseRepository } from "../../../providers/db-firebase";
import {
  SMS_COUNTERS_COLLECTION,
  SMS_COUNTER_FIELDS,
  SMS_DAILY_LIMIT,
  type SmsCounterDocument,
} from "../schemas";

export class SmsCounterRepository extends BaseRepository<SmsCounterDocument> {
  constructor() {
    super(SMS_COUNTERS_COLLECTION);
  }

  async checkAndIncrement(
    dateStr: string,
  ): Promise<{ allowed: boolean; count: number }> {
    const db = this.db;
    const docRef = db.collection(this.collection).doc(dateStr);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const current: number = snap.exists
        ? ((snap.data()?.[SMS_COUNTER_FIELDS.COUNT] as number) ?? 0)
        : 0;

      if (current >= SMS_DAILY_LIMIT) {
        return { allowed: false, count: current };
      }

      const newCount = current + 1;
      tx.set(
        docRef,
        {
          [SMS_COUNTER_FIELDS.DATE]: dateStr,
          [SMS_COUNTER_FIELDS.COUNT]: newCount,
          [SMS_COUNTER_FIELDS.UPDATED_AT]: new Date(),
        },
        { merge: true },
      );

      return { allowed: true, count: newCount };
    });
  }

  async getCount(dateStr: string): Promise<number> {
    const snap = await this.db.collection(this.collection).doc(dateStr).get();
    return snap.exists
      ? ((snap.data()?.[SMS_COUNTER_FIELDS.COUNT] as number) ?? 0)
      : 0;
  }

  async checkAndSetUserCooldown(
    userId: string,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const cooldownMs = 15 * 60 * 1000;
    const docId = `user_cooldown_${userId}`;
    const docRef = this.db.collection(this.collection).doc(docId);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const lastRequestedAt: Date | null = snap.exists
        ? (snap.data()?.lastRequestedAt?.toDate?.() ?? null)
        : null;

      if (lastRequestedAt) {
        const elapsed = Date.now() - lastRequestedAt.getTime();
        if (elapsed < cooldownMs) {
          const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
          return { allowed: false, retryAfterSeconds };
        }
      }

      tx.set(docRef, { lastRequestedAt: new Date() }, { merge: true });
      return { allowed: true, retryAfterSeconds: 0 };
    });
  }
}

export const smsCounterRepository = new SmsCounterRepository();
