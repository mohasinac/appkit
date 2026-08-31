import { FieldValue } from "firebase-admin/firestore";
import { BaseRepository } from "../../../providers/db-firebase";
import { PAGE_VIEW_ENTITY_TYPES, type PageViewEntityType } from "../types";
import { PAGE_VIEW_FIELDS } from "../../../constants/field-names";

export { PAGE_VIEW_ENTITY_TYPES };
export type { PageViewEntityType };

export interface PageViewDocument {
  /** `{date}_{entityType}_{entityId}` — one doc per entity per day. */
  id: string;
  /** YYYY-MM-DD, server date at record time. */
  date: string;
  entityType: PageViewEntityType;
  entityId: string;
  /** Raw pathname (e.g. "/products/product-charizard-psa9") — always recorded
   * alongside the entity breakdown so the admin report can also group by URL. */
  url: string;
  count: number;
  updatedAt: Date;
}

export interface RecordPageViewInput {
  entityType: PageViewEntityType;
  entityId: string;
  url: string;
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function docId(date: string, entityType: PageViewEntityType, entityId: string): string {
  return `${date}_${entityType}_${entityId}`;
}

export class PageViewsRepository extends BaseRepository<PageViewDocument> {
  constructor() {
    super("pageViews");
  }

  /** Fire-and-forget increment — one write per view, day-bucketed so the
   * admin report can filter by date range without storing per-event rows. */
  async recordView({ entityType, entityId, url }: RecordPageViewInput): Promise<void> {
    const date = todayDateKey();
    const id = docId(date, entityType, entityId);
    await this.getCollection().doc(id).set(
      {
        date,
        entityType,
        entityId,
        url,
        count: FieldValue.increment(1),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  }

  /** All day-buckets in [startDate, endDate] (inclusive, YYYY-MM-DD), optionally
   * scoped to one entityType. Used by the admin page-views report tab. */
  async listInRange(
    startDate: string,
    endDate: string,
    entityType?: PageViewEntityType,
  ): Promise<PageViewDocument[]> {
    let query = this.getCollection()
      .where(PAGE_VIEW_FIELDS.DATE, ">=", startDate)
      .where(PAGE_VIEW_FIELDS.DATE, "<=", endDate) as FirebaseFirestore.Query;
    if (entityType) {
      query = query.where(PAGE_VIEW_FIELDS.ENTITY_TYPE, "==", entityType);
    }
    const snap = await query.get();
    return snap.docs.map((d) => this.mapDoc<PageViewDocument>(d));
  }

  /**
   * Day-buckets older than `days`, as refs for `batchDelete`.
   *
   * 🛑 This collection had NO prune and NO rollup until 2026-08-31. It writes
   * one document per entity per day, forever, and 27 scheduled functions
   * existed without one of them touching it — so its growth was bounded only by
   * how many distinct pages the catalogue had times how long the site had been
   * up. See `pageViewPrune`.
   *
   * Returns refs rather than documents, matching `getOldReadRefs` on
   * notifications: a prune needs the id, and hydrating the body of every doc it
   * is about to delete is read budget spent on nothing (Rule #6).
   */
  async getOlderThanRefs(days: number): Promise<FirebaseFirestore.DocumentReference[]> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    // `<` and not `<=`: the cutoff day itself is still inside the window.
    const snap = await this.getCollection()
      .where(PAGE_VIEW_FIELDS.DATE, "<", cutoffKey)
      .select()
      .get();
    return snap.docs.map((d) => d.ref);
  }
}

export const pageViewsRepository = new PageViewsRepository();
