import "server-only";
import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { BaseRepository } from "../../../providers/db-firebase";
import {
  TOKEN_PII_FIELDS,
  TOKEN_PII_INDEX_MAP,
  addPiiIndices,
  decryptPiiFields,
  encryptPiiFields,
  piiBlindIndex,
} from "../../../security";
import { resolveDate } from "../../../utils";
import {
  EMAIL_VERIFICATION_COLLECTION,
  PASSWORD_RESET_COLLECTION,
  TOKEN_FIELDS,
  type EmailVerificationTokenDocument,
  type PasswordResetTokenDocument,
} from "../schemas";

export class EmailVerificationTokenRepository extends BaseRepository<EmailVerificationTokenDocument> {
  constructor() {
    super(EMAIL_VERIFICATION_COLLECTION);
  }

  protected override mapDoc<D = EmailVerificationTokenDocument>(
    snap: DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<EmailVerificationTokenDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...TOKEN_PII_FIELDS,
    ]) as unknown as D;
  }

  override async create(
    data: Partial<EmailVerificationTokenDocument>,
  ): Promise<EmailVerificationTokenDocument> {
    let encrypted = encryptPiiFields(
      data as unknown as Record<string, unknown>,
      [...TOKEN_PII_FIELDS],
    );
    encrypted = addPiiIndices(
      data as unknown as Record<string, unknown>,
      TOKEN_PII_INDEX_MAP,
    );
    const merged = {
      ...encrypted,
      ...addPiiIndices(
        data as unknown as Record<string, unknown>,
        TOKEN_PII_INDEX_MAP,
      ),
    };
    return super.create(merged);
  }

  async findByToken(
    token: string,
  ): Promise<EmailVerificationTokenDocument | null> {
    return this.findOneBy(TOKEN_FIELDS.TOKEN, token);
  }

  async findByUserId(
    userId: string,
  ): Promise<EmailVerificationTokenDocument[]> {
    return this.findBy(TOKEN_FIELDS.USER_ID, userId);
  }

  async findByEmail(email: string): Promise<EmailVerificationTokenDocument[]> {
    const byIndex = await this.findBy(
      TOKEN_FIELDS.EMAIL_INDEX,
      piiBlindIndex(email),
    );
    if (byIndex.length) return byIndex;
    return this.findBy(TOKEN_FIELDS.EMAIL, email);
  }

  isExpired(token: EmailVerificationTokenDocument): boolean {
    const expiresAt = resolveDate(token.expiresAt);
    return !expiresAt || new Date() > expiresAt;
  }

  async deleteExpired(): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(TOKEN_FIELDS.EXPIRES_AT, "<", new Date())
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError("Failed to delete expired tokens", error);
    }
  }

  async getExpiredRefs(
    now: Date,
  ): Promise<FirebaseFirestore.DocumentReference[]> {
    const snapshot = await this.getCollection()
      .where(TOKEN_FIELDS.EXPIRES_AT, "<", now)
      .get();
    return snapshot.docs.map((doc) => doc.ref);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    try {
      const tokens = await this.findByUserId(userId);
      const batch = this.db.batch();

      tokens.forEach((token) => {
        if (token.id) {
          batch.delete(this.getCollection().doc(token.id));
        }
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete tokens for user: ${userId}`,
        error,
      );
    }
  }
}

export class PasswordResetTokenRepository extends BaseRepository<PasswordResetTokenDocument> {
  constructor() {
    super(PASSWORD_RESET_COLLECTION);
  }

  protected override mapDoc<D = PasswordResetTokenDocument>(
    snap: DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<PasswordResetTokenDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...TOKEN_PII_FIELDS,
    ]) as unknown as D;
  }

  override async create(
    data: Partial<PasswordResetTokenDocument>,
  ): Promise<PasswordResetTokenDocument> {
    let encrypted = encryptPiiFields(
      data as unknown as Record<string, unknown>,
      [...TOKEN_PII_FIELDS],
    );
    encrypted = {
      ...encrypted,
      ...addPiiIndices(
        data as unknown as Record<string, unknown>,
        TOKEN_PII_INDEX_MAP,
      ),
    };
    return super.create(encrypted);
  }

  async findByToken(token: string): Promise<PasswordResetTokenDocument | null> {
    return this.findOneBy(TOKEN_FIELDS.TOKEN, token);
  }

  async findByUserId(userId: string): Promise<PasswordResetTokenDocument[]> {
    return this.findBy(TOKEN_FIELDS.USER_ID, userId);
  }

  async findByEmail(email: string): Promise<PasswordResetTokenDocument[]> {
    const byIndex = await this.findBy(
      TOKEN_FIELDS.EMAIL_INDEX,
      piiBlindIndex(email),
    );
    if (byIndex.length) return byIndex;
    return this.findBy(TOKEN_FIELDS.EMAIL, email);
  }

  isExpired(token: PasswordResetTokenDocument): boolean {
    const expiresAt = resolveDate(token.expiresAt);
    return !expiresAt || new Date() > expiresAt;
  }

  async markAsUsed(tokenId: string): Promise<PasswordResetTokenDocument> {
    try {
      await this.getCollection()
        .doc(tokenId)
        .update({
          [TOKEN_FIELDS.USED]: true,
          [TOKEN_FIELDS.USED_AT]: new Date(),
          updatedAt: new Date(),
        });

      return this.findByIdOrFail(tokenId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to mark token as used: ${tokenId}`,
        error,
      );
    }
  }

  async findUnusedForUser(
    userId: string,
  ): Promise<PasswordResetTokenDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(TOKEN_FIELDS.USER_ID, "==", userId)
        .where(TOKEN_FIELDS.USED, "==", false)
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<PasswordResetTokenDocument>(doc),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find unused tokens for user: ${userId}`,
        error,
      );
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(TOKEN_FIELDS.EXPIRES_AT, "<", new Date())
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError("Failed to delete expired tokens", error);
    }
  }

  async getExpiredRefs(
    now: Date,
  ): Promise<FirebaseFirestore.DocumentReference[]> {
    const snapshot = await this.getCollection()
      .where(TOKEN_FIELDS.EXPIRES_AT, "<", now)
      .get();
    return snapshot.docs.map((doc) => doc.ref);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    try {
      const tokens = await this.findByUserId(userId);
      const batch = this.db.batch();

      tokens.forEach((token) => {
        if (token.id) {
          batch.delete(this.getCollection().doc(token.id));
        }
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete tokens for user: ${userId}`,
        error,
      );
    }
  }
}

export const emailVerificationTokenRepository =
  new EmailVerificationTokenRepository();
export const passwordResetTokenRepository = new PasswordResetTokenRepository();

export const tokenRepository = {
  email: emailVerificationTokenRepository,
  password: passwordResetTokenRepository,
  async getExpiredEmailVerificationRefs(
    now: Date,
  ): Promise<FirebaseFirestore.DocumentReference[]> {
    return emailVerificationTokenRepository.getExpiredRefs(now);
  },
  async getExpiredPasswordResetRefs(
    now: Date,
  ): Promise<FirebaseFirestore.DocumentReference[]> {
    return passwordResetTokenRepository.getExpiredRefs(now);
  },
};
