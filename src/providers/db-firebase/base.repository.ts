import { normalizeError } from "../../errors/normalize";
import type { FirestoreDocument } from "@mohasinac/appkit";
import type {
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  Transaction,
  WriteBatch,
} from "firebase-admin/firestore";
import { DatabaseError, NotFoundError } from "../../errors";
import { serverLogger } from "../../monitoring";
import {
  applySieveToFirestore,
  countSieveMatches,
  type FirebaseSieveFields,
  type FirebaseSieveOptions,
  type FirebaseSieveResult,
  type SieveModel,
} from "./sieve";
import { deserializeTimestamps, prepareForFirestore } from "./helpers";
import { getAdminDb } from "./admin";
import { encryptPiiFields, piiIndicesFor } from "../../security/pii-encrypt";
import type { JsonValue } from "../../schemas/types";

export abstract class BaseRepository<T extends DocumentData> {
  protected collection: string;

  constructor(collectionName: string) {
    this.collection = collectionName;
  }

  protected get db(): Firestore {
    return getAdminDb();
  }

  protected getCollection() {
    return this.db.collection(this.collection);
  }

  protected mapDoc<D = T>(snap: DocumentSnapshot): D {
    return deserializeTimestamps({
      id: snap.id,
      ...(snap.data() ?? {}),
    }) as unknown as D;
  }

  /**
   * How a row is mapped on a LIST read (anything through `sieveQuery`).
   *
   * Defaults to `mapDoc`, so a repository that overrides `mapDoc` to decrypt,
   * project or normalise now gets that on list reads too — Sieve used to map
   * documents itself and never call `mapDoc` at all, which is why
   * `/api/admin/users` served ciphertext emails.
   *
   * It is a SEPARATE hook because a list is not a detail read. A repository
   * whose `mapDoc` decrypts a secret must not hand that secret to a list —
   * `StoreRepository` overrides this to drop the WhatsApp token, since
   * `listStores(activeOnly)` backs the PUBLIC /stores page.
   */
  protected mapDocForList<D = T>(snap: DocumentSnapshot): D {
    return this.mapDoc<D>(snap);
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return this.mapDoc(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find document by ID: ${id}`, error);
    }
  }

  async findByIdOrFail(id: string): Promise<T> {
    const doc = await this.findById(id);

    if (!doc) {
      throw new NotFoundError(`Document not found: ${id}`);
    }

    return doc;
  }

  async findBy(field: string, value: unknown): Promise<T[]> {
    try {
      const snapshot = await this.getCollection()
        .where(field, "==", value)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find documents by ${field}`, error);
    }
  }

  async findOneBy(field: string, value: unknown): Promise<T | null> {
    try {
      const snapshot = await this.getCollection()
        .where(field, "==", value)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.mapDoc(snapshot.docs[0]);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find document by ${field}`, error);
    }
  }

  async findAll(limit?: number): Promise<T[]> {
    try {
      let query = this.getCollection();

      if (limit) {
        query = query.limit(limit) as typeof query;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => this.mapDoc(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to fetch all documents", error);
    }
  }

  /**
   * PII fields for this collection, encrypted on every write path below.
   *
   * Declare it in the subclass instead of overriding `create`/`update` by hand.
   * There were no encryption hooks here at all, so encryption was opt-in per
   * method per repository — which meant `createWithId`, `update`, and the whole
   * `*InTx` / `*InBatch` family were silent bypasses in any repo that had only
   * overridden `create`. `sessions.deviceInfo.ip` sat in plaintext for exactly
   * that reason.
   */
  protected piiFields: readonly string[] = [];

  /** Blind-index map (plaintext field → index field) for equality lookups. */
  protected piiIndexMap: Record<string, string> = {};

  /**
   * Build this document's `searchTxt` tokens. Return `null` to leave the field
   * alone (the default), so a collection opts in by overriding this.
   *
   * MUST NOT include PII: `searchTxt` stores readable fragments of the source
   * text, so indexing an encrypted field would undo the encryption.
   */
  protected buildSearchTxtFor(_data: Record<string, JsonValue>): string[] | null {
    return null;
  }

  /**
   * The one place writes are transformed. Every write path routes through here
   * so a new method cannot silently skip encryption.
   *
   * `encryptPiiFields` is idempotent (it skips anything already carrying the
   * `enc:v1:` prefix), so a subclass that still encrypts by hand before calling
   * super is harmless rather than double-encrypted.
   */
  protected applyWriteHooks<D extends object>(data: D): D {
    let out: D = data;

    if (this.piiFields.length > 0) {
      out = {
        ...encryptPiiFields(out, [...this.piiFields]),
        // Indices are derived from the PLAINTEXT source and must not carry it
        // along — see piiIndicesFor's docstring for the bug that caused.
        ...piiIndicesFor(data, this.piiIndexMap),
      } as D;
    }

    const searchTxt = this.buildSearchTxtFor(out as Record<string, JsonValue>);
    if (searchTxt) (out as Record<string, JsonValue>).searchTxt = searchTxt;

    return out;
  }

  async create(data: Partial<T> | FirestoreDocument): Promise<T> {
    try {
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const docRef = await this.getCollection().add(cleanData);
      const doc = await docRef.get();
      return this.mapDoc(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to create document", error);
    }
  }

  async createWithId(id: string, data: Partial<T>): Promise<T> {
    try {
      const now = new Date();
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      });

      serverLogger.debug(
        `Creating document with ID: ${id} in collection: ${this.collection}`,
      );

      await this.getCollection().doc(id).set(cleanData);

      serverLogger.info(`Document created successfully: ${id}`);

      const doc = await this.getCollection().doc(id).get();
      return this.mapDoc(doc);
    } catch (error: any) {
      void normalizeError(error);
      serverLogger.error(`Failed to create document with ID: ${id}`, {
        collection: this.collection,
        error: error.message,
        code: error.code,
      });
      throw new DatabaseError(
        `Failed to create document with ID: ${id}`,
        error,
      );
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        updatedAt: new Date(),
      });

      await this.getCollection().doc(id).update(cleanData);

      return this.findByIdOrFail(id);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to update document: ${id}`, error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().doc(id).delete();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to delete document: ${id}`, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to check document existence: ${id}`,
        error,
      );
    }
  }

  /**
   * Server-side aggregation — never a full read.
   *
   * This used to be `getCollection().get()` then `.size`, which downloads every
   * document in the collection to learn how many there are. On `products` or
   * `orders` that is the entire collection billed as reads, and the payload is
   * discarded immediately. Straight Rule #6 violation, and it scales with the
   * data rather than staying flat.
   *
   * `count()` is a Firestore aggregation query: the server returns a number,
   * billed at one read per 1000 documents matched rather than one per document.
   */
  async count(): Promise<number> {
    try {
      const snapshot = await this.getCollection().count().get();
      return snapshot.data().count;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to count documents", error);
    }
  }

  protected async sieveQuery<TResult extends DocumentData = T>(
    model: SieveModel,
    fields: FirebaseSieveFields,
    options?: FirebaseSieveOptions & {
      baseQuery?: CollectionReference | Query;
    },
  ): Promise<FirebaseSieveResult<TResult>> {
    const { baseQuery, ...sieveOptions } = options ?? {};
    return applySieveToFirestore<TResult>({
      baseQuery: baseQuery ?? this.getCollection(),
      model,
      fields,
      options: sieveOptions,
      // Load-bearing. Without this every Sieve-backed read silently skips the
      // subclass's mapDoc — decryption, projection and normalisation all lost.
      // audit-repository-fields asserts this argument stays here, because one
      // edit removing it would unwire all 14 affected repositories at once
      // while the per-file rule still passed.
      mapDoc: (snap) => this.mapDocForList<TResult>(snap),
    });
  }

  /**
   * Count matches for a Sieve model without reading any documents.
   *
   * Prefer this over `sieveQuery({ pageSize: 1 }).total` whenever only the
   * number is wanted — that idiom pays for a wasted document read per call,
   * which matters once a surface issues one query per union member.
   */
  protected async sieveCount(
    model: SieveModel,
    fields: FirebaseSieveFields,
    options?: FirebaseSieveOptions & {
      baseQuery?: CollectionReference | Query;
    },
  ): Promise<number> {
    const { baseQuery, ...sieveOptions } = options ?? {};
    return countSieveMatches({
      baseQuery: baseQuery ?? this.getCollection(),
      model,
      fields,
      options: sieveOptions,
    });
  }

  /**
   * How many documents match each value of a discriminator field, given a
   * shared base filter — the "N rows of each type" behind every faceted tab
   * bar and filter chip group.
   *
   * One `.count()` aggregation per value, all in parallel. A value whose query
   * fails maps to `undefined`, NOT to 0: callers hide a facet at zero, and a
   * swallowed failure that reads as "none of these exist" would hide a facet
   * holding real rows (Root Cause #59). `undefined` means "unknown", and every
   * caller is expected to keep the facet visible in that case.
   *
   * `values` may contain a pipe-joined OR-group (`"art|stickers"`) — it is
   * passed through untouched so the enhanced adapter upgrades it to a
   * Firestore `in` query, exactly as it does on the list path.
   */
  protected async facetCounts(
    field: string,
    values: readonly string[],
    fields: FirebaseSieveFields,
    options?: FirebaseSieveOptions & {
      baseQuery?: CollectionReference | Query;
      /** Sieve clauses ANDed into every count (e.g. `status==published`). */
      baseFilters?: string;
    },
  ): Promise<Record<string, number | undefined>> {
    const { baseFilters, ...rest } = options ?? {};
    const entries = await Promise.all(
      values.map(async (value) => {
        // Sieve ANDs clauses with a comma; see utils/sieve-builder.ts.
        const filters = [baseFilters, `${field}==${value}`]
          .filter(Boolean)
          .join(",");
        try {
          return [value, await this.sieveCount({ filters }, fields, rest)] as const;
        } catch (error) {
          void normalizeError(error);
          serverLogger.warn(
            `facetCounts: count failed for ${this.collection}.${field}==${value}; facet will stay visible`,
          );
          return [value, undefined] as const;
        }
      }),
    );
    return Object.fromEntries(entries);
  }

  async findByIdInTx(tx: Transaction, id: string): Promise<T | null> {
    const docRef = this.getCollection().doc(id);
    const snap = await tx.get(docRef);
    if (!snap.exists) return null;
    return this.mapDoc(snap);
  }

  async findByIdOrFailInTx(tx: Transaction, id: string): Promise<T> {
    const doc = await this.findByIdInTx(tx, id);
    if (!doc) throw new NotFoundError(`Document not found: ${id}`);
    return doc;
  }

  createInTx(
    tx: Transaction,
    data: Partial<T> | FirestoreDocument,
  ): DocumentReference {
    const docRef = this.getCollection().doc();
    const now = new Date();
    tx.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
    return docRef as DocumentReference;
  }

  createWithIdInTx(
    tx: Transaction,
    id: string,
    data: Partial<T> | FirestoreDocument,
  ): DocumentReference {
    const docRef = this.getCollection().doc(id);
    const now = new Date();
    tx.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
    return docRef as DocumentReference;
  }

  updateInTx(tx: Transaction, id: string, data: Partial<T>): void {
    const docRef = this.getCollection().doc(id);
    tx.update(
      docRef,
      prepareForFirestore({ ...this.applyWriteHooks(data as object), updatedAt: new Date() }) as DocumentData,
    );
  }

  deleteInTx(tx: Transaction, id: string): void {
    const docRef = this.getCollection().doc(id);
    tx.delete(docRef);
  }

  createInBatch(
    batch: WriteBatch,
    data: Partial<T> | FirestoreDocument,
  ): DocumentReference {
    const docRef = this.getCollection().doc();
    const now = new Date();
    batch.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
    return docRef as DocumentReference;
  }

  createWithIdInBatch(
    batch: WriteBatch,
    id: string,
    data: Partial<T> | FirestoreDocument,
  ): void {
    const docRef = this.getCollection().doc(id);
    const now = new Date();
    batch.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
  }

  updateInBatch(batch: WriteBatch, id: string, data: Partial<T>): void {
    const docRef = this.getCollection().doc(id);
    batch.update(
      docRef,
      prepareForFirestore({ ...this.applyWriteHooks(data as object), updatedAt: new Date() }) as DocumentData,
    );
  }

  deleteInBatch(batch: WriteBatch, id: string): void {
    const docRef = this.getCollection().doc(id);
    batch.delete(docRef);
  }
}
