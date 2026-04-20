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
  type FirebaseSieveFields,
  type FirebaseSieveOptions,
  type FirebaseSieveResult,
  type SieveModel,
} from "./sieve";
import { deserializeTimestamps, prepareForFirestore } from "./helpers";
import { getAdminDb } from "./admin";

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

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return this.mapDoc(doc);
    } catch (error) {
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
      throw new DatabaseError("Failed to fetch all documents", error);
    }
  }

  async create(data: Partial<T> | Record<string, unknown>): Promise<T> {
    try {
      const cleanData = prepareForFirestore({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const docRef = await this.getCollection().add(cleanData);
      const doc = await docRef.get();
      return this.mapDoc(doc);
    } catch (error) {
      throw new DatabaseError("Failed to create document", error);
    }
  }

  async createWithId(id: string, data: Partial<T>): Promise<T> {
    try {
      const now = new Date();
      const cleanData = prepareForFirestore({
        ...data,
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
        ...data,
        updatedAt: new Date(),
      });

      await this.getCollection().doc(id).update(cleanData);

      return this.findByIdOrFail(id);
    } catch (error) {
      throw new DatabaseError(`Failed to update document: ${id}`, error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().doc(id).delete();
    } catch (error) {
      throw new DatabaseError(`Failed to delete document: ${id}`, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check document existence: ${id}`,
        error,
      );
    }
  }

  async count(): Promise<number> {
    try {
      const snapshot = await this.getCollection().get();
      return snapshot.size;
    } catch (error) {
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
    });
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
    data: Partial<T> | Record<string, unknown>,
  ): DocumentReference {
    const docRef = this.getCollection().doc();
    const now = new Date();
    tx.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as FirebaseFirestore.WithFieldValue<DocumentData>,
    );
    return docRef as DocumentReference;
  }

  createWithIdInTx(
    tx: Transaction,
    id: string,
    data: Partial<T> | Record<string, unknown>,
  ): DocumentReference {
    const docRef = this.getCollection().doc(id);
    const now = new Date();
    tx.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as FirebaseFirestore.WithFieldValue<DocumentData>,
    );
    return docRef as DocumentReference;
  }

  updateInTx(tx: Transaction, id: string, data: Partial<T>): void {
    const docRef = this.getCollection().doc(id);
    tx.update(
      docRef,
      prepareForFirestore({ ...data, updatedAt: new Date() }) as DocumentData,
    );
  }

  deleteInTx(tx: Transaction, id: string): void {
    const docRef = this.getCollection().doc(id);
    tx.delete(docRef);
  }

  createInBatch(
    batch: WriteBatch,
    data: Partial<T> | Record<string, unknown>,
  ): DocumentReference {
    const docRef = this.getCollection().doc();
    const now = new Date();
    batch.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as FirebaseFirestore.WithFieldValue<DocumentData>,
    );
    return docRef as DocumentReference;
  }

  createWithIdInBatch(
    batch: WriteBatch,
    id: string,
    data: Partial<T> | Record<string, unknown>,
  ): void {
    const docRef = this.getCollection().doc(id);
    const now = new Date();
    batch.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...data,
        createdAt: now,
        updatedAt: now,
      }) as FirebaseFirestore.WithFieldValue<DocumentData>,
    );
  }

  updateInBatch(batch: WriteBatch, id: string, data: Partial<T>): void {
    const docRef = this.getCollection().doc(id);
    batch.update(
      docRef,
      prepareForFirestore({ ...data, updatedAt: new Date() }) as DocumentData,
    );
  }

  deleteInBatch(batch: WriteBatch, id: string): void {
    const docRef = this.getCollection().doc(id);
    batch.delete(docRef);
  }
}
