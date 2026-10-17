import { normalizeError } from "../../../errors/normalize";

import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { BaseRepository } from "../../../providers/db-firebase";
import {
  TOKEN_PII_FIELDS,
  TOKEN_PII_INDEX_MAP,
  maskPii,
  piiBlindIndex,
  revealPii,
} from "../../../security";
import { resolveDate } from "../../../utils";
import {
  EMAIL_VERIFICATION_COLLECTION,
  PASSWORD_RESET_COLLECTION,
  TOKEN_FIELDS,
  type EmailVerificationTokenDocument,
  type EmailVerificationTokenPlain,
  type PasswordResetTokenDocument,
  type PasswordResetTokenPlain,
} from "../schemas";

export class EmailVerificationTokenRepository extends BaseRepository<EmailVerificationTokenDocument> {
  constructor() {
    super(EMAIL_VERIFICATION_COLLECTION);
  }

  /**
   * Declared, not hand-rolled in a `create` override.
   *
   * The override this replaces computed `encryptPiiFields(...)` and then
   * OVERWROTE the result with `addPiiIndices(data, MAP)` — which returns
   * `{...plaintext, ...indices}` — so the ciphertext was discarded and every
   * verification token's email was written to Firestore in CLEARTEXT. It was
   * invisible because `mapDoc` decrypts on read and `decryptPiiFields` passes
   * plaintext straight through, so reads looked identical either way.
   *
   * `applyWriteHooks` covers create/createWithId/update and the `*InTx` /
   * `*InBatch` family, so no write path can skip encryption the way an
   * override of `create` alone did.
   */
  protected override piiFields = TOKEN_PII_FIELDS;
  protected override piiIndexMap = TOKEN_PII_INDEX_MAP;

  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `EmailVerificationTokenDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealToken(doc: EmailVerificationTokenDocument): EmailVerificationTokenPlain {
    return revealPii<EmailVerificationTokenPlain>(doc, TOKEN_PII_FIELDS);
  }

  /** As `revealToken`, for a list read. */
  revealTokens(docs: readonly EmailVerificationTokenDocument[]): EmailVerificationTokenPlain[] {
    return docs.map((d) => this.revealToken(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedToken(doc: EmailVerificationTokenDocument): EmailVerificationTokenPlain {
    return maskPii<EmailVerificationTokenPlain>(doc, TOKEN_PII_FIELDS);
  }

  /** As `maskedToken`, for a list read. */
  maskedTokens(docs: readonly EmailVerificationTokenDocument[]): EmailVerificationTokenPlain[] {
    return docs.map((d) => this.maskedToken(d));
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
      void normalizeError(error);
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
      void normalizeError(error);
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

  /**
   * Same defect as its sibling above, one spread further along: the override
   * this replaces built `{...encrypted, ...addPiiIndices(data, MAP)}`, and
   * because `addPiiIndices` returns `{...plaintext, ...indices}` the plaintext
   * `email` was spread back OVER the ciphertext. Reset-token emails were
   * written in cleartext too.
   */
  protected override piiFields = TOKEN_PII_FIELDS;
  protected override piiIndexMap = TOKEN_PII_INDEX_MAP;

  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `PasswordResetTokenDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealResetToken(doc: PasswordResetTokenDocument): PasswordResetTokenPlain {
    return revealPii<PasswordResetTokenPlain>(doc, TOKEN_PII_FIELDS);
  }

  /** As `revealResetToken`, for a list read. */
  revealResetTokens(docs: readonly PasswordResetTokenDocument[]): PasswordResetTokenPlain[] {
    return docs.map((d) => this.revealResetToken(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedResetToken(doc: PasswordResetTokenDocument): PasswordResetTokenPlain {
    return maskPii<PasswordResetTokenPlain>(doc, TOKEN_PII_FIELDS);
  }

  /** As `maskedResetToken`, for a list read. */
  maskedResetTokens(docs: readonly PasswordResetTokenDocument[]): PasswordResetTokenPlain[] {
    return docs.map((d) => this.maskedResetToken(d));
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
      void normalizeError(error);
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
      void normalizeError(error);
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
      void normalizeError(error);
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
      void normalizeError(error);
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
