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
  CATALOGUE_TRACKED_FIELDS,
  CATALOGUE_HISTORY_PII_FIELDS,
  createCatalogueItemId,
  type CatalogueItemDocument,
  type CatalogueItemCreateInput,
  type CatalogueItemUpdateInput,
} from "../schemas/firestore";
import { withHistory, type HistoryActor } from "../../../_internal/shared/history/index";
import type { FirestoreDocument } from "../../../schemas/types";

/** Who/why for a catalogue write that lands in `statusHistory`. */
export interface CatalogueWriteContext {
  actor?: HistoryActor;
  trigger?: string;
  reason?: string;
  note?: string;
}

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

  /**
   * The approval-workflow write path — the funnel this repository did not have.
   *
   * `listingStatus` was moved by FIVE scattered `update()` calls across four
   * action files and a scheduled job, none of which recorded who did it or
   * why. `rejectionReason` was the only trace an admin decision left, and the
   * next decision overwrites it.
   *
   * Every caller already holds the item (each does its own `findById` to
   * authorise the transition), so `prior` makes the timeline entry free.
   * Deliberately NOT a `BaseRepository` hook: `update()` does not read before
   * writing, so a generic hook would force a pre-read on every update of
   * every collection (Rule #6), and it carries neither actor nor trigger.
   */
  async setListingStatus(
    itemId: string,
    patch: CatalogueItemUpdateInput,
    ctx?: CatalogueWriteContext,
    prior?: CatalogueItemDocument | null,
  ): Promise<CatalogueItemDocument> {
    const current = prior !== undefined ? prior : await this.findById(itemId);
    const withEntry = withHistory(
      current as unknown as FirestoreDocument | undefined,
      patch as unknown as FirestoreDocument,
      {
        tracked: CATALOGUE_TRACKED_FIELDS,
        actor: ctx?.actor ?? { role: "system" },
        trigger: ctx?.trigger ?? "setListingStatus",
        reason: ctx?.reason,
        note: ctx?.note,
        piiFields: CATALOGUE_HISTORY_PII_FIELDS,
      },
    );
    return this.update(itemId, (withEntry as CatalogueItemUpdateInput | null) ?? patch);
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
