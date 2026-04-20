import type { DocumentReference } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import {
  BaseRepository,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { generateSessionId } from "../token-helpers";
import {
  SESSION_COLLECTION,
  SESSION_EXPIRATION_MS,
  SESSION_FIELDS,
  type SessionCreateInput,
  type SessionDocument,
  type SessionUpdateInput,
} from "../schemas";

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
    lastActivity: { canFilter: true, canSort: true },
    expiresAt: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(SESSION_COLLECTION);
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

    const sessionData: Omit<SessionDocument, "id"> = {
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
    const updateData: Partial<SessionDocument> = {
      lastActivity: new Date(),
      ...(data?.location && { location: data.location }),
    };

    await this.update(sessionId, updateData);
  }

  async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    await this.update(sessionId, {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
    } as Partial<SessionDocument>);
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
        "desc",
      );

      if (options?.userId) {
        query = query.where(
          SESSION_FIELDS.USER_ID,
          "==",
          options.userId,
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
