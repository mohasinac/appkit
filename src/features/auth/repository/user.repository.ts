import "server-only";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  USER_PII_FIELDS,
  USER_PII_INDEX_MAP,
  addPiiIndices,
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
  createUserId,
  type UserDocument,
} from "../schemas";

export class UserRepository extends BaseRepository<UserDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    uid: { canFilter: true, canSort: false },
    emailIndex: { canFilter: true, canSort: false },
    displayName: { canFilter: true, canSort: true },
    role: { canFilter: true, canSort: true },
    emailVerified: { canFilter: true, canSort: false },
    disabled: { canFilter: true, canSort: true },
    storeStatus: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(USER_COLLECTION);
  }

  private decryptUser(doc: UserDocument): UserDocument {
    const decrypted = decryptPiiFields(
      doc as unknown as Record<string, unknown>,
      [...USER_PII_FIELDS],
    ) as unknown as UserDocument;

    if (decrypted.payoutDetails) {
      decrypted.payoutDetails = decryptPayoutDetails(
        decrypted.payoutDetails as unknown as Record<string, unknown>,
      ) as unknown as typeof decrypted.payoutDetails;
    }

    if (decrypted.shippingConfig) {
      decrypted.shippingConfig = decryptShippingConfig(
        decrypted.shippingConfig as unknown as Record<string, unknown>,
      ) as unknown as typeof decrypted.shippingConfig;
    }

    return decrypted;
  }

  private encryptUserData<T extends Record<string, unknown>>(data: T): T {
    let encrypted = encryptPiiFields(data, [...USER_PII_FIELDS]);
    encrypted = addPiiIndices(data, USER_PII_INDEX_MAP) as unknown as T;
    encrypted = {
      ...encryptPiiFields(data, [...USER_PII_FIELDS]),
      ...encrypted,
    };

    if (encrypted.payoutDetails) {
      (encrypted as Record<string, unknown>).payoutDetails =
        encryptPayoutDetails(
          encrypted.payoutDetails as Record<string, unknown>,
        );
    }

    if (encrypted.shippingConfig) {
      (encrypted as Record<string, unknown>).shippingConfig =
        encryptShippingConfig(
          encrypted.shippingConfig as Record<string, unknown>,
        );
    }

    return encrypted;
  }

  protected override mapDoc<D = UserDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<UserDocument>(snap);
    return this.decryptUser(raw) as unknown as D;
  }

  async create(
    input: Omit<UserDocument, "id" | "createdAt" | "updatedAt">,
  ): Promise<UserDocument> {
    const firstName = input.displayName?.split(" ")[0] || "user";
    const lastName =
      input.displayName?.split(" ").slice(1).join(" ") || "account";
    const email = input.email || "noemail@example.com";
    const id = createUserId({ firstName, lastName, email });

    const userData: Omit<UserDocument, "id"> = {
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.encryptUserData(
      userData as unknown as Record<string, unknown>,
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...userData };
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
      throw new DatabaseError("Failed to fetch active users", error);
    }
  }

  override async update(
    uid: string,
    data: Partial<UserDocument>,
  ): Promise<UserDocument> {
    const encrypted = this.encryptUserData(
      data as unknown as Record<string, unknown>,
    );
    return super.update(uid, encrypted as Partial<UserDocument>);
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
      const snapshot = await this.getCollection()
        .where(USER_FIELDS.ROLE, "==", role)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(`Failed to count users by role: ${role}`, error);
    }
  }

  async countActive(): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(USER_FIELDS.DISABLED, "==", false)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError("Failed to count active users", error);
    }
  }

  async countDisabled(): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(USER_FIELDS.DISABLED, "==", true)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError("Failed to count disabled users", error);
    }
  }

  async countNewSince(since: Date): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(USER_FIELDS.CREATED_AT, ">=", since)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError("Failed to count new users", error);
    }
  }

  async updateLoginMetadata(uid: string): Promise<void> {
    try {
      await this.getCollection()
        .doc(uid)
        .update({
          [USER_FIELDS.META.LAST_SIGN_IN_TIME]: FieldValue.serverTimestamp(),
          [USER_FIELDS.META.LOGIN_COUNT]: FieldValue.increment(1),
          [USER_FIELDS.UPDATED_AT]: FieldValue.serverTimestamp(),
        });
    } catch (error) {
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
