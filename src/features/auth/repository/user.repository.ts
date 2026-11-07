import { normalizeError } from "../../../errors/normalize";
import { buildTokensIndex } from "../../../security/blind-index-tokens";
import type { JsonValue } from "../../../schemas/types";

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
  maskPii,
  revealPii,
  piiBlindIndex,
} from "../../../security";
import type { UserRole } from "../types";
import { rolesOf } from "../role-predicates";
import {
  normalizeUserRoleFields,
  primaryRoleOf,
  validateRoleSet,
} from "../auth-helpers";
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
    /**
     * Legacy scalar. Still filterable because every stored document carries it
     * and the composite indexes behind `/api/admin/team`
     * (permissionGroup, role, createdAt|displayName) are declared against it.
     */
    role: { canFilter: true, canSort: true },
    /**
     * THE role authority — filter with `@=` (Firestore `array-contains`), e.g.
     * `roles@=seller`. `canSort: false`: an array field has no sort order
     * Firestore can express (same reasoning as `nameTokensIndex`).
     *
     * ⚠ A single-field array-contains index is created automatically by
     * Firestore, so `roles@=X` alone needs no declaration. Combining it with a
     * sort or a second clause DOES — add the composite to
     * `appkit.config.js` → firestore.indexes before shipping such a query, or
     * Sieve (`throwExceptions: false`) drops it SILENTLY and the filter matches
     * every user.
     */
    roles: { canFilter: true, canSort: false },
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
   * ── THE role dual-read, at the REPOSITORY BOUNDARY (1.43) ────────────────
   *
   * Normalises `role` ⇄ `roles` ⇄ `primaryRole` on EVERY read path — findById,
   * findBy, the Sieve list, findByRole, every ad-hoc query — because they all
   * map through `mapDoc`, which is exactly what `BaseRepository.mapDoc`
   * documents it is there for.
   *
   * 🛑 Why it is here and not in an adapter. The `altRegionName` rename put its
   * dual-read in an adapter that only the LIST route used, while pages kept
   * receiving the RAW document from `getCategoryBySlug`. Result: 200 OK,
   * content silently blank, and no typecheck could have caught it. For a ROLE
   * field the equivalent failure is not a blank block — it is a user silently
   * losing or gaining access. So the normalisation lives at the one place
   * every reader passes through.
   *
   * Three guarantees for callers:
   *   1. `roles` is always a non-empty, alias-folded, de-duplicated array.
   *   2. `primaryRole` is always a role the user actually holds (display only).
   *   3. `role` is overwritten with the HIGHEST-RANKED held role — not with
   *      `primaryRole`. Deliberate: any guard not yet converted to the set
   *      compares the scalar against a hierarchy, so handing it the highest
   *      rank under-grants nothing such a comparison would have allowed. Using
   *      `primaryRole` here would reintroduce the exact lockout 1.43 removes
   *      (admin whose primary reads "user" fails `role === "admin"`).
   *
   * Remove once `scripts/backfill-user-roles.mjs --apply --drop-old` has run
   * and no stored document is missing `roles`.
   */
  // Structural snapshot type rather than importing Firestore's
  // `DocumentSnapshot`: this file sits outside `providers/` and appkit must not
  // grow another direct Firebase import. Shape-compatible, so the override
  // still typechecks. Same approach as CategoriesRepository.mapDoc.
  protected override mapDoc<D = UserDocument>(
    snap: Parameters<BaseRepository<UserDocument>["mapDoc"]>[0],
  ): D {
    const doc = super.mapDoc<UserDocument>(snap);
    return normalizeUserRoleFields(doc) as unknown as D;
  }

  /**
   * Plaintext PII. **Opt-in and named** — for the account's own settings page
   * and any mail that has to reach the person.
   *
   * 🛑 `payoutDetails`/`shippingConfig` moved to `sellerProfiles/{uid}`
   * (2026-11-05) — `SellerProfileRepository.revealProfile` is their
   * equivalent now, not this method.
   */
  revealUser(doc: UserDocument): UserPlain {
    return revealPii<UserPlain>(doc, USER_PII_FIELDS);
  }

  /** As `revealUser`, for a list read. */
  revealUsers(docs: readonly UserDocument[]): UserPlain[] {
    return docs.map((d) => this.revealUser(d));
  }

  /**
   * Masked PII — **the default for every admin list and every public
   * surface.**
   *
   * 🛑 `payoutDetails`/`shippingConfig` moved to `sellerProfiles/{uid}` —
   * `SellerProfileRepository.maskedProfile` is their equivalent now.
   */
  maskedUser(doc: UserDocument): UserPlain {
    return maskPii<UserPlain>(doc, USER_PII_FIELDS);
  }

  /** As `maskedUser`, for a list read. */
  maskedUsers(docs: readonly UserDocument[]): UserPlain[] {
    return docs.map((d) => this.maskedUser(d));
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
    data: Record<string, JsonValue>,
  ): Record<string, string[]> | null {
    const displayName = typeof data.displayName === "string" ? data.displayName : undefined;
    const email = typeof data.email === "string" ? data.email : undefined;
    if (!displayName && !email) return null;
    return { nameTokensIndex: buildTokensIndex(displayName, email) };
  }

  /*
   * 🛑 The nested-object encryption override that used to live here
   * (`payoutDetails`/`shippingConfig`, via `encryptPayoutDetails`/
   * `encryptShippingConfig`) moved to `SellerProfileRepository` with the
   * fields themselves (2026-11-05). `BaseRepository.applyWriteHooks` (the
   * flat `piiFields` hook below) is sufficient here now.
   */

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
    /*
     * Write `roles`/`primaryRole` at CREATION, so a brand-new account never
     * depends on the read-time dual-read or on the backfill script. Guarded on
     * a role actually being supplied: `normalizeUserRoleFields` defaults to
     * `["user"]`, and silently granting a role to a partial write that said
     * nothing about roles is the kind of implicit grant this work exists to
     * remove.
     */
    if (withUid.role != null || withUid.roles != null) {
      normalizeUserRoleFields(withUid);
    }
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
    // Same role normalisation as `createWithId` — see its comment.
    if (userData.role != null || userData.roles != null) {
      normalizeUserRoleFields(userData);
    }

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

  /**
   * Every user HOLDING `role` — including those who hold it alongside others.
   *
   * 🛑 `array-contains` on `roles`, not `== role`. An equality query on the
   * legacy scalar would return only accounts whose single highest-ranked role
   * happens to be this one, so a `seller` who is also an `employee` would be
   * missing from the seller list — silently, with a 200.
   *
   * Takes the role through `rolesOf` first so `findByRole("moderator")`
   * resolves to the folded `employee` instead of matching nothing.
   */
  async findByRole(role: UserRole): Promise<UserDocument[]> {
    const [canonical] = rolesOf({ role });
    try {
      const snapshot = await this.getCollection()
        .where(USER_FIELDS.ROLES, "array-contains", canonical)
        .get();
      return snapshot.docs.map((doc) => this.mapDoc<UserDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find users holding role: ${canonical}`,
        error,
      );
    }
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

  /**
   * ── The role SET writers ─────────────────────────────────────────────────
   *
   * 🛑 All three funnel through `setRoles`, which is the only method that
   * writes a role field. One writer means the three fields can never drift
   * apart in storage the way they could if `addRole` patched `roles` while
   * something else patched `role`.
   *
   * `primaryRole` is preserved when the user still holds it and re-derived
   * when they do not — removing someone's primary role must not leave a
   * display label pointing at access they no longer have.
   */
  async setRoles(
    uid: string,
    roles: readonly UserRole[],
    opts?: { primaryRole?: UserRole },
  ): Promise<UserDocument> {
    const validated = validateRoleSet(roles);
    if (!validated.ok) throw new DatabaseError(validated.error);

    const current = await this.findById(uid);
    const desiredPrimary = opts?.primaryRole ?? current?.primaryRole;
    /*
     * Typed explicitly, including `role`, so `normalizeUserRoleFields`' generic
     * resolves to a shape that HAS the legacy scalar. Inferring it from a
     * literal that omitted `role` made `normalized.role` a type error — and had
     * it compiled, the scalar would simply never have been written, leaving
     * stored documents whose `role` disagreed with their `roles`.
     */
    const draft: {
      role?: UserRole;
      roles: UserRole[];
      primaryRole?: UserRole;
    } = {
      roles: validated.roles,
      ...(desiredPrimary ? { primaryRole: desiredPrimary } : {}),
    };
    const normalized = normalizeUserRoleFields(draft);

    return this.update(uid, {
      roles: normalized.roles,
      primaryRole: normalized.primaryRole,
      // The legacy scalar is kept in storage, not just on read, so a consumer
      // querying Firestore directly (the backfill script, an export, the
      // emulator UI) sees the same answer the repository hands out.
      role: normalized.role,
    } as Partial<UserPlain>);
  }

  /**
   * ADD a role — the owner's actual requirement: *"upgrading someone is
   * ADDING a role, not replacing the one they have."* A no-op when already
   * held; throws when it would exceed `getMaxRolesPerUser()`.
   */
  async addRole(uid: string, role: UserRole): Promise<UserDocument> {
    const current = await this.findById(uid);
    if (!current) throw new DatabaseError(`User not found: ${uid}`);
    const held = rolesOf(current);
    const [canonical] = rolesOf({ role });
    if (held.includes(canonical)) return current;
    return this.setRoles(uid, [...held, canonical]);
  }

  /** REMOVE a role. Refuses to leave an account with no role at all. */
  async removeRole(uid: string, role: UserRole): Promise<UserDocument> {
    const current = await this.findById(uid);
    if (!current) throw new DatabaseError(`User not found: ${uid}`);
    const [canonical] = rolesOf({ role });
    const remaining = rolesOf(current).filter((r) => r !== canonical);
    if (remaining.length === 0) {
      throw new DatabaseError(
        `Cannot remove the last role from ${uid} — a user must hold at least one.`,
      );
    }
    return this.setRoles(uid, remaining);
  }

  /** Change which held role is DISPLAYED. Grants and revokes nothing. */
  async setPrimaryRole(uid: string, role: UserRole): Promise<UserDocument> {
    const current = await this.findById(uid);
    if (!current) throw new DatabaseError(`User not found: ${uid}`);
    const held = rolesOf(current);
    const [canonical] = rolesOf({ role });
    if (!held.includes(canonical)) {
      throw new DatabaseError(
        `Cannot display role ${canonical} for ${uid} — they do not hold it.`,
      );
    }
    return this.setRoles(uid, held, { primaryRole: canonical });
  }

  /**
   * @deprecated REPLACES the whole role set with one role. Kept because the
   * admin role-change route and the `becomeSeller` flow still call it, but
   * "upgrade" should be `addRole` — replacing is what loses a seller their
   * buyer role. Audit each remaining caller before deleting this.
   */
  async updateRole(uid: string, role: UserRole): Promise<UserDocument> {
    return this.setRoles(uid, [role]);
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

  /**
   * How many users HOLD `role`. `array-contains`, matching `findByRole` —
   * the count and the list must not disagree about what "a seller" is.
   *
   * ⚠ Counts no longer partition: a seller+employee is counted in both, so
   * the role counts sum to more than the user total. That is correct under a
   * role set; any dashboard presenting them as a pie chart is now wrong.
   */
  async countByRole(role: UserRole): Promise<number> {
    const [canonical] = rolesOf({ role });
    try {
      return await getFirestoreCount(
        this.getCollection().where(
          USER_FIELDS.ROLES,
          "array-contains",
          canonical,
        ),
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

  /*
   * 🛑 `storeStatus` MOVED to `sellerProfiles/{uid}` — this method now
   * writes there via `sellerProfileRepository`, imported lazily to avoid a
   * cross-feature top-level import cycle (auth <-> seller). Still returns
   * `Promise<UserDocument>` (the account doc, unchanged) for both real
   * callers, which only cared that the call succeeded and read the user
   * fresh afterward anyway.
   */
  async updateStoreApproval(
    uid: string,
    storeStatus: "pending" | "approved" | "rejected",
  ): Promise<UserDocument> {
    const { sellerProfileRepository } = await import(
      "../../seller/repository/seller-profile.repository"
    );
    await sellerProfileRepository.upsertForOwner(uid, { storeStatus });
    return this.findByIdOrFail(uid);
  }
}

export const userRepository = new UserRepository();
