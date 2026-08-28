import { normalizeError } from "../../../errors/normalize";

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
  piiIndicesFor,
  decryptPayoutDetails,
  decryptPiiFields,
  decryptShippingConfig,
  encryptPayoutDetails,
  encryptPiiFields,
  encryptShippingConfig,
  piiBlindIndex,
} from "../../../security";
import type { UserRole } from "../types";
import {
  USER_COLLECTION,
  USER_FIELDS,
  type UserDocument,
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
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(USER_COLLECTION);
  }

  private decryptUser(doc: UserDocument): UserDocument {
    const decrypted = decryptPiiFields(doc, [...USER_PII_FIELDS]);

    if (decrypted.payoutDetails) {
      decrypted.payoutDetails = decryptPayoutDetails(
        decrypted.payoutDetails,
      ) as typeof decrypted.payoutDetails;
    }

    if (decrypted.shippingConfig) {
      decrypted.shippingConfig = decryptShippingConfig(
        decrypted.shippingConfig,
      ) as typeof decrypted.shippingConfig;
    }

    return decrypted;
  }

  private encryptUserData<T extends object>(data: T): T {
    // encryptPiiFields encrypts each PII field in-place AND adds the corresponding
    // blind-index sibling (e.g. email → emailIndex) from the plaintext value.
    // addPiiIndices is intentionally NOT called here — it spreads the original
    // plaintext `data` back into the result, which would overwrite the encrypted
    // ciphertext with the original plaintext values, defeating the encryption.
    //
    // The mapped indices below are not optional. `encryptPiiFields` derives its
    // sibling name mechanically as `${field}Index`, so `phoneNumber` produces
    // `phoneNumberIndex` — but `findByPhone` queries `USER_FIELDS.PHONE_INDEX`,
    // which is `phoneIndex`. Only the seed paths ever wrote that name, so
    // **phone lookup could never match a user created by the app.**
    // `piiIndicesFor` applies USER_PII_INDEX_MAP's real names and, unlike
    // `addPiiIndices`, carries no plaintext back over the ciphertext.
    const encrypted = {
      ...encryptPiiFields(data, [...USER_PII_FIELDS]),
      ...piiIndicesFor(data, USER_PII_INDEX_MAP),
    } as T;
    const access = encrypted as { payoutDetails?: object | null; shippingConfig?: object | null };

    if (access.payoutDetails) {
      access.payoutDetails = encryptPayoutDetails(access.payoutDetails);
    }

    if (access.shippingConfig) {
      access.shippingConfig = encryptShippingConfig(access.shippingConfig);
    }

    return encrypted;
  }

  protected override mapDoc<D = UserDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<UserDocument>(snap);
    return this.decryptUser(raw) as unknown as D;
  }

  override async createWithId(
    id: string,
    data: Partial<UserDocument>,
  ): Promise<UserDocument> {
    // `uid` is a required UserDocument field read directly off the mapped
    // object (SessionUser.uid, getServerPermissions(uid), etc.) — mapDoc()
    // only auto-populates `.id` from the Firestore doc ID, not `.uid`. A
    // caller passing `data` without `uid` silently produces a user record
    // that authenticates fine but fails every downstream role/permission
    // check with no error anywhere (found via a live RBAC bug where an
    // admin account created this way couldn't access /admin).
    const withUid: Partial<UserDocument> = { uid: id, ...data };
    const encrypted = this.encryptUserData(withUid);
    return super.createWithId(id, encrypted);
  }

  override async create(
    input: Omit<UserDocument, "id" | "createdAt" | "updatedAt">,
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

    const userData: Omit<UserDocument, "id"> = {
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.encryptUserData(userData);

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...userData };
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

  override async update(
    uid: string,
    data: Partial<UserDocument>,
  ): Promise<UserDocument> {
    const encrypted = this.encryptUserData(data);
    return super.update(uid, encrypted);
  }

  async markEmailAsVerified(uid: string): Promise<UserDocument> {
    return this.update(uid, { emailVerified: true } as Partial<UserDocument>);
  }

  async disable(uid: string): Promise<UserDocument> {
    return this.update(uid, { disabled: true } as Partial<UserDocument>);
  }

  async enable(uid: string): Promise<UserDocument> {
    return this.update(uid, { disabled: false } as Partial<UserDocument>);
  }

  async updateRole(uid: string, role: UserRole): Promise<UserDocument> {
    return this.update(uid, { role } as Partial<UserDocument>);
  }

  async updateProfile(
    uid: string,
    data: { displayName?: string; photoURL?: string },
  ): Promise<UserDocument> {
    return this.update(uid, data as Partial<UserDocument>);
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

    const updateData: Partial<UserDocument> = { ...data };

    if (data.email && data.email !== currentUser.email) {
      updateData.emailVerified = false;
    }

    if (data.phoneNumber && data.phoneNumber !== currentUser.phoneNumber) {
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
    return this.update(uid, { storeStatus } as Partial<UserDocument>);
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
