import { normalizeError } from "../../../errors/normalize";
import type { DocumentReference } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import {
  BaseRepository,
  parseSieveDateValue,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { generateSessionId } from "../token-helpers";
import { maskPii, revealPii } from "../../../security/pii-accessors";
import {
  SESSION_COLLECTION,
  SESSION_EXPIRATION_MS,
  SESSION_FIELDS,
  type SessionCreateInput,
  type SessionDocument,
  type SessionPlain,
  type SessionUpdateInput,
} from "../schemas";
import type { JsonValue } from "@mohasinac/appkit";

export class SessionRepository extends BaseRepository<SessionDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    userId: { canFilter: true, canSort: false },
    isActive: { canFilter: true, canSort: false },
    "deviceInfo.browser": {
      path: "deviceInfo.browser",
      canFilter: true,
      canSort: false,
    },
    "deviceInfo.os": {
      path: "deviceInfo.os",
      canFilter: true,
      canSort: false,
    },
    lastActivity: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    expiresAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  /**
   * Session PII, encrypted by BaseRepository's write hooks.
   *
   * This repository had no encryption at all — `createSession` calls
   * `createWithId`, and before the hooks existed that method applied nothing —
   * so device IPs, user agents and city were stored in cleartext.
   *
   * `deviceInfo.browser` / `deviceInfo.os` are deliberately NOT here: they are
   * low-entropy strings the admin sessions view filters on (see SIEVE_FIELDS
   * above), and encrypting them would break those queries while revealing
   * nothing an IP does not.
   */
  protected override piiFields = [
    "deviceInfo.ip",
    "deviceInfo.userAgent",
    "location.city",
  ] as const;

  constructor() {
    super(SESSION_COLLECTION);
  }

  /** Decrypt on read so callers see the same shape they wrote. */
  /*
   * 🛑 `mapDoc` is NOT overridden — it used to decrypt on every read, so the
   * device IP and user-agent of every session left the database in the clear.
   *
   * All three PII fields here are NESTED, which is why `maskPii` had to learn
   * dotted paths rather than skip them: a masked session that returned the real
   * IP would be a function whose name is the only evidence it did anything.
   */

  /**
   * Plaintext PII. **Opt-in and named** — for the security page that shows a
   * user their own sessions, and for abuse investigation.
   */
  revealSession(doc: SessionDocument): SessionPlain {
    return revealPii<SessionPlain>(doc, this.piiFields);
  }

  /** As `revealSession`, for a list read. */
  revealSessions(docs: readonly SessionDocument[]): SessionPlain[] {
    return docs.map((d) => this.revealSession(d));
  }

  /**
   * Masked PII — the default. `deviceInfo.ip` becomes a last-four mask, which
   * is what every admin surface here actually needs: enough to tell two
   * sessions apart, not enough to geolocate a person.
   */
  maskedSession(doc: SessionDocument): SessionPlain {
    return maskPii<SessionPlain>(doc, this.piiFields);
  }

  /** As `maskedSession`, for a list read. */
  maskedSessions(docs: readonly SessionDocument[]): SessionPlain[] {
    return docs.map((d) => this.maskedSession(d));
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<SessionDocument>> {
    return this.sieveQuery<SessionDocument>(
      model,
      SessionRepository.SIEVE_FIELDS,
    );
  }

  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<SessionDocument>> {
    return this.sieveQuery<SessionDocument>(
      model,
      SessionRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(
          SESSION_FIELDS.USER_ID,
          "==",
          userId,
        ),
      },
    );
  }

  async createSession(
    userId: string,
    data: Omit<SessionCreateInput, "userId" | "expiresAt" | "isActive">,
  ): Promise<SessionDocument> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_MS);
    const sessionId = generateSessionId();

    // Plain in, ciphertext out — the write hook encrypts the three nested
    // `piiFields` paths below.
    const sessionData: Omit<SessionPlain, "id"> = {
      userId,
      deviceInfo: data.deviceInfo,
      location: data.location,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      isActive: true,
    };

    return this.createWithId(sessionId, sessionData);
  }

  async updateActivity(
    sessionId: string,
    data?: Partial<SessionUpdateInput>,
  ): Promise<void> {
    const updateData: Partial<SessionPlain> = {
      lastActivity: new Date(),
    };

    // Firestore `.update()` REPLACES a map field wholesale — it does not merge.
    // Passing `location` straight through therefore destroyed whichever of
    // `{ country, city }` the caller happened to omit, and `location.city` is
    // PII-encrypted, so the loss is unrecoverable. Same footgun the profile
    // route documents for `uiPreferences`.
    //
    // Latent rather than live: both current callers pass no `data` at all, so
    // this branch never runs today. It costs one read, and only on the branch
    // that supplies a location — the hot activity ping stays a single write.
    if (data?.location) {
      const current = await this.findById(sessionId); // mapDoc → already decrypted
      /*
     * Merged off the REVEALED current session, not the stored one.
     *
     * `location.city` is one of this repository's three nested PII paths, so
     * `current.location` holds ciphertext — spreading it into a plaintext
     * patch would re-encrypt the city on the way down and make it
     * permanently unreadable, the same defect as the payout crons.
     */
    const currentPlain = current ? this.revealSession(current) : null;
    updateData.location = {
      ...(currentPlain?.location ?? {}),
      ...(data.location as Partial<SessionPlain>["location"]),
    };
    }

    try {
      await this.update(sessionId, updateData);
    } catch (err: unknown) {
      void normalizeError(err);
      // The session doc may have been revoked/expired/wiped while the client
      // still holds the cookie. Firestore Admin throws `5 NOT_FOUND` in that
      // case — swallow it so the activity ping is best-effort, not a 500.
      // Any other error is rethrown so genuine failures still surface.
      //
      // BaseRepository.update() wraps Firestore errors in DatabaseError, so we
      // must also inspect .data (the original cause) for the NOT_FOUND signal.
      const code = (err as { code?: JsonValue })?.code;
      const msg = (err as { message?: string })?.message ?? "";
      const cause = (err as { data?: unknown })?.data;
      const causeCode = (cause as { code?: JsonValue })?.code;
      const causeMsg = (cause as { message?: string })?.message ?? "";
      const isNotFound =
        code === 5 ||
        code === "not-found" ||
        causeCode === 5 ||
        causeCode === "not-found" ||
        /No document to update|NOT_FOUND/i.test(msg) ||
        /No document to update|NOT_FOUND/i.test(causeMsg);
      if (!isNotFound) throw err;
    }
  }

  async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    await this.update(sessionId, {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
    } as Partial<SessionPlain>);
  }

  async revokeAllUserSessions(
    userId: string,
    revokedBy: string,
  ): Promise<number> {
    const sessions = await this.findActiveByUser(userId);

    for (const session of sessions) {
      await this.revokeSession(session.id, revokedBy);
    }

    return sessions.length;
  }

  async findActiveByUser(userId: string): Promise<SessionDocument[]> {
    try {
      const now = new Date();
      const snapshot = await this.getCollection()
        .where(SESSION_FIELDS.USER_ID, "==", userId)
        .where(SESSION_FIELDS.IS_ACTIVE, "==", true)
        .where(SESSION_FIELDS.EXPIRES_AT, ">", now)
        .orderBy(SESSION_FIELDS.EXPIRES_AT, "desc")
        .orderBy(SESSION_FIELDS.LAST_ACTIVITY, "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<SessionDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find active sessions for user: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async findAllByUser(
    userId: string,
    limitCount = 10,
  ): Promise<SessionDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(SESSION_FIELDS.USER_ID, "==", userId)
        .orderBy(SESSION_FIELDS.CREATED_AT, "desc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<SessionDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find all sessions for user: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async findActiveSession(sessionId: string): Promise<SessionDocument | null> {
    const session = await this.findById(sessionId);

    if (!session) return null;
    if (!session.isActive) return null;
    if (session.expiresAt < new Date()) return null;

    return session;
  }

  async getAllActiveSessions(limitCount = 100): Promise<SessionDocument[]> {
    try {
      const now = new Date();
      const snapshot = await this.getCollection()
        .where(SESSION_FIELDS.IS_ACTIVE, "==", true)
        .where(SESSION_FIELDS.EXPIRES_AT, ">", now)
        .orderBy(SESSION_FIELDS.EXPIRES_AT, "desc")
        .orderBy(SESSION_FIELDS.LAST_ACTIVITY, "desc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<SessionDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to get all active sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const snapshot = await this.getCollection()
        .where(SESSION_FIELDS.EXPIRES_AT, "<=", now)
        .limit(500)
        .get();

      let count = 0;
      for (const doc of snapshot.docs) {
        await this.delete(doc.id);
        count++;
      }

      return count;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to cleanup expired sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async countActiveByUser(userId: string): Promise<number> {
    const sessions = await this.findActiveByUser(userId);
    return sessions.length;
  }

  async getStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    uniqueUsers: number;
    recentActivity: number;
  }> {
    try {
      const allSessions = await this.getAllActiveSessions(1000);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const uniqueUsers = new Set(allSessions.map((session) => session.userId))
        .size;
      const recentActivity = allSessions.filter((session) => {
        const lastActivity =
          session.lastActivity instanceof Date
            ? session.lastActivity
            : new Date(session.lastActivity);
        return lastActivity >= yesterday;
      }).length;

      const now = new Date();
      const expiredSnapshot = await this.getCollection()
        .where(SESSION_FIELDS.EXPIRES_AT, "<=", now)
        .limit(1000)
        .get();

      return {
        totalActive: allSessions.length,
        totalExpired: expiredSnapshot.size,
        uniqueUsers,
        recentActivity,
      };
    } catch (error) {
      void normalizeError(error);
      serverLogger.error("Error getting session stats", { error });
      return {
        totalActive: 0,
        totalExpired: 0,
        uniqueUsers: 0,
        recentActivity: 0,
      };
    }
  }

  async findAllForAdmin(options?: {
    userId?: string;
    limit?: number;
    isActive?: boolean;
    sortAscending?: boolean;
  }): Promise<{
    sessions: SessionDocument[];
    stats: {
      totalActive: number;
      totalExpired: number;
      uniqueUsers: number;
      recentActivity: number;
    };
  }> {
    try {
      let query = this.getCollection().orderBy(
        SESSION_FIELDS.LAST_ACTIVITY,
        options?.sortAscending ? "asc" : "desc",
      );

      if (options?.userId) {
        query = query.where(
          SESSION_FIELDS.USER_ID,
          "==",
          options.userId,
        ) as typeof query;
      }

      if (options?.isActive !== undefined) {
        query = query.where(
          SESSION_FIELDS.IS_ACTIVE,
          "==",
          options.isActive,
        ) as typeof query;
      }

      if (options?.limit && options.limit > 0) {
        query = query.limit(options.limit) as typeof query;
      }

      const snapshot = await query.get();
      const sessions: SessionDocument[] = [];
      const userIds = new Set<string>();
      let totalActive = 0;
      let totalExpired = 0;
      const now = Date.now();
      const fifteenMinutesAgo = now - 15 * 60 * 1000;

      for (const doc of snapshot.docs) {
        const session = this.mapDoc<SessionDocument>(doc);
        const expiresAt =
          session.expiresAt instanceof Date
            ? session.expiresAt.getTime()
            : new Date(session.expiresAt).getTime();

        if (expiresAt < now) {
          totalExpired++;
        } else {
          totalActive++;
        }

        userIds.add(session.userId);
        sessions.push(session);
      }

      const recentActivity = sessions.filter((session) => {
        const lastActivity =
          session.lastActivity instanceof Date
            ? session.lastActivity.getTime()
            : new Date(session.lastActivity).getTime();
        return lastActivity > fifteenMinutesAgo;
      }).length;

      return {
        sessions,
        stats: {
          totalActive,
          totalExpired,
          uniqueUsers: userIds.size,
          recentActivity,
        },
      };
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to fetch admin sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Cloud Functions: return refs for expired sessions for caller-managed batch deletion.
   * Complements cleanupExpiredSessions() with a composable batch-friendly variant.
   */
  async getExpiredRefs(now: Date): Promise<DocumentReference[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(SESSION_FIELDS.EXPIRES_AT, "<", now)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

export const sessionRepository = new SessionRepository();
