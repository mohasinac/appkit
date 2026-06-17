/**
 * Store Repository
 *
 * Data access layer for the `stores` Firestore collection.
 * One store per seller; identified by storeSlug (used as document ID).
 */

import {
  BaseRepository,
  prepareForFirestore,
  applySieveToFirestore,
  type SieveModel,
  type FirebaseSieveResult,
  type DocumentSnapshot,
} from "../../../providers/db-firebase";
import { increment } from "../../../contracts/field-ops";
import {
  StoreDocument,
  STORE_COLLECTION,
  STORE_FIELDS,
  DEFAULT_STORE_DATA,
  StoreStatusValues,
} from "../schemas";
import { DatabaseError } from "../../../errors";
import {
  encryptSecret,
  decryptSecret,
} from "../../../security/settings-encryption";
import type { FirestoreDocument } from "@mohasinac/appkit";

export class StoreRepository extends BaseRepository<StoreDocument> {
  constructor() {
    super(STORE_COLLECTION);
  }

  private encryptSecrets<D extends Partial<StoreDocument>>(data: D): D {
    const token = data.whatsappConfig?.accessToken;
    if (!token) return data;
    return {
      ...data,
      whatsappConfig: { ...data.whatsappConfig, accessToken: encryptSecret(token) },
    };
  }

  private decryptSecrets<D extends Partial<StoreDocument>>(data: D): D {
    const token = data.whatsappConfig?.accessToken;
    if (!token) return data;
    return {
      ...data,
      whatsappConfig: { ...data.whatsappConfig, accessToken: decryptSecret(token) },
    };
  }

  protected override mapDoc<D = StoreDocument>(snap: DocumentSnapshot): D {
    // audit-unknown-ok: TS structural escape — generic param
    return this.decryptSecrets(super.mapDoc<StoreDocument>(snap)) as unknown as D;
  }

  override async update(
    id: string,
    data: Partial<StoreDocument>,
  ): Promise<StoreDocument> {
    return super.update(id, this.encryptSecrets(data));
  }

  /**
   * Create a new store.
   * The document ID is set to storeSlug for easy URL-based lookups.
   * Uses Firestore's `.create()` semantics to reject duplicate slugs —
   * this enforces that storeSlug is always a unique identifier and is
   * structurally distinct from the owner's Firebase UID.
   */
  async create(
    input: Omit<StoreDocument, "id" | "createdAt" | "updatedAt">,
  ): Promise<StoreDocument> {
    // Defense-in-depth: storeSlug must never equal the owner UID so that
    // stores and users can always be distinguished by their document IDs.
    if (input.storeSlug === input.ownerId) {
      throw new DatabaseError(
        "Store slug must be different from the owner UID",
      );
    }

    const storeData: Omit<StoreDocument, "id"> = {
      ...DEFAULT_STORE_DATA,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use .create() instead of .set() so that a duplicate slug from a
    // different seller fails immediately instead of silently overwriting.
    try {
      await this.db
        .collection(this.collection)
        .doc(input.storeSlug)
        .create(prepareForFirestore(this.encryptSecrets(storeData)));
    // audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
    } catch (err: unknown) { // audit-catch-raw-ok: pre-existing-handler-intentional
      // gRPC ALREADY_EXISTS = code 6
      if ((err as { code?: number }).code === 6) {
        throw new DatabaseError(
          `Store slug "${input.storeSlug}" is already taken`,
        );
      }
      throw err;
    }

    return { id: input.storeSlug, ...storeData };
  }

  /**
   * Find a store by its URL slug (also the document ID).
   */
  async findBySlug(storeSlug: string): Promise<StoreDocument | null> {
    return this.findById(storeSlug);
  }

  /**
   * Find the store owned by a specific user UID.
   */
  async findByOwnerId(ownerId: string): Promise<StoreDocument | null> {
    return this.findOneBy(STORE_FIELDS.OWNER_ID, ownerId);
  }

  /**
   * Update store fields (partial).
   */
  async updateStore(
    storeSlug: string,
    data: Partial<
      Omit<StoreDocument, "id" | "storeSlug" | "ownerId" | "createdAt">
    >,
  ): Promise<StoreDocument> {
    return this.update(storeSlug, {
      ...data,
      updatedAt: new Date(),
    } as Partial<StoreDocument>);
  }

  /**
   * Admin: approve or reject a store.
   */
  async setStatus(
    storeSlug: string,
    status: StoreDocument["status"],
  ): Promise<StoreDocument> {
    return this.update(storeSlug, {
      status,
      // Auto-set isPublic when approved
      ...(status === StoreStatusValues.ACTIVE && { isPublic: true }),
      ...(status !== StoreStatusValues.ACTIVE && { isPublic: false }),
      updatedAt: new Date(),
    } as Partial<StoreDocument>);
  }

  /**
   * Paginated list of stores with Sieve filtering/sorting.
   * Filters to active + public stores for the public listing.
   */
  async listStores(
    model: SieveModel,
    activeOnly = true,
  ): Promise<FirebaseSieveResult<StoreDocument>> {
    const sieveFields = {
      [STORE_FIELDS.STORE_NAME]: { canFilter: true, canSort: true },
      [STORE_FIELDS.STORE_CATEGORY]: { canFilter: true, canSort: false },
      [STORE_FIELDS.STATUS]: { canFilter: true, canSort: false },
      [STORE_FIELDS.IS_PUBLIC]: { canFilter: true, canSort: false },
      [STORE_FIELDS.CREATED_AT]: { canFilter: false, canSort: true },
    };

    let baseQuery = this.getCollection() as FirebaseFirestore.Query;
    if (activeOnly) {
      baseQuery = baseQuery
        .where(STORE_FIELDS.STATUS, "==", "active")
        .where(STORE_FIELDS.IS_PUBLIC, "==", true);
    }

    return applySieveToFirestore<StoreDocument>({
      baseQuery,
      model,
      fields: sieveFields,
    });
  }

  /**
   * Admin: list all stores regardless of status.
   */
  async listAllStores(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<StoreDocument>> {
    return this.listStores(model, false);
  }

  /**
   * Cloud Functions: atomically increment `stats.totalProducts` counter.
   */
  async incrementTotalProducts(storeId: string, delta: number): Promise<void> {
    if (!storeId) return;
    await this.db
      .collection(this.collection)
      .doc(storeId)
      .update({
        "stats.totalProducts": increment(delta),
        updatedAt: new Date(),
      });
  }

  /**
   * Cloud Functions: atomically increment `stats.itemsSold` counter.
   */
  async incrementItemsSold(storeId: string, delta: number): Promise<void> {
    if (!storeId) return;
    await this.db
      .collection(this.collection)
      .doc(storeId)
      .update({
        "stats.itemsSold": increment(delta),
        updatedAt: new Date(),
      });
  }

  /**
   * Cloud Functions: full-overwrite store stats (used by nightly reconciliation job).
   * Passing `null` for averageRating means "do not update this field".
   */
  async setStats(
    storeId: string,
    totalProducts: number,
    itemsSold: number,
    totalReviews: number,
    averageRating: number | null,
  ): Promise<void> {
    if (!storeId) return;
    const data: FirestoreDocument = {
      "stats.totalProducts": totalProducts,
      "stats.itemsSold": itemsSold,
      "stats.totalReviews": totalReviews,
      updatedAt: new Date(),
    };
    if (averageRating !== null) {
      data["stats.averageRating"] = averageRating;
    }
    await this.db.collection(this.collection).doc(storeId).update(data);
  }

  /**
   * Cloud Functions: update review aggregate stats on a store.
   */
  async updateReviewStats(
    storeId: string,
    totalReviews: number,
    averageRating: number,
  ): Promise<void> {
    if (!storeId) return;
    await this.db.collection(this.collection).doc(storeId).update({
      "stats.totalReviews": totalReviews,
      "stats.averageRating": averageRating,
      updatedAt: new Date(),
    });
  }

  /**
   * Cloud Functions: return IDs of all stores (lightweight ID-only scan).
   */
  async listIds(): Promise<string[]> {
    const snap = await this.db.collection(this.collection).select().get();
    return snap.docs.map((d) => d.id);
  }

  /**
   * Check whether a slug is available (not taken by any existing store).
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.findById(slug);
    return existing === null;
  }

  /**
   * Atomically migrate a store to a new slug (new document ID).
   * Creates a new doc with the new slug, copies all data, then deletes the old doc.
   * Throws if newSlug is already taken.
   */
  async changeSlug(currentSlug: string, newSlug: string): Promise<StoreDocument> {
    if (currentSlug === newSlug) throw new DatabaseError("New slug must differ from current slug");
    if (newSlug === "" || !/^[a-z0-9-]+$/.test(newSlug)) {
      throw new DatabaseError("Slug may only contain lowercase letters, numbers, and hyphens");
    }

    const existing = await this.findById(currentSlug);
    if (!existing) throw new DatabaseError(`Store "${currentSlug}" not found`);

    const available = await this.isSlugAvailable(newSlug);
    if (!available) throw new DatabaseError(`Slug "${newSlug}" is already taken`);

     
    const { id: _id, ...data } = existing;
    const newDoc: Omit<StoreDocument, "id"> = {
      ...data,
      storeSlug: newSlug,
      updatedAt: new Date(),
    };

    const batch = this.db.batch();
    const newRef = this.db.collection(this.collection).doc(newSlug);
    const oldRef = this.db.collection(this.collection).doc(currentSlug);
    batch.create(newRef, prepareForFirestore(this.encryptSecrets(newDoc)));
    batch.delete(oldRef);
    await batch.commit();

    return { id: newSlug, ...newDoc };
  }
}

export const storeRepository = new StoreRepository();
