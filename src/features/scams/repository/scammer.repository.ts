import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { increment } from "../../../contracts/field-ops";
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
    id:            { canFilter: true,  canSort: false },
    status:        { canFilter: true,  canSort: true  },
    scamType:      { canFilter: true,  canSort: true  },
    scamPlatform:  { canFilter: true,  canSort: true  },
    reportedBy:    { canFilter: true,  canSort: false },
    verifiedBy:    { canFilter: true,  canSort: false },
    isContested:   { canFilter: true,  canSort: false },
    views:         { canFilter: false, canSort: true  },
    incidentCount: { canFilter: false, canSort: true  },
    createdAt:     { canFilter: true,  canSort: true  },
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

  async listAll(model: SieveModel): Promise<FirebaseSieveResult<ScammerDocument>> {
    return this.sieveQuery<ScammerDocument>(model, ScammerRepository.SIEVE_FIELDS, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
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
      throw new DatabaseError(`Failed to find scammer by seoSlug: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async create(input: ScammerCreateInput): Promise<ScammerDocument> {
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
      throw new DatabaseError(`Failed to create scammer profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async adminUpdate(id: string, input: ScammerAdminUpdateInput): Promise<void> {
    try {
      const data = prepareForFirestore({ ...input, updatedAt: new Date() });
      await this.getCollection().doc(id).update(data);
    } catch (error) {
      throw new DatabaseError(`Failed to update scammer profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async incrementViews(id: string): Promise<void> {
    try {
      await this.getCollection()
        .doc(id)
        .update({ [SCAMMER_FIELDS.VIEWS]: increment(1) });
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      return [];
    }
  }
}

const scammerRepository = new ScammerRepository();

export { ScammerRepository, scammerRepository };
