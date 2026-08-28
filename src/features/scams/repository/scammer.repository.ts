import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
import { increment } from "../../../contracts/field-ops";
import { withHistory, type HistoryActor } from "../../../_internal/shared/history/index";
import { SCAMMER_TRACKED_FIELDS, SCAMMER_HISTORY_PII_FIELDS } from "../schemas/firestore";
import type { FirestoreDocument, JsonValue } from "../../../schemas/types";
import { buildScammerSearchTxt } from "../../../utils/search-txt-builders";
import {
  planSearchTxt,
  refineSearchTxt,
  emptySearchResult,
} from "../../../utils/search-txt-query";

/** Who/why for a scammer write that lands in `statusHistory`. */
export interface ScammerWriteContext {
  actor?: HistoryActor;
  trigger?: string;
  reason?: string;
  note?: string;
}
import {
  SCAMMER_COLLECTION,
  SCAMMER_FIELDS,
  SCAMMER_INCIDENTS_SUBCOLLECTION,
  SCAMMER_COMMENTS_SUBCOLLECTION,
  DEFAULT_SCAMMER_DATA,
  type ScammerDocument,
  type ScammerIncidentDocument,
  type ScammerCommentDocument,
  type ScammerCreateInput,
  type ScammerAdminUpdateInput,
  type ScammerStatus,
} from "../schemas/firestore";

class ScammerRepository extends BaseRepository<ScammerDocument> {
  constructor() {
    super(SCAMMER_COLLECTION);
  }

  static readonly SIEVE_FIELDS = {
    searchTxt:     { canFilter: true,  canSort: false },
    id:            { canFilter: true,  canSort: false },
    status:        { canFilter: true,  canSort: true  },
    scamType:      { canFilter: true,  canSort: true  },
    scamPlatform:  { canFilter: true,  canSort: true  },
    reportedBy:    { canFilter: true,  canSort: false },
    verifiedBy:    { canFilter: true,  canSort: false },
    isContested:   { canFilter: true,  canSort: false },
    views:         { canFilter: false, canSort: true  },
    incidentCount: { canFilter: false, canSort: true  },
    createdAt:     { canFilter: true,  canSort: true, parseValue: parseSieveDateValue },
    updatedAt:     { canFilter: false, canSort: true  },
  };

  async listVerified(model: SieveModel): Promise<FirebaseSieveResult<ScammerDocument>> {
    const baseQuery = this.getCollection().where(
      SCAMMER_FIELDS.STATUS,
      "==",
      "verified" as ScammerStatus,
    );
    return this.sieveQuery<ScammerDocument>(model, ScammerRepository.SIEVE_FIELDS, {
      baseQuery,
      defaultPageSize: 20,
      maxPageSize: 50,
    });
  }

  /** Derived on every write path via `applyWriteHooks`. */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    return buildScammerSearchTxt(data as Partial<ScammerDocument>);
  }

  async listAll(
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<ScammerDocument>> {
    const plan = planSearchTxt(opts?.search);
    // A search that narrowed to no usable term must return NOTHING, not the
    // entire scam registry.
    if (plan.empty) return emptySearchResult<ScammerDocument>();

    let baseQuery = this.getCollection();
    if (plan.head) {
      baseQuery = baseQuery.where(
        SCAMMER_FIELDS.SEARCH_TXT,
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    const result = await this.sieveQuery<ScammerDocument>(model, ScammerRepository.SIEVE_FIELDS, {
      baseQuery,
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    return refineSearchTxt(result, plan.rest);
  }

  async findBySeoSlug(seoSlug: string): Promise<ScammerDocument | null> {
    try {
      const snap = await this.getCollection()
        .where(SCAMMER_FIELDS.SEO_SLUG, "==", seoSlug)
        .limit(1)
        .get();
      if (snap.empty) return null;
      return this.mapDoc<ScammerDocument>(snap.docs[0]);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find scammer by seoSlug: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  override async create(input: ScammerCreateInput): Promise<ScammerDocument> {
    try {
      const now = new Date();
      const id = input.displayNames[0]
        ? `scammer-${input.displayNames[0].toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40)}-${Date.now().toString(36)}`
        : `scammer-${Date.now().toString(36)}`;

      const data = prepareForFirestore({
        ...DEFAULT_SCAMMER_DATA,
        ...input,
        id,
        seoSlug: id,
        relatedScammerIds: [],
        mergedFromIds: [],
        tags: [],
        views: 0,
        incidentCount: 0,
        commentCount: 0,
        contestCount: 0,
        isContested: false,
        status: "pending_review" as ScammerStatus,
        createdAt: now,
        updatedAt: now,
      });

      await this.getCollection().doc(id).set(data);
      return { ...data, id } as ScammerDocument;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to create scammer profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * The single admin write path for a scammer profile.
   *
   * The PATCH route used to call `update()` directly, bypassing this method
   * entirely — so a decision on a public accusation against a named person
   * left no record beyond `verifiedBy`/`verifiedAt`, which the NEXT decision
   * overwrites. `prior` comes from the route's own 404 lookup, so the
   * timeline entry costs no second read (Rule #6).
   */
  async adminUpdate(
    id: string,
    input: ScammerAdminUpdateInput,
    ctx?: ScammerWriteContext,
    prior?: ScammerDocument | null,
  ): Promise<void> {
    try {
      const current = prior !== undefined ? prior : await this.findById(id);
      const withEntry = withHistory(
        current as unknown as FirestoreDocument | undefined,
        { ...input, updatedAt: new Date() } as unknown as FirestoreDocument,
        {
          tracked: SCAMMER_TRACKED_FIELDS,
          actor: ctx?.actor ?? { role: "system" },
          trigger: ctx?.trigger ?? "adminUpdateScammer",
          reason: ctx?.reason,
          note: ctx?.note,
          // A scammer profile is built entirely from identifying details, and
          // `encryptPiiFields` never descends into arrays.
          piiFields: SCAMMER_HISTORY_PII_FIELDS,
        },
      );
      const data = prepareForFirestore(
        (withEntry as Record<string, unknown> | null) ?? { ...input, updatedAt: new Date() },
      );
      await this.getCollection().doc(id).update(data);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to update scammer profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async incrementViews(id: string): Promise<void> {
    try {
      await this.getCollection()
        .doc(id)
        .update({ [SCAMMER_FIELDS.VIEWS]: increment(1) });
    } catch (_err) {
      void normalizeError(_err);
      // Fire-and-forget by design.
    }
  }

  /**
   * Search for profiles whose phones, upiIds, emails, or displayNames arrays
   * contain any of the given values. Used for duplicate detection on new reports.
   */
  async findByContactField(
    field: "phones" | "upiIds" | "emails" | "displayNames",
    value: string,
  ): Promise<ScammerDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(field, "array-contains", value)
        .limit(5)
        .get();
      return snap.docs.map((d) => this.mapDoc<ScammerDocument>(d));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to search scammer by ${field}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listPublicIncidents(scammerId: string): Promise<ScammerIncidentDocument[]> {
    try {
      const snap = await this.db
        .collection(SCAMMER_COLLECTION)
        .doc(scammerId)
        .collection(SCAMMER_INCIDENTS_SUBCOLLECTION)
        .where(SCAMMER_FIELDS.STATUS, "==", "verified" as ScammerStatus)
        .orderBy(SCAMMER_FIELDS.CREATED_AT, "desc")
        .limit(20)
        .get();
      return snap.docs.map((d) => this.mapDoc<ScammerIncidentDocument>(d));
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("scammer-repo: listPublicIncidents failed — returning empty", { scammerId, error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  async listPublicComments(scammerId: string): Promise<ScammerCommentDocument[]> {
    try {
      const snap = await this.db
        .collection(SCAMMER_COLLECTION)
        .doc(scammerId)
        .collection(SCAMMER_COMMENTS_SUBCOLLECTION)
        .where("isHidden", "==", false)
        .orderBy(SCAMMER_FIELDS.CREATED_AT, "desc")
        .limit(30)
        .get();
      return snap.docs.map((d) => this.mapDoc<ScammerCommentDocument>(d));
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("scammer-repo: listPublicComments failed — returning empty", { scammerId, error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  /**
   * Other verified profiles with the same scamType — a "similar scam pattern"
   * discovery signal, distinct from `relatedScammerIds` (which links profiles
   * confirmed to be the same person). Never implies identity, only pattern similarity.
   */
  async findBySameType(scamType: string, excludeId: string, limit = 5): Promise<ScammerDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(SCAMMER_FIELDS.STATUS, "==", "verified")
        .where(SCAMMER_FIELDS.SCAM_TYPE, "==", scamType)
        .orderBy(SCAMMER_FIELDS.CREATED_AT, "desc")
        .limit(limit + 1)
        .get();
      return snap.docs
        .map((d) => this.mapDoc<ScammerDocument>(d))
        .filter((s) => s.id !== excludeId)
        .slice(0, limit);
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("scammer-repo: findBySameType failed — returning empty", { scamType, error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  async findManyById(ids: string[]): Promise<ScammerDocument[]> {
    if (!ids.length) return [];
    try {
      const results = await Promise.all(
        ids.slice(0, 5).map((id) => this.findById(id).catch(() => null)),
      );
      return results.filter((d): d is ScammerDocument => d !== null && d.status === "verified");
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("scammer-repo: findManyById failed — returning empty", { ids, error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }
}

const scammerRepository = new ScammerRepository();

export { ScammerRepository, scammerRepository };
