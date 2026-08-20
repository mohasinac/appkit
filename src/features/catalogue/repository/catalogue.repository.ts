/**
 * Personal Catalogue Repository (Feature B).
 */

import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  CATALOGUE_COLLECTION,
  CATALOGUE_FIELDS,
  createCatalogueItemId,
  type CatalogueItemDocument,
  type CatalogueItemCreateInput,
  type CatalogueItemUpdateInput,
} from "../schemas/firestore";

export class CatalogueRepository extends BaseRepository<CatalogueItemDocument> {
  constructor() {
    super(CATALOGUE_COLLECTION);
  }

  override async create(input: CatalogueItemCreateInput): Promise<CatalogueItemDocument> {
    const id = createCatalogueItemId({ ownerSlug: input.ownerId, title: input.title });
    const now = new Date();
    const data: Omit<CatalogueItemDocument, "id"> = {
      ...input,
      listingStatus: "not_listed",
      lastImageUpdateAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.getCollection().doc(id).set(prepareForFirestore(data));
    return { id, ...data };
  }

  /** Stamps lastImageUpdateAt whenever `images` changes — the single field the freshness gate checks. */
  override async update(itemId: string, input: CatalogueItemUpdateInput): Promise<CatalogueItemDocument> {
    const patch: CatalogueItemUpdateInput = { ...input };
    if (input.images !== undefined) {
      patch.lastImageUpdateAt = new Date();
    }
    return super.update(itemId, patch as Partial<CatalogueItemDocument>);
  }

  async listPublicByOwner(ownerId: string): Promise<CatalogueItemDocument[]> {
    const snap = await this.getCollection()
      .where(CATALOGUE_FIELDS.OWNER_ID, "==", ownerId)
      .where(CATALOGUE_FIELDS.VISIBILITY, "==", "public")
      .orderBy(CATALOGUE_FIELDS.CREATED_AT, "desc")
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  async listByOwner(ownerId: string): Promise<CatalogueItemDocument[]> {
    const snap = await this.getCollection()
      .where(CATALOGUE_FIELDS.OWNER_ID, "==", ownerId)
      .orderBy(CATALOGUE_FIELDS.CREATED_AT, "desc")
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  async listPendingApproval(model: SieveModel): Promise<FirebaseSieveResult<CatalogueItemDocument>> {
    return this.sieveQuery<CatalogueItemDocument>(model, CatalogueRepository.SIEVE_FIELDS, {
      defaultPageSize: 25,
      maxPageSize: 100,
    });
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    ownerId: { canFilter: true, canSort: false },
    visibility: { canFilter: true, canSort: false },
    listingStatus: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  /** Bounded scan for the staleness-reminder Function — images older than N days, not yet reminded for this update. */
  async listStale(olderThanDate: Date, limit = 200): Promise<CatalogueItemDocument[]> {
    const snap = await this.getCollection()
      .where(CATALOGUE_FIELDS.LAST_IMAGE_UPDATE_AT, "<", olderThanDate)
      .limit(limit)
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }
}

export const catalogueRepository = new CatalogueRepository();
