import { normalizeError } from "../../../errors/normalize";
import { buildTokensIndex } from "../../../security/blind-index-tokens";

import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  getFirestoreCount,
  prepareForFirestore,
  parseSieveDateValue,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  USER_PII_FIELDS,
  USER_PII_INDEX_MAP,
  decryptPayoutDetails,
  maskPii,
  revealPii,
  decryptShippingConfig,
  encryptPayoutDetails,
  encryptShippingConfig,
  piiBlindIndex,
} from "../../../security";
import type { UserRole } from "../types";
import {
  USER_COLLECTION,
  USER_FIELDS,
  type UserDocument,
  type UserPlain,
} from "../schemas";

export class UserRepository extends BaseRepository<UserDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    uid: { canFilter: true, canSort: false },
    slug: { canFilter: true, canSort: false },
    emailIndex: { canFilter: true, canSort: false },
    displayName: { canFilter: true, canSort: true },
    role: { canFilter: true, canSort: true },
    emailVerified: { canFilter: true, canSort: false },
    disabled: { canFilter: true, canSort: true },
    storeStatus: { canFilter: true, canSort: false },
    // AdminTeamView's permission-group filter emits `permissionGroup==X` and
    // /api/admin/team merges it into `role==employee,permissionGroup==X`. Without
    // this entry Sieve (throwExceptions:false) dropped the clause silently and the
    // filter matched every employee. The composite indexes it needs are already
    // declared and deployed — (permissionGroup, role, createdAt|displayName).
    permissionGroup: { canFilter: true, canSort: false },
    /*
     * Whole-word admin name search. `canSort: false` — an array field has no
     * sort order Firestore can express. Without this entry, `@=` (Firestore
     * `array-contains`) on `nameTokensIndex` is dropped SILENTLY by Sieve
     * (`throwExceptions: false`), and the clause after it goes with it —
     * which here would be nothing, but is the exact mechanism Root Cause #62
     * documents for every other field this has happened to.
     */
    nameTokensIndex: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(USER_COLLECTION);
  }

  /*
   * 🛑 `mapDoc` no longer decrypts. This is the widest-reaching of the
   * fourteen — 73 files touch this repository — and it is why ciphertext never
   * leaving the database matters most here: `email` and `phoneNumber` belong
   * to every account on the platform.
   *
   * `payoutDetails` and `shippingConfig` are handled inside the accessors
   * rather than by `revealPii`, because each is encrypted by its OWN scheme
   * and not by a `USER_PII_FIELDS` path. An accessor that silently skipped
   * them would hand a caller a UPI id it could not read — worse than refusing,
   * because the value looks present.
   */

  /**
   * Plaintext PII. **Opt-in and named** — for the account's own settings page,
   * the payout run, and any mail that has to reach the person.
   */
  revealUser(doc: UserDocument): UserPlain {
    const revealed = revealPii<UserPlain>(doc, USER_PII_FIELDS);
    if (revealed.payoutDetails) {
      revealed.payoutDetails = decryptPayoutDetails(
        revealed.payoutDetails,
      ) as typeof revealed.payoutDetails;
    }
    if (revealed.shippingConfig) {
      revealed.shippingConfig = decryptShippingConfig(
        revealed.shippingConfig,
      ) as typeof revealed.shippingConfig;
    }
    return revealed;
  }

  /** As `revealUser`, for a list read. */
  revealUsers(docs: readonly UserDocument[]): UserPlain[] {
    return docs.map((d) => this.revealUser(d));
  }

  /**
   * Masked PII — **the default for every admin list and every public
   * surface.** Decrypts first, then masks, because the mask helpers refuse
   * ciphertext by design.
   *
   * `payoutDetails` and `shippingConfig` are decrypted and then masked
   * member-by-member: a UPI handle or account number reaching an admin table
   * unmasked is the most damaging value this document carries.
   */
  maskedUser(doc: UserDocument): UserPlain {
    const masked = maskPii<UserPlain>(doc, USER_PII_FIELDS);
    if (masked.payoutDetails) {
      masked.payoutDetails = this.maskNested(
        decryptPayoutDetails(masked.payoutDetails),
      ) as typeof masked.payoutDetails;
    }
    if (masked.shippingConfig) {
      masked.shippingConfig = this.maskNested(
        decryptShippingConfig(masked.shippingConfig),
      ) as typeof masked.shippingConfig;
    }
    return masked;
  }

  /** As `maskedUser`, for a list read. */
  maskedUsers(docs: readonly UserDocument[]): UserPlain[] {
    return docs.map((d) => this.maskedUser(d));
  }

  /**
   * Mask every string member of an already-decrypted nested object.
   *
   * The field list is derived from the object rather than hard-coded, because
   * `USER_PII_FIELDS` does not name these members and a second list here would
   * have to be kept in step with `decryptPayoutDetails`'s own (Root Cause #42).
   * Every string in a payout or shipping block is sensitive, so "all of them"
   * is the correct list, not an approximation.
   */
  private maskNested<T extends object>(value: T | null | undefined): T | undefined {
    if (!value) return undefined;
    return maskPii<T>(
      value,
      Object.entries(value)
        .filter(([, v]) => typeof v === "string")
        .map(([k]) => k),
    );
  }

  /**
   * Declared, not hand-rolled.
   *
   * `BaseRepository.applyWriteHooks` already does exactly what the private
   * `encryptUserData` did — encrypt the listed fields, then add the mapped blind
   * indices derived from the PLAINTEXT source. Declaring the fields means all
   * nine mutating methods get it, including the `createWithId` / `*InTx` /
   * `*InBatch` family that inherited unhooked base implementations while the
   * encryption lived in a private method only three call sites remembered to
   * call.
   */
  protected override piiFields = USER_PII_FIELDS;
  protected override piiIndexMap = USER_PII_INDEX_MAP;

  /**
   * Admin search by first/last name or email local-part, without decryption.
   * `displayName` and `email` only — `phoneNumber` is excluded on purpose: a
   * phone number has no word boundaries, so tokenising it yields one token
   * that is the whole number, an exact lookup `phoneIndex` already covers.
   *
   * Running through `applyWriteHooks` is what makes a `users` row that
   * SURVIVES a tester cascade (it is PRESERVE-tier and never wiped) keep a
   * correct index going forward, and what makes a NEWLY signed-up real user
   * searchable without anyone having to remember to re-run the backfill.
   */
  protected override buildTokensIndexFor(
    data: Record<string, unknown>,
  ): Record<string, string[]> | null {
    const displayName = typeof data.displayName === "string" ? data.displayName : undefined;
    const email = typeof data.email === "string" ? data.email : undefined;
    if (!displayName && !email) return null;
    return { nameTokensIndex: buildTokensIndex(displayName, email) };
  }

  /**
   * The base hook, plus the nested objects it cannot see.
   *
   * `piiFields` is a flat list of top-level names, so a nested blob has to be
   * encrypted separately. Calling `super.applyWriteHooks` FIRST keeps a single
   * encryption path with one extra step on top, rather than two parallel paths
   * that have to agree — which is what the hand-rolled override was.
   */
  protected override applyWriteHooks<D extends object>(data: D): D {
    const out = super.applyWriteHooks(data);
    const access = out as { payoutDetails?: object | null; shippingConfig?: object | null };
    if (access.payoutDetails) access.payoutDetails = encryptPayoutDetails(access.payoutDetails);
    if (access.shippingConfig) access.shippingConfig = encryptShippingConfig(access.shippingConfig);
    return out;
  }


  /*
   * Takes PLAINTEXT, like the base it overrides — the three real signup paths
   * hand over the email Firebase just gave them, and `applyWriteHooks` below
   * is what encrypts it.
   */
  override async createWithId(
    id: string,
    data: Partial<UserPlain>,
  ): Promise<UserDocument> {
    // `uid` is a required UserDocument field read directly off the mapped
    // object (SessionUser.uid, getServerPermissions(uid), etc.) — mapDoc()
    // only auto-populates `.id` from the Firestore doc ID, not `.uid`. A
    // caller passing `data` without `uid` silently produces a user record
    // that authenticates fine but fails every downstream role/permission
    // check with no error anywhere (found via a live RBAC bug where an
    // admin account created this way couldn't access /admin).
    const withUid: Partial<UserPlain> = { uid: id, ...data };
    const encrypted = this.applyWriteHooks(withUid);
    return super.createWithId(id, encrypted as Partial<UserPlain>);
  }

  override async create(
    input: Omit<UserPlain, "id" | "createdAt" | "updatedAt">,
  ): Promise<UserDocument> {
    // A Firestore auto-id, NOT a derived one.
    //
    // This used to call `createUserId({firstName, lastName, email})`, which
    // built `user-{first}-{last}-{emailPrefix8}` — putting the local-part of a
    // real email address into the document id, and therefore into the public
    // profile URL. That generator is deleted.
    //
    // No real signup path reaches here (all three call `createWithId` with the
    // Firebase Auth uid, because `id === uid` is what makes an auth-gated
    // request an O(1) lookup). The readable public identifier is `slug`, minted
    // by `reserveUserSlug` from displayName only.
    const id = this.db.collection(this.collection).doc().id;

    // Plain in, ciphertext out — `applyWriteHooks` encrypts below.
    const userData: Omit<UserPlain, "id"> = {
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.applyWriteHooks(userData);

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    /*
     * Returns what was PERSISTED, not the plaintext input.
     *
     * `encrypted` is the exact object just written, so this is both honest and
     * assignable to the base's `Promise<UserDocument>` — the declaration
     * previously said `UserDocument` while returning `userData`, the plaintext.
     * No re-read, so no extra Firestore read (Rule #6).
     */
    return { id, ...encrypted } as UserDocument;
  }

  async findByUid(uid: string): Promise<UserDocument | null> {
    return this.findOneBy(USER_FIELDS.UID, uid);
  }

  /**
   * Resolve a public profile slug.
   *
   * Separate from `findById` because the slug is a FIELD, not the document key
   * — `id === uid` is what keeps every auth-gated request an O(1) lookup from
   * the verified token claim, so the key could not be repurposed for this.
   */
  async findBySlug(slug: string): Promise<UserDocument | null> {
    return this.findOneBy(USER_FIELDS.SLUG, slug);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOneBy(USER_FIELDS.EMAIL_INDEX, piiBlindIndex(email));
  }

  async findByPhone(phoneNumber: string): Promise<UserDocument | null> {
    return this.findOneBy(USER_FIELDS.PHONE_INDEX, piiBlindIndex(phoneNumber));
  }

  async findByRole(role: UserRole): Promise<UserDocument[]> {
    return this.findBy(USER_FIELDS.ROLE, role);
  }

  async findVerified(limit?: number): Promise<UserDocument[]> {
    try {
      let query = this.getCollection().where(
        USER_FIELDS.EMAIL_VERIFIED,
        "==",
        true,
      );

      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => this.mapDoc<UserDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to fetch verified users", error);
    }
  }

  async findActive(limit?: number): Promise<UserDocument[]> {
    try {
      let query = this.getCollection().where(USER_FIELDS.DISABLED, "==", false);

      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => this.mapDoc<UserDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to fetch active users", error);
    }
  }

  /**
   * Cloud Functions: temporary hard-bans past their `hardBanExpiresAt` —
   * the `hardBanReinstatement` sweep re-enables Auth login for these.
   * Permanent bans (`hardBanExpiresAt` null/absent) never match this query.
   */
  async getExpiredHardBans(): Promise<UserDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(USER_FIELDS.IS_DISABLED, "==", true)
        .where(USER_FIELDS.HARD_BAN_EXPIRES_AT, "<=", new Date())
        .limit(500)
        .get();
      return snapshot.docs.map((doc) => this.mapDoc<UserDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to fetch expired hard bans", error);
    }
  }

  /*
   * Takes PLAINTEXT, like the base it overrides — this method is the thing
   * that encrypts (`applyWriteHooks`), so demanding ciphertext from callers
   * inverted its own contract.
   */
  override async update(
    uid: string,
    data: Partial<UserPlain>,
  ): Promise<UserDocument> {
    const encrypted = this.applyWriteHooks(data);
    return super.update(uid, encrypted as Partial<UserPlain>);
  }

  async markEmailAsVerified(uid: string): Promise<UserDocument> {
    return this.update(uid, { emailVerified: true });
  }

  async disable(uid: string): Promise<UserDocument> {
    return this.update(uid, { disabled: true });
  }

  async enable(uid: string): Promise<UserDocument> {
    return this.update(uid, { disabled: false });
  }

  async updateRole(uid: string, role: UserRole): Promise<UserDocument> {
    return this.update(uid, { role });
  }

  async updateProfile(
    uid: string,
    data: { displayName?: string; photoURL?: string },
  ): Promise<UserDocument> {
    return this.update(uid, data as Partial<UserPlain>);
  }

  async updateProfileWithVerificationReset(
    uid: string,
    data: {
      displayName?: string;
      email?: string;
      phoneNumber?: string;
      photoURL?: string;
      avatarMetadata?: UserDocument["avatarMetadata"];
    },
  ): Promise<UserDocument> {
    const currentUser = await this.findById(uid);
    if (!currentUser) {
      throw new DatabaseError(`User not found: ${uid}`);
    }

    /*
      * Plain in, ciphertext out — `this.update` encrypts via the write hook.
      *
      * 🛑 The comparison below (`data.email !== currentUser.email`) now
      * compares PLAINTEXT to CIPHERTEXT, so it is always true and
      * `emailVerified` is cleared on every profile save that includes an
      * email — even an unchanged one. `currentUser` comes from `findById`,
      * which no longer decrypts. Fixed by comparing against the revealed
      * value, which is the one place in this method that needs plaintext.
      */
    const updateData: Partial<UserPlain> = { ...data };
    const current = this.revealUser(currentUser);

    if (data.email && data.email !== current.email) {
      updateData.emailVerified = false;
    }

    if (data.phoneNumber && data.phoneNumber !== current.phoneNumber) {
      updateData.phoneVerified = false;
    }

    return this.update(uid, updateData);
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async countByRole(role: UserRole): Promise<number> {
    try {
      return await getFirestoreCount(
        this.getCollection().where(USER_FIELDS.ROLE, "==", role),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to count users by role: ${role}`, error);
    }
  }

  async countActive(): Promise<number> {
    try {
      return await getFirestoreCount(
        this.getCollection().where(USER_FIELDS.DISABLED, "==", false),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to count active users", error);
    }
  }

  async countDisabled(): Promise<number> {
    try {
      return await getFirestoreCount(
        this.getCollection().where(USER_FIELDS.DISABLED, "==", true),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to count disabled users", error);
    }
  }

  async countNewSince(since: Date): Promise<number> {
    try {
      return await getFirestoreCount(
        this.getCollection().where(USER_FIELDS.CREATED_AT, ">=", since),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to count new users", error);
    }
  }

  async updateLoginMetadata(uid: string): Promise<void> {
    try {
      const docRef = this.getCollection().doc(uid);

      await this.db.runTransaction(async (tx) => {
        const snapAny = (await tx.get(docRef as any)) as any;
        // support both DocumentSnapshot and other shapes defensively
        const docData =
          (typeof snapAny?.data === "function"
            ? snapAny.data()
            : snapAny?.data) ?? {};
        const currentLoginCount = (docData?.metadata?.loginCount as number) || 0;
        tx.update(docRef as any, {
          [USER_FIELDS.META.LAST_SIGN_IN_TIME]: new Date(),
          [USER_FIELDS.META.LOGIN_COUNT]: Number(currentLoginCount) + 1,
          [USER_FIELDS.UPDATED_AT]: new Date(),
        });
      });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to update login metadata", error);
    }
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<UserDocument>> {
    return this.sieveQuery<UserDocument>(model, UserRepository.SIEVE_FIELDS, {
      defaultPageSize: 100,
      maxPageSize: 500,
    });
  }

  async findByStoreSlug(storeSlug: string): Promise<UserDocument | null> {
    return this.findOneBy(USER_FIELDS.STORE_SLUG, storeSlug);
  }

  async updateStoreApproval(
    uid: string,
    storeStatus: "pending" | "approved" | "rejected",
  ): Promise<UserDocument> {
    return this.update(uid, { storeStatus });
  }

  async listSellers(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<UserDocument>> {
    return this.sieveQuery<UserDocument>(model, UserRepository.SIEVE_FIELDS, {
      baseQuery: this.getCollection()
        .where(USER_FIELDS.ROLE, "==", "seller")
        .where(USER_FIELDS.STORE_STATUS, "==", "approved"),
      defaultPageSize: 24,
      maxPageSize: 100,
    });
  }

  async listSellersForAdmin(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<UserDocument>> {
    return this.sieveQuery<UserDocument>(model, UserRepository.SIEVE_FIELDS, {
      baseQuery: this.getCollection().where(USER_FIELDS.ROLE, "==", "seller"),
      defaultPageSize: 24,
      maxPageSize: 100,
    });
  }
}

export const userRepository = new UserRepository();
